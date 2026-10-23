// node supabase/golden/run_goal_adjust.mjs   -> checks goalPlan() gain amount and weigh-in adjustment against goal_adjust.json
import { readFileSync } from 'node:fs';
import { goalPlan, effectiveGoal, weightLossKcal, growthTarget, targetBounds } from '../functions/calc/domain.js';

const { pet: base, cases } = JSON.parse(readFileSync(new URL('./goal_adjust.json', import.meta.url)));
const DAY = 86400000; const iso = (t) => new Date(t).toISOString().slice(0, 10); const now = Date.now();
let bad = 0;
for (const c of cases) {
  const g = c.goal; const w = c.nowKg ?? base.weightKg;
  const pet = { ...base, ...(c.pet || {}), name: 'Max', birth: iso(now - base.ageYears * 365.25 * DAY), health: [], activity: 'normal', weightKg: w };
  let goal = { type: g.type, targetKg: g.targetKg, days: g.days };
  if (g.startDaysAgo != null) {
    const startOn = iso(now - g.startDaysAgo * DAY); const targetDate = iso(now + (g.totalDays - g.startDaysAgo) * DAY);
    pet.goal = { type: g.type, targetKg: g.targetKg, startOn, startKg: g.startKg, targetDate, days: g.totalDays };
    pet.logs = [{ on: startOn, kg: g.startKg, bcs: pet.bcs }, { on: iso(now), kg: w, bcs: pet.bcs }];
    goal = effectiveGoal(pet);
  }
  const r = goalPlan(pet, goal);
  const pct = r.adjustment ? r.adjustment.pct : null;
  const ok = (c.kcal == null || r.kcal === c.kcal) && pct === (c.adjust ?? null) && (c.vetWarning == null || !!r.vetWarning === c.vetWarning);
  if (!ok) { bad++; console.log('FAIL', c.name, { kcal: r.kcal, pct, vet: !!r.vetWarning }); }
}
// Regression: a dog slimming with an unchanged body score must keep the same weight-loss kcal (the ideal weight must not shrink with every kilo).
{
  const mkLoss = (kg, logs) => ({ ...base, name: 'Max', bcs: 7, weightKg: kg, birth: iso(now - 4 * 365.25 * DAY), health: [], activity: 'normal', logs });
  const goal = null;
  void goal;
  const a = weightLossKcal(mkLoss(35, [{ on: iso(now - 70 * DAY), kg: 35, bcs: 7 }]), 40);
  const b = weightLossKcal(mkLoss(31.5, [{ on: iso(now - 70 * DAY), kg: 35, bcs: 7 }, { on: iso(now), kg: 31.5, bcs: 7 }]), 40);
  const c = weightLossKcal({ ...mkLoss(31.5, [{ on: iso(now - 70 * DAY), kg: 35, bcs: 7 }, { on: iso(now), kg: 31.5, bcs: 6 }]), bcs: 6 }, 40);
  cases.length += 1; if (Math.abs(a - b) > 1) { bad++; console.log('FAIL ideal weight drifts as the dog slims', a, b); }
  cases.length += 1; if (c === b) { bad++; console.log('FAIL a new body score should change the plan', b, c); }
}
// Growing pet (9 months, 20 kg, size V, 11th to 13th percentile): a typical goal is fine, +8.5 kg in 90 days is not allowed.
{
  const tiger = { species: 'dog', name: 'Tiger', weightKg: 20, bcs: 5, neutered: true, sizeCat: 'V', birth: iso(now - 9.7 * 30.44 * DAY) };
  cases.length += 1; if (growthTarget(tiger, 90, 21).pace.state !== 'good') { bad++; console.log('FAIL a typical growth target should be good'); }
  cases.length += 1; if (growthTarget(tiger, 90, 28.5).pace.state !== 'bad') { bad++; console.log('FAIL +8.5 kg in 90 days should be too fast'); }
  // Large-breed puppies are never fed above the standard amount for a faster goal; a small breed may go up at most 10%.
  const std = 2.0 * 70 * Math.pow(20, 0.75);
  cases.length += 1; if (goalPlan(tiger, { type: 'grow', custom: true, targetKg: 22, days: 90 }).kcal > Math.round(std)) { bad++; console.log('FAIL large-breed puppy calories raised above standard'); }
  const toy = { ...tiger, sizeCat: 'II', weightKg: 6 }; const stdToy = 2.0 * 70 * Math.pow(6, 0.75);
  cases.length += 1; if (goalPlan(toy, { type: 'grow', custom: true, targetKg: 7.2, days: 90 }).kcal > Math.round(stdToy * 1.1) + 1) { bad++; console.log('FAIL small-breed puppy calories raised over 10%'); }
  cases.length += 1; if (targetBounds(tiger, 90).hi >= 28.5) { bad++; console.log('FAIL the picker must not reach 28.5 kg', targetBounds(tiger, 90)); }
}
console.log(`${cases.length - bad}/${cases.length} goal adjustment cases pass`); process.exit(bad ? 1 : 0);
