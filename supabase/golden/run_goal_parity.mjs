// Parity check between goalPlan() in domain.js and public.goal_plan() in the database, over 300 generated adult scenarios.
//   node supabase/golden/run_goal_parity.mjs <outdir>   writes <outdir>/parity.sql and <outdir>/parity_expected.json
// Run parity.sql with psql (-t -A -F'|') against a database built from the migrations, then compare with check_goal_parity.py.
import { writeFileSync } from 'node:fs';
import { goalPlan, effectiveGoal } from '../../prototype/js/domain.js';

const out = process.argv[2]; if (!out) { console.error('give an output directory'); process.exit(2); }
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)]; const DAY = 86400000; const iso = (t) => new Date(t).toISOString().slice(0, 10); const now = Date.now();
const sql = []; const expected = [];
for (let n = 0; n < 300; n++) {
  const species = pick(['dog', 'dog', 'cat']); const bcs = pick([3, 4, 5, 5, 5, 6, 7, 8]); const type = pick(['maintain', 'lose', 'gain', 'gain', 'lose']);
  const startKg = species === 'dog' ? 5 + rnd() * 40 : 2.5 + rnd() * 5; const exerciseMin = pick([null, 5, 20, 45, 90, 150]);
  const saved = type !== 'maintain' && rnd() < 0.7;
  const totalDays = Math.round(30 + rnd() * 200); const startDaysAgo = saved ? Math.round(rnd() * Math.min(totalDays, 150)) : 0;
  const targetKg = Math.round((type === 'lose' ? startKg * (0.8 + rnd() * 0.15) : type === 'gain' ? startKg * (1.05 + rnd() * 0.2) : startKg) * 10) / 10;
  const frac = saved ? rnd() * 1.1 : 0; const weight = Math.round((saved ? startKg + (targetKg - startKg) * frac * (0.6 + rnd() * 0.8) : startKg) * 100) / 100;
  const logBcs = rnd() < 0.8 ? bcs : bcs - 1; const sizeCat = species === 'dog' ? pick(['I', 'IV', 'V', 'VI']) : null;
  const neutered = rnd() < 0.7; const birth = iso(now - (3 + Math.floor(rnd() * 8)) * 365.25 * DAY); const activity = exerciseMin == null ? pick(['low', 'normal', 'high']) : 'normal';
  const startOn = iso(now - startDaysAgo * DAY); const targetDate = iso(now + (totalDays - startDaysAgo) * DAY);
  const logs = saved ? [{ on: startOn, kg: Math.round(startKg * 100) / 100, bcs: logBcs }, { on: iso(now), kg: weight, bcs: logBcs }] : [{ on: iso(now), kg: weight, bcs: logBcs }];
  const pet = { species, name: 'x', weightKg: weight, bcs, neutered, exerciseMin: exerciseMin ?? undefined, activity, birth, sizeCat: sizeCat ?? undefined, logs, health: [] };
  let goal = { type, targetKg, days: totalDays };
  if (saved) { pet.goal = { type, targetKg, startOn, startKg: Math.round(startKg * 100) / 100, targetDate, days: totalDays }; goal = effectiveGoal(pet); }
  const r = goalPlan(pet, goal);
  expected.push({ n, kcal: r.kcal, adj: r.adjustment ? r.adjustment.pct : null, estDays: r.estDays ?? null, vet: !!r.vetWarning });
  const q = (v) => (v == null ? 'null' : typeof v === 'string' ? `'${v}'` : v);
  sql.push(`select ${n} as n, public.goal_plan(${q(species)}, ${weight}, ${bcs}, ${neutered}, ${q(exerciseMin)}, ${q(birth)}, ${q(sizeCat)}, ${q(activity)}, '${JSON.stringify(logs)}'::jsonb, ${q(type)}, ${targetKg}, ${saved ? Math.max(0, totalDays - startDaysAgo) : totalDays}, ${saved ? q(startOn) : 'null'}, ${saved ? Math.round(startKg * 100) / 100 : 'null'}, ${saved ? q(targetDate) : 'null'}) as r;`);
}
writeFileSync(`${out}/parity.sql`, sql.join('\n') + '\n'); writeFileSync(`${out}/parity_expected.json`, JSON.stringify(expected));
console.log(`wrote ${expected.length} scenarios`);
