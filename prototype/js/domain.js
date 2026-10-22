// DOMAIN: pure business logic. No DOM, no storage, no network. (Will move to server functions + packages/domain.)
import { DOG_GROWTH, CAT_GROWTH, DOG_BREEDS, AAFCO } from './reference.js';

export const LB_PER_KG = 2.20462;
export const kgToLb = (kg) => kg * LB_PER_KG;
export const lbToKg = (lb) => lb / LB_PER_KG;
export const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export const SIZE_CATEGORIES = [
  { id: 'I', label: 'Toy (under 6.5 kg)' },
  { id: 'II', label: 'Small (6.5 to 9 kg)' },
  { id: 'III', label: 'Small-medium (9 to 15 kg)' },
  { id: 'IV', label: 'Medium (15 to 30 kg)' },
  { id: 'V', label: 'Large (30 to 40 kg)' },
  { id: 'VI', label: 'Giant (over 40 kg)' },
];

// Whole months completed (about 30.44 days each). A calendar-month difference would count Jan 31 to Mar 1 as 2 months, up to a month early.
export const ageInMonths = (birthISO, today = new Date()) => Math.max(0, Math.floor((new Date(today).getTime() - new Date(birthISO).getTime()) / (86400000 * 30.44)));

// Age as a fraction of a month (not the whole calendar months of ageInMonths). Charts and percentiles use this so two
// weigh-ins a few weeks apart sit at different points instead of stacking in the same month.
export const monthsExact = (birthISO, date = new Date()) => Math.max(0, (new Date(date).getTime() - new Date(birthISO).getTime()) / (86400000 * 30.44));

export const rer = (kg) => 70 * kg ** 0.75;

// Body condition (9-point scale, dogs and cats): each point above 5 is about +10% over ideal weight (AAHA, WSAVA). Below 5: no data, use current.
export const idealWeightKg = (kg, bcs) => (bcs > 5 ? kg / (1 + 0.1 * (bcs - 5)) : kg);

export const lifeStage = (pet) => {
  const m = ageInMonths(pet.birth);
  if (pet.species === 'cat') return m < 12 ? 'growth' : 'adult';
  const large = ['V', 'VI'].includes(sizeCategory(pet));
  // Large and giant breeds keep growing longer. 18 months is our choice (sources give 18 to 24).
  return m < (large ? 18 : 12) ? 'growth' : 'adult';
};

// Known breed -> its size group and usual adult weight (null for blank, mixed or unknown names).
export const breedSize = (name) => { const b = name && DOG_BREEDS.find((x) => x.name.toLowerCase() === String(name).trim().toLowerCase()); return b ? { name: b.name, size: b.size, min: b.min, max: b.max } : null; };

export const sizeCategory = (pet) => {
  if (pet.species === 'cat') return null;
  if (pet.breed) {
    const b = DOG_BREEDS.find((x) => x.name === pet.breed);
    if (b) return b.size;
  }
  return pet.sizeCat || 'IV';
};

const MER = {
  // Midpoints of the AAHA 2021 ranges: dog neutered 1.4-1.6, intact 1.6-1.8; cat neutered 1.2-1.4, intact 1.4-1.6. Growth values are AAHA's.
  dog: { intact: 1.7, neutered: 1.5, pup4: 3.0, pup: 2.0 },
  cat: { intact: 1.5, neutered: 1.3, kitten: 2.5 },
};

// Daily energy multiplier on resting energy for an adult: neutering sets it, activity moves it. Used by BOTH the plan and the goals,
// so the two can never disagree. "low" is the same low factor that overweight-prone pets get; "high" is for working or very active pets.
// low: AAHA inactive/obese-prone (dog 1.0-1.2 -> midpoint 1.1, cat 1.0). high: our choice, AAHA 2021 only gives 1.6-2.0 for light work in dogs; cat 1.6 is ours.
const ACTIVITY = { dog: { low: 1.1, high: 1.8 }, cat: { low: 1.0, high: 1.6 } };
export function adultFactor(pet) {
  const a = ACTIVITY[pet.species][pet.activity];
  return a ?? MER[pet.species][pet.neutered ? 'neutered' : 'intact'];
}
export function growthFactor(pet) { return pet.species === 'cat' ? MER.cat.kitten : ageInMonths(pet.birth) < 4 ? MER.dog.pup4 : MER.dog.pup; }
// Weight-loss calories (AAHA 2021 box 1): dogs 1.0 x RER, cats 0.8 x RER, at the ideal weight. One number, wherever it is shown.
export const weightLossFactor = (species) => (species === 'cat' ? 0.8 : 1.0);
// The basis is the lower of the ideal weight and the target the owner (or their vet) chose, e.g. 25 kg for a 30 kg dog with sore knees.
export const weightLossKcal = (pet, targetKg = null) => weightLossFactor(pet.species) * rer(Math.min(idealWeightKg(pet.weightKg, pet.bcs), targetKg || Infinity));

export function energyPlan(pet) {
  const stage = lifeStage(pet);
  const ideal = idealWeightKg(pet.weightKg, pet.bcs);
  const losing = pet.bcs >= 6 && stage === 'adult';
  let factor; let basis = ideal; let method;
  if (stage === 'growth') {
    factor = growthFactor(pet);
    basis = pet.weightKg;
    method = 'Growth: multiplier on resting energy at current weight';
  } else if (losing) {
    factor = weightLossFactor(pet.species);
    method = `Weight loss: ${factor} x resting energy at ideal weight (AAHA 2021)`;
  } else {
    factor = adultFactor(pet);
    method = 'Maintenance: multiplier on resting energy at ideal weight';
  }
  const resting = rer(basis);
  const kcal = resting * factor;
  // A growing pet that is above the 98th percentile or at body score 7+ should be guided by a vet, not an app: no calorie target is shown.
  const bands = stage === 'growth' ? growthBands(pet) : null;
  const vetHold = stage === 'growth' && (pet.bcs >= 7 || (!!bands && percentile(pet.weightKg, monthsExact(pet.birth), bands).edge === 'above'));
  return { stage, ideal, resting, factor, kcal, floor: 0.6 * rer(ideal), losing, method, vetHold, hideKcal: vetHold, needsVet: pet.bcs <= 3 || (losing && stage === 'growth') || vetHold };
}

// First number in a cell such as "6.25 (4.5 for large-breed puppies)"; "ND" or blank gives null.
const parseNum = (s) => { const m = String(s ?? '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };

// Targets per 1000 kcal ME from AAFCO rows (growth vs adult).
export function nutrientTargets(pet) {
  const stage = lifeStage(pet);
  const rows = AAFCO[pet.species];
  const largePup = pet.species === 'dog' && stage === 'growth' && ['V', 'VI'].includes(sizeCategory(pet));
  const out = {};
  for (const [name, r] of Object.entries(rows)) {
    const min = parseNum(stage === 'growth' ? r.growth : r.adult);
    let max = parseNum(r.max);
    if (name === 'Calcium' && largePup) max = 4.5;
    out[name] = { unit: r.unit, min, max };
  }
  return out;
}

// Weight percentile from empirical bands (p02,p25,p50,p75,p98), piecewise linear.
export function growthBands(pet) {
  return pet.species === 'cat' ? CAT_GROWTH : DOG_GROWTH[sizeCategory(pet)];
}
// Band values at a fractional month, interpolated between the monthly rows (so 1 or 2 weeks ahead still moves).
export function bandsAt(bands, month) {
  const rows = bands; const first = rows[0]; const last = rows[rows.length - 1];
  if (month <= first.m) return first; if (month >= last.m) return last;
  const hi = rows.findIndex((r) => r.m >= month); const a = rows[hi - 1]; const b = rows[hi]; const f = (month - a.m) / (b.m - a.m || 1);
  const out = { m: month }; ['p02', 'p25', 'p50', 'p75', 'p98'].forEach((k) => { out[k] = a[k] + (b[k] - a[k]) * f; }); return out;
}
export function percentile(kg, months, bands) {
  const row = bandsAt(bands, months);
  const young = bands[0].m >= 3 && months < bands[0].m - 0.05; // below the first age on the chart (dogs: 12 weeks): compared with that first row, and flagged
  const pts = [[row.p02, 2], [row.p25, 25], [row.p50, 50], [row.p75, 75], [row.p98, 98]];
  if (kg <= pts[0][0]) return { value: 2, edge: 'below', row, young };
  if (kg >= pts[4][0]) return { value: 98, edge: 'above', row, young };
  for (let i = 0; i < 4; i++) {
    const [w0, p0] = pts[i]; const [w1, p1] = pts[i + 1];
    if (kg >= w0 && kg <= w1) return { value: Math.round(p0 + ((kg - w0) / (w1 - w0 || 1)) * (p1 - p0)), edge: null, row, young };
  }
  return { value: 50, edge: null, row };
}

// Label guaranteed analysis (as-fed %) to grams per 1000 kcal.
export const per1000 = (pct, kcalPerKg) => (pct == null || !kcalPerKg ? null : (pct * 10000) / kcalPerKg);

export const NUTRIENTS = [
  { key: 'protein', label: 'Protein', unit: 'g/1000 kcal', aafco: 'Crude Protein', get: (f) => per1000(f.protein, f.kcalPerKg) },
  { key: 'fat', label: 'Fat', unit: 'g/1000 kcal', aafco: 'Crude Fat', get: (f) => per1000(f.fat, f.kcalPerKg) },
  { key: 'fibre', label: 'Fibre (max)', unit: 'g/1000 kcal', get: (f) => per1000(f.fibre, f.kcalPerKg) },
  { key: 'calcium', label: 'Calcium', unit: 'g/1000 kcal', aafco: 'Calcium', get: (f) => per1000(f.calcium, f.kcalPerKg) },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'g/1000 kcal', aafco: 'Phosphorus', get: (f) => per1000(f.phosphorus, f.kcalPerKg) },
  { key: 'moisture', label: 'Moisture (max)', unit: '% as fed', get: (f) => f.moisture },
  { key: 'kcal', label: 'Energy', unit: 'kcal/kg', get: (f) => f.kcalPerKg },
  { key: 'price', label: 'Price per day', unit: 'per day', get: (f, ctx) => (ctx && f.pricePerKg && f.kcalPerKg ? (ctx.kcal / f.kcalPerKg) * f.pricePerKg : null) },
];

// AAFCO 2014 dry-matter minimums (% of dry matter), checked from the AAFCO PDF. The profiles presume 4,000 kcal ME per kg of dry matter:
// foods ABOVE that are corrected for energy (our per-1,000-kcal check), foods BELOW that "should not be corrected", so they must also
// meet these percentages as they stand. Kept here until the dry-matter columns are added to ref.nutrient_profiles.
const AAFCO_DM_MIN = {
  dog: { growth: { protein: 22.5, fat: 8.5, calcium: 1.2, phosphorus: 1.0 }, adult: { protein: 18, fat: 5.5, calcium: 0.5, phosphorus: 0.4 } },
  cat: { growth: { protein: 30, fat: 9, calcium: 1.0, phosphorus: 0.8 }, adult: { protein: 26, fat: 9, calcium: 0.6, phosphorus: 0.5 } },
};
// AAFCO 2014 calcium:phosphorus ratio limits. Kept here until the ratio columns in ref.nutrient_profiles are loaded into the app.
const CA_P_RATIO = { min: 1, max: 2 };
const wordHit = (text, term) => new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(text);

export const ALLERGY_TERMS = { fish: ['fish', 'salmon', 'tuna'], dairy: ['milk', 'cheese', 'whey'], pea: ['pea', 'peas'], egg: ['egg', 'eggs'], wheat: ['wheat'], corn: ['corn'], soy: ['soy', 'soybean'] };

export const TOXIC_TERMS = [
  { term: 'garlic', verdict: 'bad', note: 'Garlic and onion damage red blood cells in dogs and cats.' },
  { term: 'onion', verdict: 'bad', note: 'Garlic and onion damage red blood cells in dogs and cats.' },
  { term: 'xylitol', verdict: 'bad', note: 'Xylitol is dangerous for dogs.' },
  { term: 'grapes', verdict: 'bad', note: 'Grapes and raisins can cause kidney failure in dogs.' },
  { term: 'raisins', verdict: 'bad', note: 'Grapes and raisins can cause kidney failure in dogs.' },
  { term: 'chocolate', verdict: 'bad', note: 'Chocolate and cocoa are toxic to dogs and cats.' },
];

// Fit check of one food for one pet. Returns checks, verdict and the reasons.
export function foodFit(food, pet, plan, targets) {
  const checks = []; const warn = []; let verdict = 'good';
  const bump = (v) => { if (v === 'bad' || (v === 'caution' && verdict === 'good')) verdict = v; };
  if (food.species !== pet.species) { bump('bad'); warn.push({ level: 'bad', text: `Made for ${food.species}s, not ${pet.species}s.` }); }
  const text = food.ingredients.join(', ');
  for (const t of TOXIC_TERMS) if (wordHit(text, t.term)) { bump('bad'); warn.push({ level: 'bad', text: `Contains ${t.term}. ${t.note}` }); }
  for (const a of pet.allergies || []) {
    const hit = (ALLERGY_TERMS[a] || [a]).find((t) => wordHit(text, t));
    if (hit) { bump('bad'); warn.push({ level: 'bad', text: `Contains ${hit}, which you listed as an allergy (${a}).` }); }
  }
  for (const key of ['protein', 'fat', 'calcium', 'phosphorus']) {
    const n = NUTRIENTS.find((x) => x.key === key); const t = targets[n.aafco];
    const v = n.get(food);
    if (v == null) { checks.push({ key, label: n.label, state: 'unknown', value: null, target: t }); if (key === 'calcium') bump('caution'); continue; }
    let state = 'good';
    if (t?.min != null && v < t.min) state = 'bad';
    if (t?.max != null && v > t.max) state = 'bad';
    if (state === 'bad') {
      bump('bad');
      const low = t?.min != null && v < t.min;
      warn.push({ level: 'bad', text: `${n.label} is ${low ? `below the minimum (${v.toFixed(1)} vs ${t.min})` : `above the maximum (${v.toFixed(1)} vs ${t.max})`} g per 1000 kcal.` });
    }
    // Low-energy foods (under 4,000 kcal ME per kg of dry matter) are not corrected, so they must also meet the dry-matter minimum.
    const dm = food.moisture != null ? 100 - food.moisture : null; const kcalDM = dm > 0 && food.kcalPerKg ? food.kcalPerKg / (dm / 100) : null;
    const dmMin = AAFCO_DM_MIN[pet.species]?.[plan.stage]?.[key]; const dmPct = dm > 0 && food[key] != null ? (food[key] / dm) * 100 : null;
    if (state !== 'bad' && kcalDM != null && kcalDM < 4000 && dmMin != null && dmPct != null && dmPct < dmMin) {
      state = 'bad'; bump('bad'); warn.push({ level: 'bad', text: `${n.label} is ${dmPct.toFixed(1)}% of dry matter, below the AAFCO minimum of ${dmMin}%. This food is under 4,000 kcal per kg of dry matter, so AAFCO does not adjust the minimum for its energy.` });
    }
    checks.push({ key, label: n.label, state, value: v, target: t });
  }
  // Calcium to phosphorus ratio: AAFCO 2014 dog profile asks for 1:1 to 2:1; the cat profile has no ratio, so cats are not checked. Only when both are on the label.
  const ca = NUTRIENTS.find((x) => x.key === 'calcium').get(food); const ph = NUTRIENTS.find((x) => x.key === 'phosphorus').get(food);
  if (pet.species === 'dog' && ca != null && ph) { const ratio = ca / ph; if (ratio < CA_P_RATIO.min || ratio > CA_P_RATIO.max) { bump('caution'); warn.push({ level: 'caution', text: `The calcium to phosphorus ratio is ${ratio.toFixed(1)} to 1. AAFCO asks for between ${CA_P_RATIO.min} to 1 and ${CA_P_RATIO.max} to 1.` }); } }
  if (food.lifeStage === 'growth' && plan.stage === 'adult') { bump('caution'); warn.push({ level: 'caution', text: 'Puppy and kitten formula. It is richer in calories than an adult usually needs.' }); }
  if (food.lifeStage === 'adult' && plan.stage === 'growth') { bump('bad'); warn.push({ level: 'bad', text: 'Adult formula. Your pet is still growing and needs a growth or all-life-stages food.' }); }
  if (food.lifeStage === 'unknown') { bump('caution'); warn.push({ level: 'caution', text: 'The label does not say which life stage it is for, so check it suits your pet.' }); }
  if (checks.some((c) => c.state === 'unknown')) warn.push({ level: 'caution', text: 'Some nutrients are not on the label (shown as "not reported"), so we cannot fully verify this food.' });
  return { verdict, checks, warn };
}

// DIY recipe analysis: ingredient rows {id, grams} against a library of per-100g values.
export function analyseRecipe(rows, library, targets) {
  const tot = { kcal: 0, protein: 0, fat: 0, calcium: 0, phosphorus: 0, grams: 0 };
  for (const r of rows) {
    const ing = library.find((x) => x.id === r.id); if (!ing || !r.grams) continue;
    const f = r.grams / 100;
    tot.grams += r.grams; tot.kcal += ing.kcal * f; tot.protein += ing.protein * f; tot.fat += ing.fat * f;
    tot.calcium += (ing.calcium / 1000) * f; tot.phosphorus += (ing.phosphorus / 1000) * f;
  }
  if (!tot.kcal) return { tot, rows: [] };
  const k = 1000 / tot.kcal;
  const result = [
    ['Protein', tot.protein * k, 'Crude Protein'], ['Fat', tot.fat * k, 'Crude Fat'],
    ['Calcium', tot.calcium * k, 'Calcium'], ['Phosphorus', tot.phosphorus * k, 'Phosphorus'],
  ].map(([label, value, a]) => {
    const t = targets[a]; let state = 'good';
    if (t?.min != null && value < t.min) state = 'bad';
    if (t?.max != null && value > t.max) state = 'bad';
    return { label, value, target: t, state };
  });
  return { tot, rows: result };
}

// Cost per day for a food and calorie need.
export const costPerDay = (food, kcal) => (food.pricePerKg && food.kcalPerKg ? (kcal / food.kcalPerKg) * food.pricePerKg : null);
export const gramsPerDay = (food, kcal) => (food.kcalPerKg ? (kcal / food.kcalPerKg) * 1000 : null);

// ---- progressive profile + weigh-in rhythm -------------------------------------------------
// Which of the pet's listed allergens a food contains (by ingredient list).
export const allergenHits = (food, pet) => { const text = food.ingredients.join(', '); return (pet?.allergies || []).filter((a) => (ALLERGY_TERMS[a] || [a]).some((t) => wordHit(text, t))); };
export const ALLERGENS = ['chicken', 'beef', 'lamb', 'fish', 'egg', 'dairy', 'wheat', 'corn', 'soy', 'pea'];
export const OPTIONAL_KEYS = ['bcs', 'neutered', 'activity', 'allergies'];
const isAnswered = (pet, k) => (pet.answered ? !!pet.answered[k] : true); // older profiles count as complete
export const completeness = (pet) => Math.round(((3 + OPTIONAL_KEYS.filter((k) => isAnswered(pet, k)).length) / (3 + OPTIONAL_KEYS.length)) * 100);
export const remainingKeys = (pet) => OPTIONAL_KEYS.filter((k) => !isAnswered(pet, k));

const DAY = 86400000;
const dayOf = (iso) => Math.floor(new Date(iso).getTime() / DAY);
// Growing pets: every 2 weeks. Adults: monthly. Skips count, so a busy week never breaks the streak.
export function weighStatus(pet, now = new Date()) {
  const interval = lifeStage(pet) === 'growth' ? 14 : 30;
  const events = [...(pet.logs || []).map((l) => l.on), ...(pet.skips || [])].map(dayOf);
  const today = Math.floor(now.getTime() / DAY);
  const last = events.length ? Math.max(...events) : today;
  const windows = new Set(events.map((d) => Math.floor((today - d) / interval)));
  let k = windows.has(0) ? 0 : 1; let streak = 0;
  while (windows.has(k)) { streak += 1; k += 1; }
  return { interval, dueInDays: interval - (today - last), streak, lastDaysAgo: today - last };
}

// ---- goals: target weight + days -> safe pace, calories, and which foods suit --------------
export const GOALS = [
  { id: 'lose', label: 'Lose weight', hint: 'Gradual, safe loss', icon: 'scales' },
  { id: 'maintain', label: 'Keep weight steady', hint: 'Stay as they are', icon: 'heart' },
  { id: 'gain', label: 'Gain weight', hint: 'Healthy gain', icon: 'chart' },
  { id: 'grow', label: 'Grow healthy', hint: 'Stay on a steady curve', icon: 'paw' },
];
// A growing pet should gain weight, so "keep steady", "lose" and "gain" are not offered; only staying on the growth curve.
export const goalsFor = (pet) => (lifeStage(pet) === 'growth' ? GOALS.filter((g) => g.id === 'grow') : GOALS.filter((g) => g.id !== 'grow'));

const KCAL_PER_KG_BODY = 7700; // common rule of thumb for body-weight change; an estimate, not exact

export function maintenanceKcal(pet, kg = idealWeightKg(pet.weightKg, pet.bcs)) {
  return rer(kg) * (lifeStage(pet) === 'growth' ? growthFactor(pet) : adultFactor(pet));
}

// Weekly change as % of body weight, and a plain-words verdict on the pace.
// Loss bands: AAHA 2014 safe rate 1-2% a week for dogs; 0.5-2% for cats (cat band taken from a reviewer, not re-checked in the source).
export function paceOf(type, weeklyPct, species = 'dog') {
  const r = Math.abs(weeklyPct); const lo = species === 'cat' ? 0.5 : 1;
  if (type === 'lose') {
    if (weeklyPct >= -0.05) return { state: 'bad', text: 'This target is not below the current weight.' };
    if (r < lo) return { state: 'caution', text: 'A gentle pace. Safe, just slower.' };
    if (r <= 2) return { state: 'good', text: `A safe pace: ${lo} to 2% of body weight a week.` };
    if (r <= 3) return { state: 'caution', text: 'Faster than advised. Try a longer time frame.' };
    return { state: 'bad', text: 'Too fast. Please add days, or ask your vet.' };
  }
  if (type === 'gain') {
    if (weeklyPct <= 0.05) return { state: 'bad', text: 'This target is not above the current weight.' };
    if (r <= 1.5) return { state: 'good', text: 'A steady, healthy pace for gaining.' };
    if (r <= 2.5) return { state: 'caution', text: 'A bit quick. Try a longer time frame.' };
    return { state: 'bad', text: 'Too fast. Please add days, or ask your vet.' };
  }
  return { state: 'good', text: 'No change needed.' };
}

// Days that give a safe pace (1.5% a week) for a target weight.
export const suggestDays = (pet, targetKg) => Math.max(14, Math.round((Math.abs(targetKg - pet.weightKg) / pet.weightKg / 0.015) * 7));


// Is this goal sensible for how the pet looks today? (pace alone is not enough)
const SEV = { good: 0, caution: 1, bad: 2 };
export function goalSense(pet, type, targetKg) {
  if (type !== 'lose' && type !== 'gain') return null;
  const bcs = pet.bcs ?? 5; const ideal = idealWeightKg(pet.weightKg, bcs);
  if (type === 'gain') {
    if (bcs >= 6) return { state: 'bad', text: `${pet.name || 'This pet'} looks above a healthy weight, so gaining is not advised. Losing toward about ${Math.round(ideal * 10) / 10} kg is.` };
    if (bcs === 5) return { state: 'caution', text: 'Already at a healthy weight. Only aim to gain if your vet suggests it.' };
    if (bcs === 4) return { state: 'caution', text: 'Slightly lean. A small gain may help. Please check with your vet.' };
    return { state: 'caution', text: 'This looks underweight. Please see your vet before choosing a gain plan.' };
  }
  if (bcs >= 5 && pet.health?.includes('joints')) return { state: 'caution', text: `Losing weight often helps sore joints. Please agree the target (${Math.round(targetKg * 10) / 10} kg) with your vet, who can check how fast to go.` };
  if (bcs <= 4) return { state: 'bad', text: 'Already lean or underweight, so losing weight is not advised. Please see your vet.' };
  if (bcs === 5) return { state: 'caution', text: 'Already at a healthy weight. Only aim to lose if your vet suggests it.' };
  if (targetKg < ideal * 0.95) return { state: 'caution', text: `That is below the estimated ideal weight of about ${Math.round(ideal * 10) / 10} kg.` };
  return null;
}

export function goalPlan(pet, goal) {
  const W0 = pet.weightKg; const D = Math.max(7, Number(goal.days) || 90); const type = goal.type;
  const maint = maintenanceKcal(pet);
  if (type === 'maintain') return { type, days: D, targetKg: W0, weeklyPct: 0, kcal: Math.round(maint), pace: paceOf('maintain', 0), note: 'The daily calories that keep their weight steady.' };
  if (type === 'grow') {
    const bands = growthBands(pet); const m = ageInMonths(pet.birth); const pct = percentile(W0, m, bands);
    const future = bands.reduce((best, r) => (Math.abs(r.m - (m + D / 30.4)) < Math.abs(best.m - (m + D / 30.4)) ? r : best), bands[0]);
    const pts = [[future.p02, 2], [future.p25, 25], [future.p50, 50], [future.p75, 75], [future.p98, 98]];
    if (goal.custom && goal.targetKg) { const gt = growthTarget(pet, D, goal.targetKg); // A bigger target in the same time needs more energy, a smaller one less: scale by how the asked gain compares with a typical gain
    // (half-weight, held within -15% / +25% so a pet is never pushed into rapid growth, which matters most for large breeds).
    // typical gain = same percentile, as a ratio, so a pet off the chart still gets a sensible pace
    const typicalGain = W0 * (weightAtPercentile(bands, m + D / 30.44, pct.value) / weightAtPercentile(bands, m, pct.value) - 1); const askedGain = goal.targetKg - W0;
    const ratio = typicalGain > 0.05 ? Math.max(0, askedGain / typicalGain) : 1;
    const scale = ratio <= 1 ? 0.85 + 0.15 * ratio : 1 + 0.25 * Math.min(1, (ratio - 1) / 2); // 0.85 at no gain, 1.0 at a typical gain, 1.25 at 3x typical
    return { type, days: D, targetKg: goal.targetKg, weeklyPct: gt.weeklyPct, kcal: Math.round(maint * scale), pace: gt.pace, note: `Your own target, picked on the growth chart.${scale !== 1 ? ` Calories are ${scale > 1 ? 'raised' : 'lowered'} about ${Math.round(Math.abs(scale - 1) * 100)}% for it.` : ''}` }; }
    let kg = future.p50; for (let i = 0; i < 4; i++) if (pct.value >= pts[i][1] && pct.value <= pts[i + 1][1]) kg = pts[i][0] + ((pct.value - pts[i][1]) / (pts[i + 1][1] - pts[i][1])) * (pts[i + 1][0] - pts[i][0]);
    return { type, days: D, targetKg: round(kg, 1), weeklyPct: ((kg - W0) / W0 / (D / 7)) * 100, kcal: Math.round(maint), pace: { state: 'good', text: `Staying around the ${pct.value}th percentile.` }, note: 'Expected weight if growth stays on the same curve.' };
  }
  const Wt = Number(goal.targetKg) || W0; const delta = Wt - W0; const weeklyPct = (delta / W0 / (D / 7)) * 100;
  const perDay = (delta * KCAL_PER_KG_BODY) / D;
  // Losing: the AAHA starting amount, the same number the plan shows. It does not depend on the date, so the date is an estimate:
  // weigh-ins decide, and calories are adjusted in small steps if the pace is off. Gaining: maintenance plus the surplus (7,700 kcal per kg is a rough human-derived rule, so it is only an estimate).
  // Losing takes time into account: the calories that give the wanted pace (maintenance minus the daily deficit), but never below
  // the AAHA starting amount (so a short deadline cannot push the dog onto crash calories) and never above maintenance.
  const aaha = type === 'lose' ? weightLossKcal(pet, Wt) : 0;
  let kcal = type === 'lose' ? Math.min(maint, Math.max(aaha, maint + perDay)) : maint + perDay; const floor = 0.6 * rer(Wt);
  let estDays = null;
  const notes = [];
  if (type === 'lose' && maint + perDay < aaha && maint > aaha) {
    estDays = Math.round((Math.abs(delta) * KCAL_PER_KG_BODY) / (maint - aaha));
    notes.push(`${D} days is faster than a safe amount of food allows. At ${Math.round(aaha)} kcal a day (the safe starting amount), reaching ${round(Wt, 1)} kg would take about ${estDays} days (about ${Math.round(estDays / 7)} weeks), as a rough estimate.`);
  } else if (type === 'lose') notes.push('The date is an estimate; we adjust the calories in small steps from your weigh-ins.');
  if (type === 'lose') notes.push(`We will never suggest fewer than ${Math.round(aaha)} kcal a day for this goal, because going lower is not safe for ${pet.name || 'your pet'}.`);
  if (type === 'lose' && kcal < floor) { kcal = floor; notes.push(`Calories are held at a safe floor of ${Math.round(floor)} a day, so the real pace will be slower.`); }
  let pace = paceOf(type, weeklyPct, pet.species); const sense = goalSense(pet, type, Wt);
  if (sense && SEV[sense.state] >= SEV[pace.state]) { notes.unshift(`Pace: ${pace.text}`); pace = sense; } else if (sense) notes.unshift(sense.text);
  if (sense && sense.state === 'bad') { kcal = maint; notes.push('We show calories to keep weight steady, because this goal is not advised.'); }
  return { type, days: D, targetKg: Wt, weeklyPct, kcal: Math.round(kcal), pace, perDay: Math.round(perDay), estDays, note: notes.join(' ') };
}

// How well a food suits the goal, with plain-language reasons.
export function goalMatch(food, type, kcal) {
  const protein = per1000(food.protein, food.kcalPerKg) ?? 0; const fat = per1000(food.fat, food.kcalPerKg) ?? 0; const fibre = per1000(food.fibre, food.kcalPerKg) ?? 0;
  const grams = food.kcalPerKg ? (kcal / food.kcalPerKg) * 1000 : null; const reasons = []; let score = 0;
  if (type === 'lose') {
    score = protein + fibre * 1.5 - food.kcalPerKg / 60;
    if (grams) reasons.push(`A bigger portion for the same calories (${Math.round(grams)} g a day)`);
    if (protein >= 75) reasons.push('High protein helps keep muscle while losing fat');
    if (fibre >= 12) reasons.push('Extra fibre helps them feel full');
  } else if (type === 'gain') {
    score = food.kcalPerKg / 50 + fat;
    if (grams) reasons.push(`Energy-dense, so a smaller portion goes further (${Math.round(grams)} g a day)`);
    if (fat >= 45) reasons.push('Richer in fat for extra energy');
  } else if (type === 'grow') {
    score = protein + (food.lifeStage === 'growth' || food.lifeStage === 'all' ? 30 : -50);
    if (food.lifeStage === 'growth' || food.lifeStage === 'all') reasons.push('Made for growing pets');
    if (protein >= 70) reasons.push('Good protein for growth');
  } else {
    score = protein * 0.3; if (grams) reasons.push(`About ${Math.round(grams)} g a day`);
  }
  return { score, reasons: reasons.slice(0, 2), grams };
}

export const NUTRIENT_HELP = {
  protein: 'Builds and keeps muscle.',
  fat: 'Energy and a healthy coat.',
  fibre: 'Helps them feel full and keeps digestion regular.',
  calcium: 'Strong bones and teeth.',
  phosphorus: 'Works with calcium for bones.',
  moisture: 'Water in the food. Wet food is mostly water.',
  kcal: 'Calories in 100 g of food. Dry food is about 350 to 400, wet food about 80 to 130.',
  price: 'Estimated cost to feed your pet each day.',
};

// ---- targets picked on the chart: where do you want your pet to be in a week, a month ... -------
export const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };

// Weight at a given percentile for an age, read from the empirical bands.
export function weightAtPercentile(bands, month, pct) {
  const row = bandsAt(bands, month);
  const pts = [[row.p02, 2], [row.p25, 25], [row.p50, 50], [row.p75, 75], [row.p98, 98]];
  if (pct <= 2) return row.p02; if (pct >= 98) return row.p98;
  for (let i = 0; i < 4; i++) if (pct >= pts[i][1] && pct <= pts[i + 1][1]) return pts[i][0] + ((pct - pts[i][1]) / (pts[i + 1][1] - pts[i][1])) * (pts[i + 1][0] - pts[i][0]);
  return row.p50;
}

// A growing pet's own target: is it a sensible place on the curve?
export function growthTarget(pet, days, kg) {
  const bands = growthBands(pet); const m0 = ageInMonths(pet.birth); const mf = m0 + days / 30.44;
  const cur = percentile(pet.weightKg, m0, bands).value; const tp = percentile(kg, mf, bands);
  const weeklyPct = ((kg - pet.weightKg) / pet.weightKg / (days / 7)) * 100;
  let pace;
  if (kg < pet.weightKg - 0.05) pace = { state: 'bad', text: 'A growing pet should keep gaining. This target is below the current weight.' };
  else if (tp.edge === 'above') pace = { state: 'caution', text: 'Above the 98th percentile for that age, which is faster than typical growth. Ask your vet.' };
  else if (tp.edge === 'below') pace = { state: 'caution', text: 'Below the 2nd percentile for that age, which is slower than typical growth.' };
  else if (kg - pet.weightKg > 2 * Math.max(0, weightAtPercentile(bands, mf, cur) - pet.weightKg) + 0.03 * pet.weightKg * Math.max(1, days / 7)) pace = { state: 'caution', text: `Gaining ${(kg - pet.weightKg).toFixed(1)} kg in ${days} days is much faster than a typical track for this pet (about ${Math.max(0, weightAtPercentile(bands, mf, cur) - pet.weightKg).toFixed(1)} kg). Ask your vet.` };
  else if (Math.abs(tp.value - cur) * (30.44 / Math.max(days, 1)) > 30) pace = { state: 'caution', text: `That moves from the ${ordinal(cur)} to the ${ordinal(tp.value)} percentile in ${days} days, a big shift.` };
  else pace = { state: 'good', text: `Around the ${ordinal(tp.value)} percentile, a typical track.` };
  return { pct: tp.value, edge: tp.edge, curPct: cur, weeklyPct, pace, month: mf };
}

// Hard limits: a weight outside what is possible is not accepted, whether logged or used as a target. Our curves stop at the 2nd and 98th
// percentile, so these limits are our own: growing pets half the 2nd-percentile weight to 1.5 x the 98th for that age; adults half the
// breed's (or size group's) usual minimum to twice its maximum. A pet just above the 98th can still be logged, and gets the vet card.
const SIZE_RANGE = { I: [1, 6.5], II: [6.5, 9], III: [9, 15], IV: [15, 30], V: [30, 40], VI: [40, 80] };
export function weightLimits(pet, on = new Date()) {
  if (lifeStage(pet) === 'growth') { const r = bandsAt(growthBands(pet), monthsExact(pet.birth, on)); return { lo: 0.5 * r.p02, hi: 1.5 * r.p98 }; }
  const [mn, mx] = pet.species === 'cat' ? [2, 7] : (() => { const b = breedSize(pet.breed); return b ? [b.min, b.max] : SIZE_RANGE[sizeCategory(pet)] || [15, 30]; })();
  return { lo: 0.5 * mn, hi: 2 * mx };
}
export function weightCheck(pet, kg, on = new Date()) {
  const { lo, hi } = weightLimits(pet, on); const r = (v) => Math.round(v * 10) / 10;
  if (kg >= lo && kg <= hi) return { ok: true, lo, hi };
  return { ok: false, lo, hi, message: `${r(kg)} kg is not allowed: it is outside what is possible for ${pet.name && pet.name !== 'your pet' ? pet.name : 'a pet'} at this age and ${pet.species === 'cat' ? 'size' : 'breed or size'} (about ${r(lo)} to ${r(hi)} kg). Please check the weight, or talk to your vet.` };
}

// Bounds for the weight slider so nothing impossible can be picked.
export function targetBounds(pet, days) {
  const W = pet.weightKg; const r1 = (v) => Math.round(v * 10) / 10;
  if (lifeStage(pet) === 'growth') {
    const bands = growthBands(pet); const mf = ageInMonths(pet.birth) + days / 30.44;
    let lo = Math.max(weightAtPercentile(bands, mf, 2), W); let hi = weightAtPercentile(bands, mf, 98);
    lo = Math.ceil(lo * 10) / 10; hi = Math.floor(hi * 10) / 10; if (hi < lo + 0.3) hi = r1(lo + 0.3);
    const lim = weightLimits(pet); lo = Math.max(lo, Math.ceil(lim.lo * 10) / 10); hi = Math.min(hi, Math.floor(lim.hi * 10) / 10);
    return { lo, hi, growth: true };
  }
  const lim = weightLimits(pet);
  return { lo: Math.max(r1(W * 0.75), Math.ceil(lim.lo * 10) / 10), hi: Math.min(r1(W * 1.25), Math.floor(lim.hi * 10) / 10), growth: false };
}

// One call for the target panel: growing pets get a curve check, adults get the weight-goal checks.
export function targetCheck(pet, days, kg) {
  if (lifeStage(pet) === 'growth') { const g = growthTarget(pet, days, kg); return { kind: 'growth', ...g, kcal: goalPlan(pet, { type: 'grow', custom: true, targetKg: kg, days }).kcal }; }
  const type = kg < pet.weightKg - 0.05 ? 'lose' : kg > pet.weightKg + 0.05 ? 'gain' : 'maintain';
  const g = goalPlan(pet, { type, targetKg: kg, days });
  return { kind: 'adult', type, ...g };
}


// ---- goals with a fixed date ---------------------------------------------------------------------
// A goal is { type, targetKg, startOn, startKg, targetDate, ... }. The target date is fixed when the goal is set, so reopening
// or tweaking never slides the deadline. Calories adapt to today's weight, but progress is judged against the ORIGINAL plan.
const isoDay = (now = new Date()) => now.toISOString().slice(0, 10);
export const todayStr = isoDay;
export const addDaysStr = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const daysBetweenStr = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / DAY);
export const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// The saved goal with `days` = days LEFT until its fixed date (what goalPlan and the picker work with). Null when there is none.
export function effectiveGoal(pet, now = new Date()) {
  const g = pet?.goal; if (!g) return null;
  const today = isoDay(now);
  const startOn = g.startOn || pet.target?.setOn || today;
  const targetDate = g.targetDate || addDaysStr(startOn, Number(g.days) || Number(pet.target?.days) || 90);
  const left = daysBetweenStr(today, targetDate);
  return { ...g, startOn, startKg: g.startKg ?? pet.weightKg, targetDate, days: Math.max(0, left), daysLeft: left, totalDays: Math.max(1, daysBetweenStr(startOn, targetDate)), expired: left <= 0 };
}

// Where the pet should be today if the goal were followed from its start, and how the real weight compares.
export function goalProgress(pet, goal, now = new Date()) {
  const g = goal?.targetDate ? goal : effectiveGoal({ ...pet, goal }, now); if (!g) return null;
  const today = isoDay(now); const elapsed = Math.min(g.totalDays, Math.max(0, daysBetweenStr(g.startOn, today))); const frac = elapsed / g.totalDays;
  const actual = pet.weightKg; const weighed = (pet.logs || []).some((l) => l.on > g.startOn);   // a weigh-in AFTER the goal started
  let planned; let tol;
  if (g.type === 'grow' && !g.custom) {
    // stay on the percentile line the pet started on
    const bands = growthBands(pet); const m0 = (new Date(`${g.startOn}T00:00:00Z`) - new Date(pet.birth)) / (DAY * 30.44);
    const startPct = percentile(g.startKg, Math.max(0, m0), bands).value;
    planned = weightAtPercentile(bands, monthsExact(pet.birth, now), startPct); tol = Math.max(0.3, 0.08 * planned);
  } else { planned = g.startKg + (g.targetKg - g.startKg) * frac; tol = Math.max(0.3, 0.02 * g.startKg); }
  const dir = g.type === 'maintain' ? 0 : Math.sign(g.targetKg - g.startKg) || 1;
  const ahead = g.type === 'grow' && !g.custom ? actual - planned : dir * (actual - planned);   // positive = ahead of plan
  let state = ahead > tol ? 'ahead' : ahead < -tol ? 'behind' : 'on_track';
  if (g.type === 'maintain') state = Math.abs(actual - g.startKg) <= Math.max(0.5, 0.03 * g.startKg) ? 'on_track' : 'behind';
  if (!weighed) state = 'no_data';
  const text = { on_track: 'On track', ahead: g.type === 'grow' ? 'Growing faster than the line' : 'Ahead of plan', behind: g.type === 'grow' ? 'Growing slower than the line' : 'A bit behind plan', no_data: 'Weigh in to see progress' }[state];
  const done = g.targetKg === g.startKg ? 1 : Math.min(1, Math.max(0, (actual - g.startKg) / (g.targetKg - g.startKg)));
  return { state, text, plannedKg: Math.round(planned * 10) / 10, actualKg: actual, diffKg: Math.round((actual - planned) * 10) / 10, daysLeft: g.daysLeft, expired: g.expired, pctDone: g.type === 'grow' && !g.custom ? null : Math.round(done * 100) };
}


// ---- projections: where the pet is heading if nothing changes ---------------------------------------
// Growing pets: keep following the percentile line they are on now (a weighted average of their last three weigh-ins, so one odd
// reading does not swing it). Adults: continue the recent weight trend. Both are estimates, not promises.
export function projectGrowth(pet, now = new Date()) {
  const bands = growthBands(pet); if (!bands || !bands.length) return null;
  const m0 = monthsExact(pet.birth, now); const endM = Math.min(bands[bands.length - 1].m, pet.species === 'cat' ? 21 : 36);
  if (m0 >= endM - 0.5) return null;
  const logs = (pet.logs || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1));
  const recent = logs.filter((l) => now.getTime() - new Date(l.on).getTime() <= 75 * DAY).slice(-3);
  const src = recent.length ? recent : [{ on: isoDay(now), kg: pet.weightKg }];
  let sw = 0; let sp = 0; src.forEach((l, i) => { sw += i + 1; sp += (i + 1) * percentile(l.kg, monthsExact(pet.birth, l.on), bands).value; });
  const pct = Math.round(sp / sw);
  // A pet beyond the chart (above the 98th or below the 2nd) keeps its same proportion to that edge curve. Without this the line
  // would jump onto the edge curve itself, which can sit below the pet's real weight and draw weight loss that is not happening.
  const now0 = percentile(pet.weightKg, m0, bands); const k = now0.edge ? pet.weightKg / weightAtPercentile(bands, m0, pct) : 1;
  const kgAt = (mo) => weightAtPercentile(bands, mo, pct) * k;
  // a growing pet does not lose weight on the typical track, so small wiggles in the reference data are ironed out (never goes down)
  const points = []; let floor = 0; for (let k = 0; k <= 24; k++) { const mo = m0 + ((endM - m0) * k) / 24; floor = Math.max(floor, Math.round(kgAt(mo) * 10) / 10); points.push({ m: mo, kg: floor }); }
  const spread = (mo) => ({ lo: weightAtPercentile(bands, mo, Math.max(2, pct - 12)), hi: weightAtPercentile(bands, mo, Math.min(98, pct + 12)) });
  const atDate = (iso) => kgAt(Math.min(endM, monthsExact(pet.birth, iso)));
  return { pct, points, m0, endM, kgAtMonth: kgAt, kgAtDate: atDate, spread, basis: src.length };
}
export function projectTrend(pet, now = new Date(), days = 60) {
  const logs = (pet.logs || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1)).filter((l) => now.getTime() - new Date(l.on).getTime() <= 120 * DAY).slice(-5);
  if (logs.length < 2) return null;
  const t0 = new Date(logs[0].on).getTime(); const xs = logs.map((l) => (new Date(l.on).getTime() - t0) / DAY); const ys = logs.map((l) => l.kg);
  if (xs[xs.length - 1] < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);   // kg per day
  const last = logs[logs.length - 1]; const tLast = new Date(last.on).getTime(); const tEnd = now.getTime() + days * DAY;
  const at = (t) => Math.max(0.5, last.kg + slope * ((t - tLast) / DAY));
  const pts = [tLast, now.getTime() + (days / 2) * DAY, tEnd].map((t) => ({ t, kg: Math.round(at(t) * 10) / 10 }));
  return { perWeek: Math.round(slope * 7 * 100) / 100, points: pts, endKg: pts[2].kg, endDate: isoDay(new Date(tEnd)), days, kgAtDate: (iso) => Math.round(at(new Date(`${iso}T00:00:00Z`).getTime()) * 10) / 10 };
}

// ---- diet log ------------------------------------------------------------------------------------
// A diet item is { id, foodId, foodName, role, amount, unit, timesPerDay, startedOn, endedOn, replacedId }. `endedOn` is the day it
// stopped being fed (not fed from that day on). A change on day D ends the old items on D and starts the new ones on D.
export const DIET_ROLES = { main: 'Main food', topper: 'Wet food or topper', treat: 'Treats', other: 'Other' };
export const DIET_UNITS = { g: 'g', cup: 'cup', can: 'can', piece: 'piece' };
export const unitWords = (u, n) => (u === 'g' ? 'g' : n === 1 ? u : u === 'piece' ? 'pieces' : `${u}s`);
export const dietActive = (it, on) => it.startedOn <= on && (!it.endedOn || it.endedOn > on);
export const currentDiet = (items, on = isoDay()) => (items || []).filter((it) => dietActive(it, on)).sort((a, b) => (a.role === b.role ? (a.startedOn < b.startedOn ? -1 : 1) : Object.keys(DIET_ROLES).indexOf(a.role) - Object.keys(DIET_ROLES).indexOf(b.role)));
export const perDay = (it) => it.amount * it.timesPerDay;

// Every day the diet changed, newest first: what started, what stopped, and which start replaced which stop.
export function dietChanges(items) {
  const days = new Set(); (items || []).forEach((it) => { days.add(it.startedOn); if (it.endedOn) days.add(it.endedOn); });
  const first = (items || []).reduce((m, it) => (!m || it.startedOn < m ? it.startedOn : m), null);
  return [...days].sort().reverse().map((date) => {
    const started = items.filter((it) => it.startedOn === date); const stopped = items.filter((it) => it.endedOn === date);
    const replaced = started.filter((s) => s.replacedId && stopped.some((x) => x.id === s.replacedId)).map((s) => ({ from: stopped.find((x) => x.id === s.replacedId), to: s }));
    const amountChanges = replaced.filter((r) => r.from.foodName === r.to.foodName);
    return { date, started, stopped, replaced: replaced.filter((r) => r.from.foodName !== r.to.foodName), amountChanges, isFirst: date === first };
  });
}

// What happened to weight during each stretch of the same diet. Descriptive only: growth also depends on age, health, treats and season,
// so this never says a food "caused" anything. A period needs 3 weigh-ins over 2 weeks before it says anything about the pace.
export function dietPeriods(pet, items, now = new Date()) {
  const today = isoDay(now); const dates = [...new Set((items || []).flatMap((it) => [it.startedOn, it.endedOn].filter(Boolean)))].sort();
  if (!dates.length) return [];
  const logs = (pet.logs || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1));
  const bands = lifeStage(pet) === 'growth' ? growthBands(pet) : null;
  return dates.map((start, i) => {
    const end = dates[i + 1] || null; const lim = end || addDaysStr(today, 1);
    const inside = logs.filter((l) => l.on >= start && l.on < lim);
    const before = logs.filter((l) => l.on <= start).pop();
    const startKg = before ? before.kg : inside[0]?.kg ?? null;
    const lastKg = inside.length ? inside[inside.length - 1].kg : null;
    let weeklyGain = null; let enough = false;
    const pts = [...(before && before.on < start ? [before] : []), ...inside];
    if (pts.length >= 2) {
      const t0 = new Date(pts[0].on).getTime(); const xs = pts.map((l) => (new Date(l.on).getTime() - t0) / DAY); const ys = pts.map((l) => l.kg);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      if (den > 0) { weeklyGain = Math.round((xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0) / den) * 7 * 100) / 100; enough = inside.length >= 3 && xs[xs.length - 1] - xs[0] >= 14; }
    }
    const pct = (kg, on) => (bands && kg != null ? percentile(kg, monthsExact(pet.birth, on), bands).value : null);
    const endOn = inside.length ? inside[inside.length - 1].on : null;
    return { start, end, current: !end, items: (items || []).filter((it) => dietActive(it, start)), weighIns: inside.length, startKg, endKg: lastKg, weeklyGain, enough,
      pctStart: pct(startKg, before ? before.on : start), pctEnd: pct(lastKg, endOn || start) };
  }).reverse();
}

// Calories a day from the foods we have calorie data for (amount in grams only). `kcalPerKg(foodId)` looks the food up.
export function dietKcal(items, kcalPerKg) {
  let kcal = 0; let known = 0; let unknown = 0;
  (items || []).forEach((it) => { const k = it.unit === 'g' && it.foodId ? kcalPerKg(it.foodId) : null; if (k) { kcal += (perDay(it) * k) / 1000; known += 1; } else unknown += 1; });
  return { kcal: Math.round(kcal), known, unknown };
}
