// FIND FOOD: ranking, scoring and the numbers behind every food, treat and supplement card, over the catalogue.
// Pure given the catalogue. The web app and the Flutter app both ask for this through the `calc` function, so a food ranks the same everywhere.
import {
  energyPlan, nutrientTargets, foodFit, foodUnitKcal, per1000, costPerDay, gramsPerDay, allergenHits, brandGuide, goalMatch, goalPlan, goalsFor, goalProgress,
  effectiveGoal, lifeStage, rer, weightLossKcal, suggestDays, ageInMonths, treatPlan, treatFit, supplementFits, supplementDose, ingredientWarnings, estimateKcal, GOALS, TOXIC_TERMS,
} from './domain.js';
import { DOG_BREEDS } from './reference.js';

const ORDER = { good: 0, caution: 1, bad: 2 };
const round1 = (v) => Math.round(v * 10) / 10;

// ---- one pet's context -------------------------------------------------------------------------
// The calories a goal feeds: the owner's own number (never below the safe level for weight loss), else the goal plan's.
export const kcalFor = (pet, goal) => (goal?.kcalOverride != null
  ? Math.max(goal.kcalOverride, goal.type === 'lose' ? Math.round(weightLossKcal(pet, goal.targetKg)) : 0)
  : goalPlan(pet, goal).kcal);

const ctxFor = (pet, goal) => {
  if (!pet) return { pet: null, plan: null, targets: null, goalKcal: null };
  const plan = energyPlan(pet);
  return { pet, plan, targets: nutrientTargets(pet), goalKcal: goal ? kcalFor(pet, goal) : null };
};

// Calories are limited to a sensible range: at least 60% of resting energy, at most 2.5x (3x while growing); a weight-loss goal never goes below its safe level.
const kcalBounds = (pet, goal) => { const safe = goal?.type === 'lose' ? Math.round(weightLossKcal(pet, goal.targetKg)) : 0; return { lo: Math.max(safe, Math.round(0.6 * rer(pet.weightKg))), safe, hi: Math.round((lifeStage(pet) === 'growth' ? 3 : 2.5) * rer(pet.weightKg)) }; };

const defaultGoal = (pet, plan) => {
  if (lifeStage(pet) === 'growth') return { type: 'grow', targetKg: pet.weightKg, days: 60 };
  if (pet.species === 'dog' && pet.bcs >= 6) return { type: 'lose', targetKg: round1(plan.ideal), days: 90 };
  return { type: 'maintain', targetKg: pet.weightKg, days: 90 };
};
const targetFor = (type, pet, plan) => (type === 'lose' ? round1(pet.bcs >= 6 ? plan.ideal : pet.weightKg * 0.9) : type === 'gain' ? round1(pet.weightKg * 1.1) : pet.weightKg);

// The goal card: what to start from, the plan for the goal now chosen, the calories, and the breed note.
export function goalView(pet, goal) {
  if (!pet) return null;
  const plan = energyPlan(pet); const saved = pet.goal ? effectiveGoal(pet) : null;
  const options = goalsFor(pet).map((g) => g.id);
  const start = pet.goal && options.includes(pet.goal.type) ? { ...effectiveGoal(pet) } : defaultGoal(pet, plan);
  const g = goal || start;
  const gp = goalPlan(pet, g); const kcal = kcalFor(pet, g);
  const bb = pet.species === 'dog' && pet.breed ? DOG_BREEDS.find((x) => x.name === pet.breed) : null;
  const odd = bb && lifeStage(pet) === 'adult' && (g.type === 'lose' || g.type === 'gain') && (g.targetKg < bb.min * 0.9 || g.targetKg > bb.max * 1.1);
  return {
    plan, options, start, goal: g, gp, kcal, kcalBounds: kcalBounds(pet, g), suggestedKcal: gp.kcal,
    saved, progress: saved ? goalProgress(pet, saved) : null,
    targetFor: Object.fromEntries(['lose', 'gain', 'maintain', 'grow'].map((t) => [t, targetFor(t, pet, plan)])),
    targets: nutrientTargets(pet), suggestDays: suggestDays(pet, g.targetKg), preset: recommendedPreset(pet, g), needs: suggestedNeeds(pet),
    breedNote: odd ? { breed: pet.breed, min: bb.min, max: bb.max } : null,
  };
}

// ---- quick narrowing, special needs and priorities ---------------------------------------------
const QUICK = {
  dry: (f) => f.format === 'dry', wet: (f) => f.format === 'wet', kcal: (f) => f.kcalPerKg != null,
  budget: (f, c) => { const k = costPerDay(f, c.goalKcal || c.plan?.kcal || 1000); return k != null && k <= 2; },
};
const NEEDS = {
  joints: (f) => (f.extras || []).some((x) => ['glucosamine', 'chondroitin', 'mussel'].includes(x)),
  collagen: (f) => (f.extras || []).includes('collagen') || f.ingredients.some((i) => /collagen|bone broth/i.test(i)),
  omega3: (f) => (f.extras || []).includes('omega3') || f.ingredients.some((i) => /fish oil|salmon|tuna|flax|krill/i.test(i)),
  probiotics: (f) => (f.extras || []).includes('probiotics'),
  antioxidants: (f) => (f.extras || []).includes('antioxidants'),
};
// Needs worth suggesting for this pet (older, larger or heavier pets: joints; everyone: omega-3).
export const suggestedNeeds = (pet) => { if (!pet) return []; const ids = []; const yrs = ageInMonths(pet.birth) / 12; if (yrs >= 7 || pet.bcs >= 6 || ['IV', 'V'].includes(pet.sizeCat)) ids.push('joints'); ids.push('omega3'); return ids; };
const PRIORITIES = {
  cost: { lowerBetter: true, get: (f, c) => costPerDay(f, c.goalKcal || c.plan?.kcal || 1000), why: (f, c) => `Lower cost: about $${costPerDay(f, c.goalKcal || c.plan?.kcal || 1000).toFixed(2)} a day` },
  protein: { get: (f) => per1000(f.protein, f.kcalPerKg), why: (f) => `High protein: ${per1000(f.protein, f.kcalPerKg).toFixed(0)} g per 1000 kcal` },
  lean: { lowerBetter: true, get: (f) => per1000(f.fat, f.kcalPerKg), why: (f) => `Lean: ${per1000(f.fat, f.kcalPerKg).toFixed(0)} g fat per 1000 kcal` },
  fibre: { get: (f) => per1000(f.fibre, f.kcalPerKg), why: () => 'Fibre helps them feel full' },
  lighter: { lowerBetter: true, get: (f) => f.kcalPerKg, why: () => 'Fewer calories per gram, so bigger portions' },
  small: { get: (f) => f.kcalPerKg, why: () => 'Energy-dense, so smaller portions' },
};
function priorityScores(foods, ctx, priority) {
  const out = new Map(foods.map((f) => [f.id, { score: 0, reasons: [] }]));
  priority.forEach((id) => {
    const P = PRIORITIES[id]; if (!P) return;
    const vals = foods.map((f) => P.get(f, ctx)).filter((v) => v != null);
    if (!vals.length) return; const min = Math.min(...vals); const max = Math.max(...vals);
    foods.forEach((f) => {
      const v = P.get(f, ctx); if (v == null) return;
      const n = max === min ? 0.5 : (v - min) / (max - min); const s = P.lowerBetter ? 1 - n : n;
      const o = out.get(f.id); o.score += s; if (s >= 0.6) o.reasons.push(P.why(f, ctx));
    });
  });
  return out;
}

// ---- the owner's own numbers: bounded sliders, closest foods first -----------------------------
// Two readings of a number: "label" (% as printed on the bag) and "kcal" (per 1000 kcal, the fair comparison).
export const TG = [
  { key: 'protein', label: 'Protein', aafco: 'Crude Protein', label$: (f) => f.protein, kcal$: (f) => per1000(f.protein, f.kcalPerKg), unit: { label: '%', kcal: 'g per 1000 kcal' }, step: { label: 0.5, kcal: 1 }, dec: { label: 1, kcal: 0 } },
  { key: 'fat', label: 'Fat', aafco: 'Crude Fat', label$: (f) => f.fat, kcal$: (f) => per1000(f.fat, f.kcalPerKg), unit: { label: '%', kcal: 'g per 1000 kcal' }, step: { label: 0.5, kcal: 1 }, dec: { label: 1, kcal: 0 } },
  { key: 'fibre', label: 'Fibre', label$: (f) => f.fibre, kcal$: (f) => per1000(f.fibre, f.kcalPerKg), unit: { label: '%', kcal: 'g per 1000 kcal' }, step: { label: 0.5, kcal: 1 }, dec: { label: 1, kcal: 0 } },
  { key: 'moisture', label: 'Moisture (water)', label$: (f) => f.moisture, kcal$: null, unit: { label: '%' }, step: { label: 1 }, dec: { label: 0 } },
  { key: 'calcium', label: 'Calcium', aafco: 'Calcium', label$: (f) => f.calcium, kcal$: (f) => per1000(f.calcium, f.kcalPerKg), unit: { label: '%', kcal: 'g per 1000 kcal' }, step: { label: 0.05, kcal: 0.1 }, dec: { label: 2, kcal: 1 } },
  { key: 'phosphorus', label: 'Phosphorus', aafco: 'Phosphorus', label$: (f) => f.phosphorus, kcal$: (f) => per1000(f.phosphorus, f.kcalPerKg), unit: { label: '%', kcal: 'g per 1000 kcal' }, step: { label: 0.05, kcal: 0.1 }, dec: { label: 2, kcal: 1 } },
  { key: 'energy', label: 'Calories in the food', label$: (f) => (f.kcalPerKg ? f.kcalPerKg / 10 : null), kcal$: (f) => (f.kcalPerKg ? f.kcalPerKg / 10 : null), unit: { label: 'kcal per 100 g', kcal: 'kcal per 100 g' }, step: { label: 5, kcal: 5 }, dec: { label: 0, kcal: 0 } },
];
const tgGet = (T, mode) => (mode === 'kcal' ? T.kcal$ : T.label$);
const snap = (v, step) => Math.round(v / step) * step;
const OP_WORD = { about: 'you want', min: 'at least', max: 'at most' };

// Bounds come from what is actually on offer (a little wider), so a number can never be impossible.
function boundsFor(T, mode, species, foods) {
  const g = tgGet(T, mode); if (!g) return null;
  const vals = foods.filter((f) => f.species === species).map(g).filter((v) => v != null);
  if (vals.length < 2) return null;
  const step = T.step[mode]; const lo = Math.max(0, snap(Math.min(...vals) * 0.8, step)); let hi = snap(Math.max(...vals) * 1.2, step); if (hi <= lo) hi = lo + step * 5;
  return { lo, hi, mid: snap([...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)], step), step, dec: T.dec[mode], unit: T.unit[mode] };
}
const clampTo = (v, b) => Math.min(b.hi, Math.max(b.lo, v));

// Sensible starting numbers. Where there is a published reference we use it (AAFCO); where there is not, how the foods on offer compare.
const up = (v, step = 1) => Math.ceil(v / step) * step;
const quant = (vals, q) => { const s = [...vals].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * q))]; };
const aaf = (species, stage) => nutrientTargets({ species, sizeCat: 'IV', weightKg: 10, birth: new Date(Date.now() - (stage === 'growth' ? 3 * 30.4 : 3 * 365) * 864e5).toISOString().slice(0, 10) });
const catVals = (key, species, foods) => { const T = TG.find((x) => x.key === key); return foods.filter((f) => f.species === species).map((f) => T.kcal$(f)).filter((v) => v != null); };
const PRESETS = {
  lose: (s) => [{ key: 'energy', op: 'max', v: s === 'cat' ? 325 : 310 }, { key: 'protein', op: 'min', v: s === 'cat' ? 85 : 75 }, ...(s === 'cat' ? [] : [{ key: 'fat', op: 'max', v: 30 }])],
  maintain: (s) => { const a = aaf(s, 'adult'); return [{ key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.2) }, { key: 'fat', op: 'min', v: up(a['Crude Fat'].min) }]; },
  gain: (s, foods) => { const a = aaf(s, 'adult'); return [{ key: 'energy', op: 'min', v: quant(catVals('energy', s, foods), 0.75) }, { key: 'fat', op: 'min', v: quant(catVals('fat', s, foods), 0.5) }, { key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.2) }]; },
  grow: (s) => { const a = aaf(s, 'growth'); return [{ key: 'protein', op: 'min', v: up(a['Crude Protein'].min) }, { key: 'fat', op: 'min', v: up(a['Crude Fat'].min) }]; },
  active: (s, foods) => { const a = aaf(s, 'adult'); return [{ key: 'energy', op: 'min', v: quant(catVals('energy', s, foods), 0.5) }, { key: 'fat', op: 'min', v: quant(catVals('fat', s, foods), 0.5) }, { key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.3) }]; },
  senior: (s, foods) => { const a = aaf(s, 'adult'); return [{ key: 'energy', op: 'max', v: quant(catVals('energy', s, foods), 0.5) }, { key: 'fat', op: 'max', v: quant(catVals('fat', s, foods), 0.5) }, { key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.2) }]; },
};
// Which suggestion to offer for a goal and activity.
export function recommendedPreset(pet, goal) {
  if (!pet || !goal) return null;
  if (goal.type === 'lose') return 'lose'; if (goal.type === 'gain') return 'gain'; if (goal.type === 'grow') return 'grow';
  if (pet.activity === 'high') return 'active'; if (pet.activity === 'low') return 'senior'; return 'maintain';
}

// Everything the "your own numbers" panel needs for one species: the bounds of each number (in both readings) and each suggestion's numbers,
// already snapped and clamped to those bounds.
export function targetsView(cat, species) {
  const bounds = { label: {}, kcal: {} };
  for (const T of TG) for (const mode of ['label', 'kcal']) { const b = boundsFor(T, mode, species, cat.foods); if (b) bounds[mode][T.key] = b; }
  const presets = {};
  for (const [id, build] of Object.entries(PRESETS)) {
    presets[id] = build(species, cat.foods).map((it) => { const b = bounds.kcal[it.key]; return b ? { key: it.key, op: it.op, v: clampTo(snap(it.v, b.step), b) } : null; }).filter(Boolean);
  }
  return { bounds, presets, hasPrices: cat.foods.some((x) => x.pricePerKg) };
}

function targetScores(foods, act, mode, species, cat) {
  const out = new Map(foods.map((f) => [f.id, { score: 1, items: [] }]));
  const keys = Object.entries(act || {}).filter(([, o]) => o && o.v != null);
  if (!keys.length) return out;
  foods.forEach((f) => { out.get(f.id).score = 0; });
  keys.forEach(([key, o]) => {
    const T = TG.find((x) => x.key === key); const b = boundsFor(T, mode, species, cat.foods); if (!b) return; const g = tgGet(T, mode); const span = (b.hi - b.lo) / 2 || 1; const tv = o.v;
    foods.forEach((f) => {
      const v = g(f); const r = out.get(f.id);
      if (v == null) { r.items.push({ state: 'na', text: `${T.label}: not reported (${OP_WORD[o.op]} ${(+tv).toFixed(b.dec)})` }); return; }
      const miss = o.op === 'min' ? Math.max(0, tv - v) : o.op === 'max' ? Math.max(0, v - tv) : Math.abs(v - tv);
      r.score += 1 - Math.min(1, miss / span);
      const ok = o.op === 'about' ? miss <= span * 0.1 : miss === 0;
      r.items.push({ state: ok ? 'on' : 'off', text: `${T.label}: ${v.toFixed(b.dec)} ${b.unit === '%' ? '%' : b.unit} (${OP_WORD[o.op]} ${(+tv).toFixed(b.dec)})` });
    });
  });
  out.forEach((r) => { r.score /= keys.length; });
  return out;
}

// ---- cards -------------------------------------------------------------------------------------
// The numbers a food card shows for this pet (or for a 1,000 kcal day when there is no pet).
export function cardNumbers(f, ctx, m) {
  const fit = ctx.pet ? foodFit(f, ctx.pet, ctx.plan, ctx.targets) : null;
  const kcal = ctx.plan?.hideKcal ? null : ctx.goalKcal || ctx.plan?.kcal || null;
  return {
    id: f.id, fit: fit ? { verdict: fit.verdict, warn: fit.warn.slice(0, 1) } : null, kcal,
    grams: kcal ? gramsPerDay(f, kcal) : null, cost: kcal ? costPerDay(f, kcal) : null, gramsRef: f.kcalPerKg ? gramsPerDay(f, kcal || 1000) : null,
    protein: per1000(f.protein, f.kcalPerKg) ?? null, fat: per1000(f.fat, f.kcalPerKg) ?? null,
    guide: ctx.pet ? brandGuide(f, ctx.pet.weightKg) : null, petKg: ctx.pet ? ctx.pet.weightKg : null, match: m || null,
  };
}

// ---- ranking -----------------------------------------------------------------------------------
// req: { pet, species, stage, region, quick[], needs[], hideAllergy, include, priority[], unit, targets{key:{v,op}}, sort, goal, ratings{id:n}, limit }
export function rankFoods(cat, req) {
  const pet = req.pet || null; const goal = req.goal || null; const ctx = ctxFor(pet, goal);
  const species = req.species || pet?.species || 'dog'; const mode = req.unit === 'label' ? 'label' : 'kcal';
  const price = (f) => (req.region === 'US' ? { ...f, pricePerKg: null } : f);
  let foods = cat.foods.filter((f) => f.species === species && (req.stage !== 'growth' || ['growth', 'all'].includes(f.lifeStage))).map(price);
  if (req.region && req.region !== 'all') foods = foods.filter((f) => (f.markets || []).includes(req.region));
  foods = foods.filter((f) => (req.quick || []).every((id) => QUICK[id](f, ctx)));
  if (pet && req.hideAllergy !== false) foods = foods.filter((f) => !allergenHits(f, pet).length);
  foods = foods.filter((f) => (req.needs || []).every((id) => NEEDS[id](f)));
  const act = Object.entries(req.targets || {}).filter(([, o]) => o && o.v != null);
  if (req.include === false) foods = foods.filter((f) => act.every(([key]) => tgGet(TG.find((x) => x.key === key), mode)(f) != null));
  const fitOf = new Map(); const fit = (f) => { if (!pet) return 0; if (!fitOf.has(f.id)) fitOf.set(f.id, ORDER[foodFit(f, pet, ctx.plan, ctx.targets).verdict]); return fitOf.get(f.id); };
  const match = new Map();
  if (pet && goal) foods.forEach((f) => match.set(f.id, goalMatch(f, goal.type, ctx.goalKcal)));
  const pri = priorityScores(foods, ctx, req.priority || []); const tsc = targetScores(foods, req.targets, mode, species, { ...cat, foods: cat.foods.map(price) }); const hasT = act.length > 0;
  const gs = [...match.values()].map((m) => m.score); const gmin = Math.min(...gs, 0); const gmax = Math.max(...gs, 1);
  const total = (f) => (pri.get(f.id)?.score ?? 0) + 0.5 * (match.has(f.id) ? (match.get(f.id).score - gmin) / ((gmax - gmin) || 1) : 0) + (hasT ? 2 * tsc.get(f.id).score : 0);
  const ratings = req.ratings || {}; const rate = (f) => ratings[f.id] || 0;
  foods.sort((a, b) => {
    if (req.sort === 'rating') return rate(b) - rate(a);
    if (req.sort === 'price') return (costPerDay(a, ctx.goalKcal || 1000) ?? 99) - (costPerDay(b, ctx.goalKcal || 1000) ?? 99);
    return fit(a) - fit(b) || total(b) - total(a) || rate(b) - rate(a);
  });
  foods.forEach((f) => { const m = match.get(f.id) || { score: 0, reasons: [] }; m.reasons = [...pri.get(f.id).reasons, ...m.reasons].slice(0, 3); m.targets = hasT ? tsc.get(f.id).items : []; match.set(f.id, m); });
  if (req.sort === 'fit' && (goal || (req.priority || []).length || hasT)) foods.filter((f) => fit(f) === 0).slice(0, 2).forEach((f) => { match.get(f.id).top = true; });
  const limit = req.limit || 12;
  return { total: foods.length, goalKcal: ctx.goalKcal, items: foods.slice(0, limit).map((f) => cardNumbers(f, ctx, match.get(f.id))) };
}

// ---- one food ----------------------------------------------------------------------------------
// Everything the food page shows that is worked out: the fit, calories (estimated when the maker states none), the daily amount and cost, the maker's table.
export function foodDetail(cat, pet, id, region) {
  const f0 = cat.byId.get(id); if (!f0 || f0.isTreat || f0.isSupplement) return null;
  const f1 = region === 'US' ? { ...f0, pricePerKg: null } : f0;
  const est = !(f1.kcalPerKg > 0) ? estimateKcal(f1) : null;
  const f = est ? { ...f1, kcalPerKg: est.kcalPerKg, kcalEstimated: true, estAssumed: est.assumed, estMargin: est.margin } : f1;
  const ctx = ctxFor(pet, null);
  const fit = pet ? foodFit(f, pet, ctx.plan, ctx.targets) : null;
  const kcal = ctx.plan && !ctx.plan.hideKcal ? ctx.plan.kcal : null;
  const flagged = f.ingredients.map((ing) => TOXIC_TERMS.some((t) => (!t.species || t.species === f.species) && ing.toLowerCase().includes(t.term)) || (!!pet && allergenHits({ ingredients: [ing] }, pet).length > 0));
  return {
    kcalPerKg: f.kcalPerKg ?? null, estimated: !!est, estAssumed: est?.assumed || [], estMargin: est?.margin ?? null,
    fit, plan: ctx.plan, kcal, grams: kcal ? gramsPerDay(f, kcal) : null, cost: kcal ? costPerDay(f, kcal) : null, flagged,
    nutrients: ['protein', 'fat', 'calcium', 'phosphorus'].map((k) => per1000(f[k], f.kcalPerKg) ?? null), guide: pet ? brandGuide(f, pet.weightKg) : null,
  };
}

// ---- treats and supplements --------------------------------------------------------------------
const treatDay = (t, pet, kcal) => {
  if (!pet) return { kind: 'nopet' };
  if (kcal == null) return { kind: 'vet' };
  const p = treatPlan(t, pet, kcal);
  if (p.count != null) return { kind: 'count', count: p.count, limitedBy: p.limitedBy };
  if (p.grams != null) return { kind: 'grams', grams: p.grams };
  return { kind: 'unknown' };
};
// req: { pet, species, type, q, hide, sort, limit }
export function treatsView(cat, req) {
  const pet = req.pet || null; const species = pet?.species || req.species || 'dog'; const plan = pet ? energyPlan(pet) : null; const kcal = plan && !plan.hideKcal ? Math.round(plan.kcal) : null;
  const words = String(req.q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  let list = cat.treats.filter((t) => t.species === species && (!req.type || req.type === 'all' || t.treatType === req.type) && words.every((w) => `${t.brand} ${t.name}`.toLowerCase().includes(w)));
  if (pet && req.hide !== false) list = list.filter((t) => !allergenHits(t, pet).length);
  const count = (t) => treatPlan(t, pet, kcal).count;
  const by = { budget: (a, b) => (count(b) ?? -1) - (count(a) ?? -1), calories: (a, b) => (a.kcalPerTreat ?? 1e9) - (b.kcalPerTreat ?? 1e9), name: (a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`) };
  list.sort(by[req.sort === 'budget' && !(pet && kcal) ? 'calories' : req.sort] || by.name);
  const types = [...new Set(cat.treats.filter((t) => t.species === species).map((t) => t.treatType).filter(Boolean))];
  return { total: list.length, kcal, types, items: list.slice(0, req.limit || 48).map((t) => ({ id: t.id, fit: pet ? treatFit(t, pet) : null, day: treatDay(t, pet, kcal) })) };
}
export function treatDetail(cat, pet, id) {
  const t = cat.byId.get(id); if (!t || !t.isTreat) return null;
  const plan = pet ? energyPlan(pet) : null; const kcal = plan && !plan.hideKcal ? Math.round(plan.kcal) : null;
  return { kcal, plan: pet ? treatPlan(t, pet, kcal) : null, fit: pet ? treatFit(t, pet) : null, flagged: t.ingredients.map((ing) => TOXIC_TERMS.some((x) => (!x.species || x.species === t.species) && ing.toLowerCase().includes(x.term)) || (!!pet && allergenHits({ ingredients: [ing] }, pet).length > 0)) };
}
// Supplements fitting a species, with the label dose for the pet's weight.
export function supplementsView(cat, req) {
  const pet = req.pet || null; const species = pet?.species || req.species || 'dog';
  const words = String(req.q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = cat.supplements.filter((s) => supplementFits(s, species) && (!req.type || req.type === 'all' || s.type === req.type) && words.every((w) => `${s.brand} ${s.name}`.toLowerCase().includes(w)));
  const types = [...new Set(cat.supplements.filter((s) => supplementFits(s, species)).map((s) => s.type).filter(Boolean))];
  return { total: list.length, types, items: list.slice(0, req.limit || 48).map((s) => ({ id: s.id, dose: pet ? supplementDose(s, pet.weightKg) : null })) };
}

// ---- Home picks and Scan -----------------------------------------------------------------------
// Foods to feature: with a pet, foods that fit it; without, a few to explore. Only the ids and verdicts are returned.
export function homePicks(cat, pet, region, limit = 2) {
  const species = pet?.species || 'dog'; const ctx = ctxFor(pet, null);
  let foods = cat.foods.filter((f) => f.species === species && (region === 'all' || !region || (f.markets || []).includes(region)));
  if (pet) foods = foods.filter((f) => foodFit(f, pet, ctx.plan, ctx.targets).verdict === 'good');
  return foods.slice(0, limit).map((f) => cardNumbers(price(region, f), ctx, null));
}
const price = (region, f) => (region === 'US' ? { ...f, pricePerKg: null } : f);

// The numbers for given foods (a card on the Home page): fit, daily amount and cost for this pet, nutrients per 1000 kcal.
export function foodCards(cat, pet, ids, region) {
  const ctx = ctxFor(pet, null);
  return ids.map((id) => cat.byId.get(id)).filter((f) => f && !f.isTreat && !f.isSupplement).map((f) => cardNumbers(price(region, f), ctx, null));
}

// A food read from a label (scan): fit, the amount a day, and up to three catalogue foods that fit.
export function scanView(cat, pet, scanned) {
  const ctx = ctxFor(pet, null); const fit = foodFit(scanned, pet, ctx.plan, ctx.targets);
  const alts = cat.foods.filter((f) => f.species === pet.species).filter((f) => foodFit(f, pet, ctx.plan, ctx.targets).verdict === 'good').slice(0, 3).map((f) => f.id);
  const kcal = ctx.plan.hideKcal ? null : ctx.plan.kcal;
  return { fit, plan: ctx.plan, kcal, grams: kcal ? gramsPerDay(scanned, kcal) : null, cost: kcal ? costPerDay(scanned, kcal) : null, alts, protein: per1000(scanned.protein, scanned.kcalPerKg) ?? null, fat: per1000(scanned.fat, scanned.kcalPerKg) ?? null };
}
