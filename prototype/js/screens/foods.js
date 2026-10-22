import { listFoods, getPet, updatePet, isSignedIn, getQuickPet, setQuickPet, setGoal, getGoalHistory } from '../store.js';
import { weightCheck, weightLossKcal, NUTRIENTS, NUTRIENT_HELP, GOALS, goalsFor, goalPlan, goalMatch, suggestDays, per1000, energyPlan, nutrientTargets, foodFit, costPerDay, gramsPerDay, round, lifeStage, rer, ageInMonths, targetBounds, allergenHits, ALLERGENS, SIZE_CATEGORIES, breedSize, lbToKg, effectiveGoal, goalProgress, fmtDay, todayStr, addDaysStr } from '../domain.js';
import { card, badge, verdictBadge, stars, button, icon, esc, pageHead, emptyState, choiceGroup, selectField, field, expNote, comboField, mountCombos, sizeBlock, bindBreedSize } from '../ui.js';
import { toast } from '../sheet.js';
import { bindQuickWeight } from '../quickweight.js';
import { chartKind } from '../petcharts.js';
import { targetPickerHtml, mountTargetPicker } from '../targetpicker.js';
import { DOG_BREEDS } from '../reference.js';

const VERDICT_TEXT = { good: 'Good fit', caution: 'Check details', bad: 'Not a fit' };
const ORDER = { good: 0, caution: 1, bad: 2 };
const DAYS = [30, 60, 90, 120, 180, 270, 365];
const fmt = (n, d = 1) => (n == null ? 'not reported' : n.toFixed(d));

export function foodCard(food, ctx) {
  const fit = ctx.pet ? foodFit(food, ctx.pet, ctx.plan, ctx.targets) : null;
  const kcal = ctx.plan?.hideKcal ? null : ctx.goalKcal || ctx.plan?.kcal;
  const g = kcal ? gramsPerDay(food, kcal) : null; const c = kcal ? costPerDay(food, kcal) : null;
  const p = NUTRIENTS[0].get(food); const f = NUTRIENTS[1].get(food);
  const m = ctx.match?.get(food.id);
  return card(`
    <div class="fc__img"><img src="${food.img}" alt="" width="600" height="600" loading="lazy"></div>
    <div class="row row--between">${fit ? verdictBadge(fit.verdict, VERDICT_TEXT[fit.verdict]) : badge(isSignedIn() ? 'Create a profile for fit' : 'Add your pet for fit')}${m?.top ? badge('Top pick for this goal', 'good', 'star') : badge(food.format, 'info')}</div>
    <h3 class="card__title" style="margin-top:var(--space-3)">${esc(food.name)}</h3>
    <p class="muted small" style="margin:0">${esc(food.brand)}, ${food.species}</p>
    <div class="row" style="margin:var(--space-3) 0">${food.reviews ? `${stars(food.rating)}<span class="small muted">${food.rating} (${food.reviews}), ${food.rebuy}% would rebuy</span>` : '<span class="small muted">No reviews yet</span>'}</div>
    ${m?.reasons?.length ? `<ul class="reasons">${m.reasons.map((r) => `<li>${icon('check')}<span>${esc(r)}</span></li>`).join('')}</ul>` : ''}
    ${m?.targets?.length ? `<ul class="tmatch" aria-label="Compared with your numbers">${m.targets.map((t) => `<li class="tmatch--${t.state}">${icon(t.state === 'on' ? 'check' : t.state === 'na' ? 'help' : 'info')}<span>${esc(t.text)}</span></li>`).join('')}</ul>` : ''}
    <div class="fc__stats small">${(() => {
      // grams in the pet's daily bowl; with no pet, in a 1,000 kcal day (about a 20 kg dog), with the grams of food that is
      const ref = kcal || 1000; const grams = food.kcalPerKg ? gramsPerDay(food, ref) : null; const k = ref / 1000;
      const tail = kcal ? 'in the daily bowl' : 'in a 1,000 kcal day';
      const amt = (v) => (v == null ? 'not reported' : `<strong>${Math.round(v * k)} g</strong>`);
      return `<div><span class="muted">Protein</span><br>${amt(p)} <span class="muted">${tail}</span></div><div><span class="muted">Fat</span><br>${amt(f)} <span class="muted">${tail}</span></div>${grams ? `<div><span class="muted">${kcal ? 'Per day' : 'That is'}</span><br><strong>${Math.round(grams)} g</strong> <span class="muted">of food</span></div>` : ''}${food.kcalPerKg ? `<div><span class="muted">Energy</span><br><strong>${Math.round(food.kcalPerKg / 10)}</strong> kcal/100 g</div>` : ''}${c ? `<div><span class="muted">Cost</span><br><strong>$${c.toFixed(2)}</strong>/day</div>` : ''}`;
    })()}</div>
    ${fit && fit.warn.length ? `<p class="small" style="margin:var(--space-3) 0 0;color:var(--color-${fit.warn[0].level === 'bad' ? 'bad' : 'caution'})">${icon(fit.warn[0].level === 'bad' ? 'x' : 'alert')} ${esc(fit.warn[0].text)}</p>` : ''}
  `, { href: `/food/${food.id}` });
}

// The pet this page works with: the saved profile, or a logged-out visitor's quick details (this tab only).
const curPet = () => getPet() || getQuickPet();
export const makeCtx = () => {
  const pet = curPet(); if (!pet) return { pet: null, plan: null, targets: null };
  return { pet, plan: energyPlan(pet), targets: nutrientTargets(pet) };
};

// ---- state ------------------------------------------------------------------------------------
const state = { species: null, stage: null, include: true, sort: 'fit', quick: new Set(), priority: new Set(), unit: 'label', targets: { label: {}, kcal: {} }, targetsOpen: false, moreOpen: false, preset: null, chartOpen: false, needs: new Set(), hideAllergy: true };
let goal = null; // {type, targetKg, days, kcalOverride?} for the current pet
let goalOpen = true; // open while choosing; collapses to one line so the foods are visible
const kcalFor = (pet) => (goal?.kcalOverride != null ? Math.max(goal.kcalOverride, goal.type === 'lose' ? Math.round(weightLossKcal(pet, goal.targetKg)) : 0) : goalPlan(pet, goal).kcal); // an old override can never go below the safe level
const withKcal = (c) => { if (c.pet && goal) c.goalKcal = kcalFor(c.pet); return c; };

// ---- quick narrowing and priorities ----------------------------------------------------------
const QUICK = [
  { id: 'dry', label: 'Dry food', test: (f) => f.format === 'dry' },
  { id: 'wet', label: 'Wet food', test: (f) => f.format === 'wet' },
  { id: 'budget', label: 'Under $2 a day', test: (f, ctx) => { const c = costPerDay(f, ctx.goalKcal || ctx.plan?.kcal || 1000); return c != null && c <= 2; } },
];
// Extras the owner can ask for. These are filters ("must contain"), matched on ingredients or the declared extras.
const NEEDS = [
  { id: 'joints', label: 'Joints (glucosamine, chondroitin)', test: (f) => (f.extras || []).some((x) => ['glucosamine', 'chondroitin', 'mussel'].includes(x)), help: 'Often chosen for older, large or heavier pets.' },
  { id: 'collagen', label: 'Collagen', test: (f) => (f.extras || []).includes('collagen') || f.ingredients.some((i) => /collagen|bone broth/i.test(i)), help: 'Skin, coat and joint support. Evidence is limited.' },
  { id: 'omega3', label: 'Omega-3 (skin and coat)', test: (f) => (f.extras || []).includes('omega3') || f.ingredients.some((i) => /fish oil|salmon|tuna|flax|krill/i.test(i)), help: 'From fish oil, oily fish or flaxseed.' },
  { id: 'probiotics', label: 'Probiotics (gut)', test: (f) => (f.extras || []).includes('probiotics'), help: 'Live cultures added for digestion.' },
  { id: 'antioxidants', label: 'Antioxidants (vitamins E, C)', test: (f) => (f.extras || []).includes('antioxidants'), help: 'Added vitamins and plant antioxidants.' },
];
const suggestedNeeds = (pet) => { if (!pet) return []; const ids = []; const yrs = ageInMonths(pet.birth) / 12; if (yrs >= 7 || pet.bcs >= 6 || ['IV', 'V'].includes(pet.sizeCat)) ids.push('joints'); ids.push('omega3'); return ids; };
// Priorities rank foods instead of hiding them. Picking at most two forces a trade-off, so "everything highest" is impossible.
const MAX_PRIORITIES = 2;
const PRIORITIES = [
  { id: 'cost', label: 'Lower cost', lowerBetter: true, get: (f, c) => costPerDay(f, c.goalKcal || c.plan?.kcal || 1000), why: (f, c) => `Lower cost: about $${costPerDay(f, c.goalKcal || c.plan?.kcal || 1000).toFixed(2)} a day` },
  { id: 'protein', label: 'High protein', get: (f) => per1000(f.protein, f.kcalPerKg), why: (f) => `High protein: ${per1000(f.protein, f.kcalPerKg).toFixed(0)} g per 1000 kcal` },
  { id: 'lean', label: 'Lean (less fat)', lowerBetter: true, get: (f) => per1000(f.fat, f.kcalPerKg), why: (f) => `Lean: ${per1000(f.fat, f.kcalPerKg).toFixed(0)} g fat per 1000 kcal` },
  { id: 'fibre', label: 'Fibre-rich', get: (f) => per1000(f.fibre, f.kcalPerKg), why: () => 'Fibre helps them feel full' },
  { id: 'lighter', label: 'Lighter food', lowerBetter: true, get: (f) => f.kcalPerKg, why: () => 'Fewer calories per gram, so bigger portions' },
  { id: 'small', label: 'Small portions', get: (f) => f.kcalPerKg, why: () => 'Energy-dense, so smaller portions' },
];
function priorityScores(foods, ctx) {
  const out = new Map(foods.map((f) => [f.id, { score: 0, reasons: [] }]));
  [...state.priority].forEach((id) => {
    const P = PRIORITIES.find((p) => p.id === id); const vals = foods.map((f) => P.get(f, ctx)).filter((v) => v != null);
    if (!vals.length) return; const min = Math.min(...vals); const max = Math.max(...vals);
    foods.forEach((f) => {
      const v = P.get(f, ctx); if (v == null) return;
      const n = max === min ? 0.5 : (v - min) / (max - min); const s = P.lowerBetter ? 1 - n : n;
      const o = out.get(f.id); o.score += s; if (s >= 0.6) o.reasons.push(P.why(f, ctx));
    });
  });
  return out;
}

// ---- your own numbers: bounded sliders, closest foods first ----------------------------------
// Two ways to read a number: "% on the label" (as printed on the bag) or "per 1000 kcal" (fair comparison).
const TG = [
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
// Bounds come from what is actually on offer (a little wider), so a number can never be impossible.
function bounds(T, mode, species) {
  const g = tgGet(T, mode); if (!g) return null;
  const vals = listFoods().filter((f) => f.species === species).map(g).filter((v) => v != null);
  if (vals.length < 2) return null;
  const step = T.step[mode]; const lo = Math.max(0, snap(Math.min(...vals) * 0.8, step)); let hi = snap(Math.max(...vals) * 1.2, step); if (hi <= lo) hi = lo + step * 5;
  return { lo, hi, mid: snap(vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)], step), step, dec: T.dec[mode], unit: T.unit[mode] };
}
const clamp = (v, b) => Math.min(b.hi, Math.max(b.lo, v));
const activeTargets = () => Object.entries(state.targets[state.unit]).filter(([, o]) => o && o.v != null);
const OPS = [['about', 'About'], ['min', 'At least'], ['max', 'At most']];
const OP_WORD = { about: 'you want', min: 'at least', max: 'at most' };

// Calories are limited to a sensible range: at least 60% of resting energy, at most 2.5x (3x while growing).
// For a weight-loss goal the lowest allowed number is the safe level (AAHA starting amount for the target weight): we never go below it.
function kcalBounds(pet, g = goal) { const safe = g?.type === 'lose' ? Math.round(weightLossKcal(pet, g.targetKg)) : 0; return { lo: Math.max(safe, Math.round(0.6 * rer(pet.weightKg))), safe, hi: Math.round((lifeStage(pet) === 'growth' ? 3 : 2.5) * rer(pet.weightKg)) }; }

// ---- suggestion presets ----------------------------------------------------------------------
// Numbers are in "per 1000 kcal" (and kcal per 100 g for the food's calories). Where there is a published reference we use it;
// where there is not, the preset says so and is based on how the foods on offer compare.
const up = (v, step = 1) => Math.ceil(v / step) * step;
const quant = (vals, q) => { const s = [...vals].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * q))]; };
const aaf = (species, stage) => nutrientTargets({ species, sizeCat: 'IV', weightKg: 10, birth: new Date(Date.now() - (stage === 'growth' ? 3 * 30.4 : 3 * 365) * 864e5).toISOString().slice(0, 10) });
function catVals(key, species) { const T = TG.find((x) => x.key === key); return listFoods().filter((f) => f.species === species).map((f) => T.kcal$(f)).filter((v) => v != null); }
const PRESETS = [
  { id: 'lose', label: 'Weight loss',
    build: (s) => [{ key: 'energy', op: 'max', v: s === 'cat' ? 325 : 310 }, { key: 'protein', op: 'min', v: s === 'cat' ? 85 : 75 }, ...(s === 'cat' ? [] : [{ key: 'fat', op: 'max', v: 30 }])],
    why: (s) => `Calories follow AAFCO's limit for "light" foods (${s === 'cat' ? '325' : '310'} kcal per 100 g, or ${s === 'cat' ? '3,250' : '3,100'} per kg, for dry food). ${s === 'cat' ? 'Higher protein helps cats keep muscle while losing fat (studies used 35 to 45% of calories from protein), so we ask for at least 85 g per 1000 kcal.' : 'Protein and fat follow a research review of weight-loss dog diets: more than about 25% protein and under 10% fat on a dry-matter basis, roughly 75 and 30 g per 1000 kcal.'} There is no official standard for protein and fat in weight-loss foods.` },
  { id: 'maintain', label: 'Keep steady',
    build: (s) => { const a = aaf(s, 'adult'); return [{ key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.2) }, { key: 'fat', op: 'min', v: up(a['Crude Fat'].min) }]; },
    why: () => 'Protein about 20% above the AAFCO adult minimum and fat at least the minimum, so there is room to spare.' },
  { id: 'gain', label: 'Weight gain',
    build: (s) => { const a = aaf(s, 'adult'); return [{ key: 'energy', op: 'min', v: quant(catVals('energy', s), 0.75) }, { key: 'fat', op: 'min', v: quant(catVals('fat', s), 0.5) }, { key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.2) }]; },
    why: () => 'No official standard. We ask for richer than most foods on offer: calories in the top quarter, fat above the middle, and comfortable protein.' },
  { id: 'grow', label: 'Growing',
    build: (s) => { const a = aaf(s, 'growth'); return [{ key: 'protein', op: 'min', v: up(a['Crude Protein'].min) }, { key: 'fat', op: 'min', v: up(a['Crude Fat'].min) }]; },
    why: () => 'At least the AAFCO minimums for growth. Calcium and phosphorus, which matter most for big breeds, are checked for you.' },
  { id: 'active', label: 'Very active',
    build: (s) => { const a = aaf(s, 'adult'); return [{ key: 'energy', op: 'min', v: quant(catVals('energy', s), 0.5) }, { key: 'fat', op: 'min', v: quant(catVals('fat', s), 0.5) }, { key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.3) }]; },
    why: () => 'No official standard. Energy-dense food with more fat and solid protein, for pets that burn more calories.' },
  { id: 'senior', label: 'Senior or less active',
    build: (s) => { const a = aaf(s, 'adult'); return [{ key: 'energy', op: 'max', v: quant(catVals('energy', s), 0.5) }, { key: 'fat', op: 'max', v: quant(catVals('fat', s), 0.5) }, { key: 'protein', op: 'min', v: up(a['Crude Protein'].min * 1.2) }]; },
    why: () => 'No official standard. Leaner, lower-calorie food with comfortable protein, for pets that move less.' },
];
function recommendedPreset(pet) {
  if (!pet || !goal) return null;
  if (goal.type === 'lose') return 'lose'; if (goal.type === 'gain') return 'gain'; if (goal.type === 'grow') return 'grow';
  if (pet.activity === 'high') return 'active'; if (pet.activity === 'low') return 'senior'; return 'maintain';
}
function applyPreset(id, species) {
  const P = PRESETS.find((x) => x.id === id); state.unit = 'kcal'; state.targets.kcal = {}; state.preset = id; state.targetsOpen = true;
  P.build(species).forEach((it) => {
    const T = TG.find((x) => x.key === it.key); const b = bounds(T, 'kcal', species); if (!b) return;
    state.targets.kcal[it.key] = { v: clamp(snap(it.v, b.step), b), op: it.op };
  });
}

function targetsHtml(ctx, species) {
  const mode = state.unit; const pet = ctx.pet; const rec = recommendedPreset(pet);
  const preset = PRESETS.find((p) => p.id === state.preset);
  const presets = `<div class="presets"><span class="legend" id="pre-l">Start from a suggestion</span>
    <div class="chips" role="group" aria-labelledby="pre-l">${PRESETS.map((p) => `<button type="button" class="chipbtn chipbtn--toggle" data-preset="${p.id}" aria-pressed="${state.preset === p.id}">${p.label}${rec === p.id ? ' (suggested)' : ''}</button>`).join('')}</div>
    ${preset ? `<div class="notice" role="note">${icon('info')}<div><strong>${preset.label}.</strong> ${esc(preset.why(species))} You can change any number below.</div></div>` : '<span class="hint">One tap fills sensible numbers. Then change any of them.</span>'}</div>`;
  const calories = pet && !energyPlan(pet).hideKcal ? (() => {
    const kb = kcalBounds(pet, goal); const sug = goalPlan(pet, goal).kcal; const cur = goal.kcalOverride ?? sug;
    return `<div class="trow trow--cal"><div class="trow__head"><strong>Daily calories</strong><span class="hint">We suggest ${sug} for ${esc(pet.name)}.${goal.kcalOverride != null ? ' You changed it.' : ''}</span></div>
      <div class="trow__ctl"><input type="range" aria-label="Daily calories slider" min="${kb.lo}" max="${kb.hi}" step="10" value="${cur}" data-kcal-range><input class="input num" id="kcal-in" type="number" inputmode="numeric" aria-label="Daily calories" min="${kb.lo}" max="${kb.hi}" step="10" value="${cur}" data-kcal-num><span class="unit">kcal a day</span></div>
      <div class="hint" id="kcal-msg" aria-live="polite">${goal.kcalOverride != null ? `<button type="button" class="btn btn--ghost btn--small" data-kcal-reset>Use our suggestion (${sug})</button>` : `${kb.safe ? `We will not go below the safe level of ${kb.safe} kcal a day for this goal. ` : ''}Allowed range ${kb.lo} to ${kb.hi}.`}</div></div>`;
  })() : '';
  const rows = TG.filter((T) => tgGet(T, mode)).map((T) => {
    const b = bounds(T, mode, species); if (!b) return '';
    const o = state.targets[mode][T.key]; const on = !!o; const val = on ? o.v : b.mid; const op = on ? o.op : 'about';
    const need = (mode === 'kcal' && T.aafco && ctx.targets?.[T.aafco]?.min != null) ? `${esc(ctx.pet.name)} needs at least ${ctx.targets[T.aafco].min}.` : '';
    return `<div class="trow ${on ? '' : 'is-off'}" data-tkey="${T.key}"><div class="trow__head"><label class="switch"><input type="checkbox" class="tuse" ${on ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><strong>${T.label}</strong></label><span class="hint">${NUTRIENT_HELP[T.key === 'energy' ? 'kcal' : T.key] || ''} ${need}</span></div>
      <div class="trow__ctl"><input type="range" aria-label="${T.label} slider" min="${b.lo}" max="${b.hi}" step="${b.step}" value="${val}" ${on ? '' : 'disabled'} data-trange><input class="input num" type="number" inputmode="decimal" aria-label="${T.label} target" min="${b.lo}" max="${b.hi}" step="${b.step}" value="${val}" ${on ? '' : 'disabled'} data-tnum><span class="unit">${b.unit}</span></div>
      <div class="seg seg--3" role="radiogroup" aria-label="${T.label} rule">${OPS.map(([v, l]) => `<label><input type="radio" name="op-${T.key}" value="${v}" ${op === v ? 'checked' : ''} ${on ? '' : 'disabled'}><span>${l}</span></label>`).join('')}</div>
      <div class="hint" data-thint>${on ? `Allowed range ${b.lo} to ${b.hi}. ${OP_WORD[op][0].toUpperCase() + OP_WORD[op].slice(1)} ${(+val).toFixed(b.dec)}: closest foods come first.` : 'Off. Switch on to aim for a number.'}</div></div>`;
  }).join('');
  return `<div class="stack"><p class="hint" style="margin:0">For owners following a vet's numbers or a diet plan. Foods closest to your numbers come first. Every number is limited to a sensible range, and every food shown already meets your pet's needs.</p>
    ${presets}
    <div class="field"><span class="legend" id="unit-l">Read numbers as</span><div class="seg seg--2" role="radiogroup" aria-labelledby="unit-l">${[['label', '% on the label'], ['kcal', 'Per 1000 kcal']].map(([v, l]) => `<label><input type="radio" name="tunit" value="${v}" ${mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <span class="hint">${mode === 'label' ? 'The percentages printed on the bag (as fed).' : 'A fair way to compare wet and dry foods on the same calories.'}</span></div>
    ${calories}${rows}<button class="btn btn--ghost" type="button" id="tclear">Clear my numbers</button></div>`;
}

function targetScores(foods, species) {
  const act = activeTargets(); const out = new Map(foods.map((f) => [f.id, { score: 1, items: [] }]));
  if (!act.length) return out;
  foods.forEach((f) => { out.get(f.id).score = 0; });
  act.forEach(([key, o]) => {
    const T = TG.find((x) => x.key === key); const b = bounds(T, state.unit, species); if (!b) return; const g = tgGet(T, state.unit); const span = (b.hi - b.lo) / 2 || 1; const tv = o.v;
    foods.forEach((f) => {
      const v = g(f); const r = out.get(f.id);
      if (v == null) { r.items.push({ state: 'na', text: `${T.label}: not reported (${OP_WORD[o.op]} ${(+tv).toFixed(b.dec)})` }); return; }
      const miss = o.op === 'min' ? Math.max(0, tv - v) : o.op === 'max' ? Math.max(0, v - tv) : Math.abs(v - tv);
      r.score += 1 - Math.min(1, miss / span);
      const ok = o.op === 'about' ? miss <= span * 0.1 : miss === 0;
      r.items.push({ state: ok ? 'on' : 'off', text: `${T.label}: ${v.toFixed(b.dec)} ${b.unit === '%' ? '%' : b.unit} (${OP_WORD[o.op]} ${(+tv).toFixed(b.dec)})` });
    });
  });
  out.forEach((r) => { r.score /= act.length; });
  return out;
}

// ---- goal card -------------------------------------------------------------------------------
function defaultGoal(pet, plan) {
  if (lifeStage(pet) === 'growth') return { type: 'grow', targetKg: pet.weightKg, days: 60 };
  if (pet.species === 'dog' && pet.bcs >= 6) return { type: 'lose', targetKg: round(plan.ideal, 1), days: 90 };
  return { type: 'maintain', targetKg: pet.weightKg, days: 90 };
}
function targetFor(type, pet, plan) {
  if (type === 'lose') return round(pet.bcs >= 6 ? plan.ideal : pet.weightKg * 0.9, 1);
  if (type === 'gain') return round(pet.weightKg * 1.1, 1);
  return pet.weightKg;
}

function summary(ctx) {
  const gp = goalPlan(ctx.pet, goal); const kc = kcalFor(ctx.pet);
  const when = gp.days % 30 === 0 ? `${gp.days / 30} month${gp.days === 30 ? '' : 's'}` : `${gp.days} days`;
  const tgt = goal.type === 'grow' ? `expected in ${when}` : goal.type === 'maintain' ? 'about where they are now' : `goal in ${when}`;
  const bb = ctx.pet.species === 'dog' && ctx.pet.breed ? DOG_BREEDS.find((x) => x.name === ctx.pet.breed) : null;
  const odd = bb && lifeStage(ctx.pet) === 'adult' && (goal.type === 'lose' || goal.type === 'gain') && (goal.targetKg < bb.min * 0.9 || goal.targetKg > bb.max * 1.1);
  const breedNote = odd ? `${round(goal.targetKg, 1)} kg is outside the usual range for a ${ctx.pet.breed} (${round(bb.min, 1)} to ${round(bb.max, 1)} kg). Please check with your vet.` : '';
  const warn = gp.pace.state !== 'good' ? `<div class="goalsum__pace">${badge(gp.pace.text, gp.pace.state, gp.pace.state === 'caution' ? 'alert' : 'x')}</div>` : '';
  return `<div class="goalsum__stats"><div class="stat"><div class="stat__value">${kc.toLocaleString('en-US')}</div><div class="stat__label">required calories a day${goal.kcalOverride != null ? ' (your number)' : ''}</div></div><div class="stat"><div class="stat__value">${round(gp.targetKg, 1)} kg</div><div class="stat__label">${tgt}</div></div></div>
    ${warn}${gp.note ? `<p class="hint" style="margin:var(--space-2) 0 0">${esc(gp.note)}</p>` : ''}<p class="hint" style="margin:var(--space-2) 0 0">These calories are approximate. Please check them with your vet before you change what ${esc(ctx.pet.name)} eats.</p>${breedNote ? `<p class="hint" style="margin:var(--space-2) 0 0">${esc(breedNote)}</p>` : ''}`;
}

// The same chart and controls as the Growth tab, tucked in a collapsible section of the goal card.
function chartSection(pet) {
  if (!pet) return '';
  const growth = chartKind(pet) === 'growth';
  return `<details class="disclosure" id="gchart-d" style="margin-top:var(--space-4)" ${state.chartOpen || goalOpen ? 'open' : ''}><summary>${growth ? 'See it on the growth chart' : 'See it on the weight chart'}</summary>
    <div style="padding:var(--space-3) 0">${targetPickerHtml(pet, { intro: 'Tap the chart, or pick a date and weight below. The goal updates as you go.' })}</div></details>`;
}
// Where the picker starts: the goal's own target when it has one.
const pickerFrom = (pet) => (goal && (goal.type === 'lose' || goal.type === 'gain' || (goal.type === 'grow' && goal.custom)) ? { days: goalPlan(pet, goal).days, kg: goalPlan(pet, goal).targetKg } : undefined);
function goalLine(pet) {
  const gp = goalPlan(pet, goal); const g = GOALS.find((x) => x.id === goal.type); const kc = kcalFor(pet);
  const saved = getPet()?.goal ? effectiveGoal(getPet()) : null;
  const date = saved?.targetDate || addDaysStr(todayStr(), gp.days); const left = saved ? saved.daysLeft : gp.days; const dateTxt = `by ${fmtDay(date)} (${left} days left)`;
  const short = goal.type === 'maintain' ? `Keep weight steady ${dateTxt}, ${kc} required calories a day` : goal.type === 'grow' && !goal.custom ? `Expected ${round(gp.targetKg, 1)} kg ${dateTxt}, ${kc} required calories a day` : `${round(saved ? saved.startKg : pet.weightKg, 1)} to ${round(gp.targetKg, 1)} kg ${dateTxt}, ${kc} required calories a day`;
  const pr = saved ? goalProgress(getPet(), saved) : null;
  const prBadge = pr ? (saved.expired ? badge('Goal date reached', 'caution') : badge(pr.text, { on_track: 'good', ahead: 'good', behind: 'caution', no_data: '' }[pr.state])) : '';
  return `<div class="goalline__title"><strong>Goal: ${g.label.toLowerCase()}</strong>${prBadge}${gp.pace.state && gp.pace.state !== 'good' ? badge(gp.pace.text, gp.pace.state) : ''}</div><div class="muted small">${short}</div>`;
}

// Quick details for visitors who are not signed in: enough to rank foods for their pet, nothing is saved.
function quickPanel() {
  return card(`<div class="quick"><h2>Tell us about your pet</h2><p class="muted" style="margin:var(--space-1) 0 var(--space-4)">Nothing is saved until you create an account.</p>
    <form id="qform" class="stack" novalidate>
      ${choiceGroup({ name: 'q-species', legend: 'Dog or cat?', value: 'dog', options: [{ value: 'dog', label: 'Dog', icon: 'paw' }, { value: 'cat', label: 'Cat', icon: 'paw' }] })}
      <div id="q-dog" class="stack">${comboField({ id: 'q-breed', label: 'Breed (leave blank if mixed or not sure)', options: DOG_BREEDS.map((b) => b.name), placeholder: 'Start typing, like Labrador' })}
        ${sizeBlock({ id: 'q-size', label: 'Expected adult size', value: 'IV', options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })) })}</div>
      <div class="grid grid--2">${field({ id: 'q-birth', label: 'Date of birth (or a best guess)', type: 'date', value: '', attrs: 'required' })}
        <div class="input-row">${field({ id: 'q-weight', label: 'Weight', type: 'number', value: '', attrs: 'step="0.1" min="0.1" inputmode="decimal" required' })}${selectField({ id: 'q-unit', label: 'Unit', value: 'kg', options: [{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }] })}</div></div>
      <details class="disclosure"><summary>Any allergies? (optional)</summary><div style="padding:var(--space-3) 0">${choiceGroup({ name: 'q-allergies', legend: 'Pick any that apply', type: 'checkbox', value: [], options: ALLERGENS.map((a) => ({ value: a, label: a[0].toUpperCase() + a.slice(1) })) })}</div></details>
      <div id="q-err" class="error-text" role="alert"></div>
      <div class="row">${button({ label: 'Show foods that fit', type: 'submit', iconName: 'arrow' })}<span class="small muted">or <button class="linkbtn" type="button" data-signup data-then="/new">create a free account</button> to keep a plan</span></div>
    </form></div>`);
}
// Shown while a logged-out visitor is looking at quick details: what this is, and how to keep it.
const quickBanner = (pet) => card(`<div class="savebar"><div><h2>Quick view for your ${esc(pet.breed || pet.species)}</h2><p class="muted">Not saved. Create a free account to keep this plan and track weight over time.</p></div>
  <div class="row">${button({ label: 'Create free account', variant: 'primary btn--small', iconName: 'check', attrs: 'data-signup data-then="/new"' })}<button class="btn btn--ghost btn--small" type="button" id="qedit">Change details</button></div></div>`, { cls: 'card--tight' });

function goalBox(ctx) {
  if (!ctx.pet) return isSignedIn() ? card(`<div class="plancard"><div><h2 style="margin:0 0 var(--space-1)">Search by goal</h2><p class="muted" style="margin:0 0 var(--space-4)">Tell us your pet's weight and what you want to happen. We work out a safe pace, daily calories and the foods that suit.</p>${button({ label: 'Build a profile', href: '/new', iconName: 'arrow' })}</div></div>`) : quickPanel();
  const pet = ctx.pet;
  if (!goalOpen) {
    return card(`<div class="goalbar"><div id="goalline">${goalLine(pet)}</div><div class="goalbar__actions">${getPet() ? `<button class="btn btn--secondary btn--small" type="button" data-quick-weight>${icon('plus')}<span>Weight</span></button>` : ''}${goalsFor(pet).length > 1 ? '<button class="btn btn--secondary btn--small" type="button" id="gedit"><span>Change</span></button>' : ''}</div></div>${chartSection(pet)}`, { cls: 'goalcard' });
  }
  return card(`<h2 id="goal-h" style="margin:0 0 var(--space-2);font-size:var(--text-lg)">Set a goal for ${esc(pet.name)}</h2>
    <p class="muted small" style="margin:0 0 var(--space-3)">Drag on the chart, or pick a date and weight under it. A lower weight than now is a weight-loss goal, a higher one is weight gain, and the same is keeping steady.</p>
    <div class="goalsum" id="goalsum" aria-live="polite">${summary(ctx)}</div>
    ${chartSection(pet)}
    <div style="margin-top:var(--space-3)">${button({ label: 'Done', variant: 'dark btn--small', iconName: 'check', attrs: 'id="gdone"' })}</div>`, { cls: 'goalcard' });
}

const PAGE = 12; let shown = PAGE; // results are shown a page at a time so a phone is not scrolling through the whole catalogue
// ---- results ---------------------------------------------------------------------------------
function results(ctx) {
  const species = state.species || ctx.pet?.species || 'dog';
  let foods = listFoods().filter((f) => f.species === species && (state.stage !== 'growth' || ['growth', 'all'].includes(f.lifeStage)));
  foods = foods.filter((f) => [...state.quick].every((id) => QUICK.find((q) => q.id === id).test(f, ctx)));
  if (ctx.pet && state.hideAllergy) foods = foods.filter((f) => !allergenHits(f, ctx.pet).length);
  foods = foods.filter((f) => [...state.needs].every((id) => NEEDS.find((n) => n.id === id).test(f)));
  if (!state.include) foods = foods.filter((f) => activeTargets().every(([key]) => { const T = TG.find((x) => x.key === key); return tgGet(T, state.unit)(f) != null; }));
  const fit = (f) => (ctx.pet ? ORDER[foodFit(f, ctx.pet, ctx.plan, ctx.targets).verdict] : 0);
  const match = new Map();
  if (ctx.pet && goal) foods.forEach((f) => match.set(f.id, goalMatch(f, goal.type, ctx.goalKcal)));
  const pri = priorityScores(foods, ctx); const tsc = targetScores(foods, species); const hasT = activeTargets().length > 0;
  const gs = [...match.values()].map((m) => m.score); const gmin = Math.min(...gs, 0); const gmax = Math.max(...gs, 1);
  const total = (f) => (pri.get(f.id)?.score ?? 0) + 0.5 * (match.has(f.id) ? (match.get(f.id).score - gmin) / ((gmax - gmin) || 1) : 0) + (hasT ? 2 * tsc.get(f.id).score : 0);
  foods.sort((a, b) => {
    if (state.sort === 'rating') return b.rating - a.rating;
    if (state.sort === 'price') return (costPerDay(a, ctx.goalKcal || 1000) ?? 99) - (costPerDay(b, ctx.goalKcal || 1000) ?? 99);
    return fit(a) - fit(b) || total(b) - total(a) || b.rating - a.rating;
  });
  foods.forEach((f) => { const m = match.get(f.id) || { score: 0, reasons: [] }; m.reasons = [...pri.get(f.id).reasons, ...m.reasons].slice(0, 3); m.targets = hasT ? tsc.get(f.id).items : []; match.set(f.id, m); });
  if (state.sort === 'fit' && (goal || state.priority.size || hasT)) foods.filter((f) => fit(f) === 0).slice(0, 2).forEach((f) => { (match.get(f.id) || (match.set(f.id, { reasons: [], targets: [] }), match.get(f.id))).top = true; });
  ctx.match = match;
  const goalLabel = goal ? GOALS.find((g) => g.id === goal.type).label.toLowerCase() : '';
  const extra = [state.priority.size ? 'your priorities' : '', hasT ? 'your numbers' : ''].filter(Boolean).join(' and ');
  return foods.length
    ? `<h2 class="sr-only">Results</h2><p class="muted small" aria-live="polite">${foods.length} food${foods.length === 1 ? '' : 's'}${ctx.pet ? ` for ${esc(ctx.pet.name)}${goal ? `, ranked to ${goalLabel}${extra ? ` and ${extra}` : ''}` : ''}` : ''}</p><div class="grid grid--auto">${foods.slice(0, shown).map((f) => foodCard(f, ctx)).join('')}</div>${foods.length > shown ? `<button class="btn btn--secondary btn--block" type="button" data-more>Show ${Math.min(PAGE, foods.length - shown)} more (${shown} of ${foods.length})</button>` : ''}`
    : emptyState({ img: (ctx.pet?.species === 'cat' || state.species === 'cat') ? 'cut-cat' : 'cut-beagle', title: 'No foods match, yet', text: 'Try removing a filter, or turn on "include foods that do not report a nutrient" in More filters.' });
}

function needsHtml(pet) {
  const sug = suggestedNeeds(pet);
  const al = pet?.allergies || [];
  return `<section class="narrow" aria-labelledby="need-h" style="margin-top:var(--space-3)"><h2 id="need-h" class="item-title" style="margin:0 0 var(--space-1)">Special needs</h2>
  <p class="muted small" style="margin:0 0 var(--space-2)">Only foods that include them.</p>
  <div class="chips" role="group" aria-label="Extras">${NEEDS.map((n) => `<button type="button" class="chipbtn chipbtn--toggle" data-need="${n.id}" aria-pressed="${state.needs.has(n.id)}" title="${esc(n.help)}">${n.label}${sug.includes(n.id) ? ' <span class="badge badge--info">Suggested</span>' : ''}</button>`).join('')}</div></section>
  ${pet ? `<section class="narrow" aria-labelledby="alg-h" style="margin-top:var(--space-3)"><h2 id="alg-h" class="item-title" style="margin:0 0 var(--space-1)">Anything they should avoid?</h2>
  ${al.length ? `<div class="chips">${al.map((a) => `<span class="badge badge--bad">${esc(a)}</span>`).join('')}</div>
  <label class="switch" style="margin-top:var(--space-3)"><input type="checkbox" id="hide-al" ${state.hideAllergy ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Hide foods that contain them (from ${esc(pet.name)}'s profile)</span></label>`
    : `<p class="muted small" style="margin:0">None listed for ${esc(pet.name)}. <a href="/pet/profile">Add allergies in the profile</a> and we hide those foods.</p>`}</section>` : ''}`;
}
function syncMoreBadge() {
  const s = document.querySelector('#more-opts > summary'); if (!s) return;
  s.querySelector('.badge')?.remove();
  const n = state.needs.size + (state.targetsOpen && activeTargets().length ? 1 : 0);
  if (n) s.firstChild.after(Object.assign(document.createElement('span'), { className: 'badge badge--info', textContent: `${n} on` }));
}
const hasPrices = () => listFoods().some((x) => x.pricePerKg);
const chipsHtml = (pet, ctx, species) => {
  const moreOpen = state.moreOpen || state.needs.size > 0 || state.targetsOpen;
  const active = state.needs.size + (state.targetsOpen && activeTargets().length ? 1 : 0);
  return `<section aria-labelledby="pri-h" class="prio"><div class="row row--between"><h2 id="pri-h" class="item-title" style="margin:0">What matters most?</h2><span class="small muted" id="pri-count" aria-live="polite">${state.priority.size} of ${MAX_PRIORITIES} chosen</span></div>
  <div class="chips" role="group" aria-label="Priorities" style="margin-top:var(--space-2)">${PRIORITIES.filter((p) => p.id !== 'cost' || hasPrices()).map((p) => `<button type="button" class="chipbtn chipbtn--toggle" data-pri="${p.id}" aria-pressed="${state.priority.has(p.id)}">${p.label}</button>`).join('')}</div>
  <div class="chips quick" role="group" aria-label="Narrow down" style="margin-top:var(--space-2)">${QUICK.filter((q) => q.id !== 'budget' || hasPrices()).map((q) => `<button type="button" class="chipbtn chipbtn--toggle" data-quick="${q.id}" aria-pressed="${state.quick.has(q.id)}">${q.label}</button>`).join('')}</div></section>
  <details class="disclosure more-opts" id="more-opts" style="margin-top:var(--space-3)" ${moreOpen ? 'open' : ''}><summary>More options${active ? ` <span class="badge badge--info">${active} on</span>` : ''} <span class="muted small">special needs, allergies, your own numbers</span></summary>
    <div class="more-opts__body">${needsHtml(pet)}
    <details class="disclosure targets" id="targets" style="margin-top:var(--space-3)" ${state.targetsOpen ? 'open' : ''}><summary>Set your own numbers (optional)</summary><div id="targets-body" style="padding:var(--space-3) 0">${targetsHtml(ctx, species)}</div></details>
    <details class="disclosure" style="margin-top:var(--space-2)"><summary>What do these mean?</summary><ul class="help">
    <li><strong>High protein.</strong> ${NUTRIENT_HELP.protein}</li><li><strong>Lean.</strong> Less fat per calorie, a good fit for pets that gain weight easily.</li><li><strong>Fibre-rich.</strong> ${NUTRIENT_HELP.fibre}</li><li><strong>Lighter food / Small portions.</strong> Foods with fewer calories per gram need bigger portions, and rich foods need smaller ones.</li>
    <li><strong>Calcium, phosphorus and the rest.</strong> We check these against your pet's needs for you, so you never have to choose them.</li></ul></details></div></details>`;
};

export function render() {
  if (location.search) { const q = new URLSearchParams(location.search); state.species = q.get('species') || state.species; state.stage = q.get('stage'); }
  const ctx = makeCtx();
  if (ctx.pet) { goal = ctx.pet.goal && goalsFor(ctx.pet).some((g) => g.id === ctx.pet.goal.type) ? { ...effectiveGoal(ctx.pet) } : defaultGoal(ctx.pet, ctx.plan); ctx.goalKcal = kcalFor(ctx.pet); } else goal = null;
  goalOpen = !ctx.pet; // with a pet the goal starts as a slim bar; "Change goal" opens the form
  state.chartOpen = false; // the goal chart always starts collapsed; tapping its heading opens it
  const species = state.species || ctx.pet?.species || 'dog';
  state.targetsOpen = state.targetsOpen || activeTargets().length > 0 || goal?.kcalOverride != null;
  return {
    title: 'Dog & Cat Food Compared by Fit and Cost per Day',
    html: `${pageHead('Find their food')}<div class="page">${expNote()}
      <div id="goalbox" style="margin-bottom:var(--space-4)">${goalBox(ctx)}</div>
      ${ctx.pet && !getPet() ? `<div style="margin-bottom:var(--space-4)">${quickBanner(ctx.pet)}</div>` : ''}
      ${chipsHtml(ctx.pet, ctx, species)}
      <button class="btn btn--secondary filters-toggle" id="ft" type="button" aria-expanded="false" style="margin:var(--space-5) 0">${icon('filter')}<span>More filters</span></button>
      <div class="split split--filters" style="margin-top:var(--space-5)">
        <div class="filters-backdrop" id="fbd"></div><aside class="filters card" id="filters" aria-label="More filters"><form class="stack" id="ff">
          <h2 class="item-title" style="margin-bottom:0">More filters</h2>
          <div class="field"><label for="sp">Species</label><select class="select" id="sp"><option value="dog" ${species === 'dog' ? 'selected' : ''}>Dog</option><option value="cat" ${species === 'cat' ? 'selected' : ''}>Cat</option></select></div>
          <div class="field"><label for="so">Sort by</label><select class="select" id="so">${[['fit', 'Best match'], ['rating', 'Top rated'], ...(hasPrices() ? [['price', 'Lowest cost per day']] : [])].map(([v, l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <label class="switch"><input type="checkbox" id="inc" ${state.include ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Include foods that do not report a nutrient you asked for</span></label>
          <button class="btn btn--ghost" type="button" id="clr">Clear everything</button>
          <button class="btn btn--primary btn--block filters__done" type="button" id="fdone">Show foods</button>
        </form></aside>
        <div id="res" class="stack">${results(ctx)}</div>
      </div></div>`,
    mount(root, rerender) {
      mountCombos(root);
      root.querySelector('#qedit')?.addEventListener('click', () => { setQuickPet(null); rerender(); });
      const qf = root.querySelector('#qform');
      if (qf) {
        bindBreedSize(root, { breedId: 'q-breed', sizeId: 'q-size', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
        const dog = root.querySelector('#q-dog');
        qf.addEventListener('change', () => { dog.hidden = new FormData(qf).get('q-species') === 'cat'; });
        qf.addEventListener('submit', (e) => {
          e.preventDefault(); const d = new FormData(qf); const err = root.querySelector('#q-err');
          const species = d.get('q-species') || 'dog'; const birth = String(d.get('q-birth') || ''); const w = Number(d.get('q-weight'));
          const today = new Date().toISOString().slice(0, 10); const old = new Date(); old.setFullYear(old.getFullYear() - 30);
          if (!birth) { err.textContent = 'Add a date of birth. A best guess is fine.'; return; }
          if (birth > today) { err.textContent = 'Date of birth cannot be in the future.'; return; }
          if (birth < old.toISOString().slice(0, 10)) { err.textContent = 'That looks too long ago. Please check the date.'; return; }
          if (!(w > 0)) { err.textContent = 'Add their weight so we can size portions.'; return; }
          const kg = d.get('q-unit') === 'lb' ? lbToKg(w) : w;
          const breed = species === 'dog' ? String(d.get('q-breed') || '').trim() : '';
          const sizeCat = breedSize(breed)?.size || String(d.get('q-size') || 'IV');
          const wc = weightCheck({ species, name: 'your pet', breed, sizeCat, birth }, kg); if (!wc.ok) { err.textContent = wc.message; return; }
          setQuickPet({ species, name: 'your pet', breed, sizeCat, birth, sex: 'unknown', neutered: true, weightKg: Math.round(kg * 100) / 100, bcs: 5, activity: 'normal', allergies: d.getAll('q-allergies'), health: [], answered: {}, logs: [{ on: today, kg, bcs: 5 }], quick: true });
          rerender();
        });
      }
      let pickerNode = null;
      bindQuickWeight(root, rerender);
      let keepPage = false;
      const upd = () => { if (!keepPage) shown = PAGE; keepPage = false; root.querySelector('#res').innerHTML = results(withKcal(makeCtx())); };
      root.querySelector('#res').addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { shown += PAGE; keepPage = true; upd(); } });
      const species$ = () => state.species || curPet()?.species || 'dog';
      const save = () => {
        if (!getPet()) return; const before = getGoalHistory().length;
        setGoal({ type: goal.type, targetKg: goal.targetKg, days: goal.days, custom: goal.custom, fromChart: goal.fromChart, kcalOverride: goal.kcalOverride });
        if (getGoalHistory().length > before) toast('Goal changed. Your previous goal is kept in your goal history.');
      };
      const drawTargets = () => { root.querySelector('#targets-body').innerHTML = targetsHtml(withKcal(makeCtx()), species$()); };
      const bindGoal = () => {
        const c = makeCtx();
        const redraw = () => { root.querySelector('#goalbox').innerHTML = goalBox({ ...c, goalKcal: kcalFor(c.pet) }); bindGoal(); };
        root.querySelector('#gedit')?.addEventListener('click', () => { goalOpen = true; redraw(); });
        root.querySelector('#gdone')?.addEventListener('click', () => { goalOpen = false; state.chartOpen = false; if (pickerNode) pickerNode.open = false; save(); redraw(); root.querySelector('#res').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        const gd = root.querySelector('#gchart-d');
        if (gd && c.pet) {
          const pet = c.pet; const growth = chartKind(pet) === 'growth';
          if (pickerNode) { gd.replaceWith(pickerNode); pickerNode.open = goalOpen || state.chartOpen; if (goalOpen) state.chartOpen = true; } // keep the live chart so a slider drag is never interrupted; opening the goal always shows it
          else {
            const start = () => {
              if (pickerNode) return; pickerNode = gd;
              mountTargetPicker(gd.querySelector('.tpick'), pet, {
                from: pickerFrom(pet),
                onClamp: (b) => toast(`Kept within ${b.lo} to ${b.hi} kg`),
                onChange: (d) => {
                  const before = goal.type; let type = 'grow';
                  if (!growth) { const kg = d.kg; type = kg < pet.weightKg - 0.05 ? 'lose' : kg > pet.weightKg + 0.05 ? 'gain' : 'maintain'; }
                  goal = growth ? { type: 'grow', targetKg: d.kg, days: d.days, custom: true, fromChart: true } : { type, targetKg: d.kg, days: d.days, fromChart: true };
                  save(); upd();
                  if (type !== before) { if (!growth) toast(`Switched to ${GOALS.find((g) => g.id === type).label.toLowerCase()}`); if (goalOpen) { redraw(); return; } }
                  const cc = makeCtx(); cc.goalKcal = kcalFor(cc.pet);
                  const line = root.querySelector('#goalline'); if (line) line.innerHTML = goalLine(cc.pet);
                  const sum = root.querySelector('#goalsum'); if (sum) sum.innerHTML = summary(cc);
                  const tin = root.querySelector('#target'); if (tin) tin.value = goal.targetKg;
                  const din = root.querySelector('#days'); if (din) { if (![...din.options].some((o) => o.value === String(goal.days))) din.add(new Option(`${goal.days} days`, goal.days)); din.value = goal.days; }
                  drawTargets();
                },
              });
            };
            gd.addEventListener('toggle', () => { state.chartOpen = gd.open; if (gd.open) start(); });
            if (gd.open) start();
          }
        }
        const form = root.querySelector('#goalform'); if (!form) return;
        const refresh = () => { c.goalKcal = kcalFor(c.pet); root.querySelector('#goalsum').innerHTML = summary(c); save(); drawTargets(); upd(); };
        form.addEventListener('change', (e) => {
          if (e.target.name === 'goal') {
            goal = { type: e.target.value, targetKg: targetFor(e.target.value, c.pet, c.plan), days: goal.days || 90 };
            save(); redraw(); drawTargets(); upd();
          } else if (e.target.id === 'days') { goal.days = Number(e.target.value); if (goal.type === 'grow') { delete goal.custom; delete goal.fromChart; } refresh(); }
        });
        form.addEventListener('input', (e) => { if (e.target.id === 'target') { const v = parseFloat(e.target.value); if (v > 0) { goal.targetKg = v; refresh(); } } });
        root.querySelector('#suggest')?.addEventListener('click', () => { goal.days = suggestDays(c.pet, goal.targetKg); save(); redraw(); drawTargets(); upd(); });
      };
      bindGoal();

      // your own numbers (event delegation so the panel can redraw freely)
      const tbody = root.querySelector('#targets-body');
      const hint = (row, T) => { const o = state.targets[state.unit][T.key]; const b = bounds(T, state.unit, species$()); if (o) row.querySelector('[data-thint]').textContent = `Allowed range ${b.lo} to ${b.hi}. ${OP_WORD[o.op][0].toUpperCase() + OP_WORD[o.op].slice(1)} ${(+o.v).toFixed(b.dec)}: closest foods come first.`; };
      const usePreset = (id) => { applyPreset(id, species$()); root.querySelector('#more-opts').open = true; root.querySelector('#targets').open = true; drawTargets(); upd(); toast('Suggested numbers applied. Change any you like.'); };
      root.querySelector('#targets').addEventListener('toggle', (e) => { state.targetsOpen = e.target.open; });
      root.querySelector('#more-opts').addEventListener('toggle', (e) => { if (e.target.id === 'more-opts') state.moreOpen = e.target.open; });
      tbody.addEventListener('change', (e) => {
        const t = e.target; const row = t.closest('[data-tkey]');
        if (t.name === 'tunit') { state.unit = t.value; state.preset = null; drawTargets(); upd(); return; }
        if (/^op-/.test(t.name || '') && row) { state.targets[state.unit][row.dataset.tkey].op = t.value; state.preset = state.preset; hint(row, TG.find((x) => x.key === row.dataset.tkey)); upd(); return; }
        if (t.matches('.tuse') && row) {
          const T = TG.find((x) => x.key === row.dataset.tkey); const b = bounds(T, state.unit, species$());
          if (t.checked) {
            const need = curPet() && T.aafco && state.unit === 'kcal' ? nutrientTargets(curPet())[T.aafco]?.min : null;
            state.targets[state.unit][T.key] = { v: clamp(need != null ? Math.max(b.mid, snap(need * 1.1, b.step)) : b.mid, b), op: 'about' };
          } else delete state.targets[state.unit][T.key];
          drawTargets(); upd(); return;
        }
        if (t.matches('[data-tnum]') && row) { // clamp on commit, say so
          const T = TG.find((x) => x.key === row.dataset.tkey); const b = bounds(T, state.unit, species$()); let v = parseFloat(t.value);
          if (!Number.isFinite(v)) v = b.mid; const c = clamp(v, b); if (c !== v) toast(`Kept within ${b.lo} to ${b.hi}`);
          state.targets[state.unit][T.key].v = snap(c, b.step); drawTargets(); upd(); return;
        }
        if (t.matches('[data-kcal-num]')) {
          const c = makeCtx(); const kb = kcalBounds(c.pet, goal); let v = parseFloat(t.value); if (!Number.isFinite(v)) v = goalPlan(c.pet, goal).kcal;
          const k = Math.min(kb.hi, Math.max(kb.lo, Math.round(v))); if (k !== Math.round(v)) toast(kb.safe && Math.round(v) < kb.lo ? `Not below the safe level of ${kb.safe} calories a day` : `Kept within ${kb.lo} to ${kb.hi} calories a day`);
          goal.kcalOverride = k; save(); drawTargets(); root.querySelector('#goalsum') && (root.querySelector('#goalsum').innerHTML = summary(withKcal(makeCtx()))); upd();
        }
      });
      tbody.addEventListener('input', (e) => {
        const t = e.target; const row = t.closest('[data-tkey]');
        if (t.matches('[data-trange]') && row) { // slider is always in bounds
          const T = TG.find((x) => x.key === row.dataset.tkey); row.querySelector('[data-tnum]').value = t.value;
          state.targets[state.unit][T.key].v = parseFloat(t.value); hint(row, T); upd();
        } else if (t.matches('[data-kcal-range]')) {
          document.querySelector('#kcal-in').value = t.value; goal.kcalOverride = Math.round(+t.value); save(); root.querySelector('#goalsum') && (root.querySelector('#goalsum').innerHTML = summary(withKcal(makeCtx()))); upd();
        }
      });
      tbody.addEventListener('click', (e) => {
        const pb = e.target.closest('[data-preset]'); if (pb) { usePreset(pb.dataset.preset); return; }
        if (e.target.closest('#tclear')) { state.targets = { label: {}, kcal: {} }; state.preset = null; drawTargets(); upd(); }
        if (e.target.closest('[data-kcal-reset]')) { delete goal.kcalOverride; save(); drawTargets(); root.querySelector('#goalsum') && (root.querySelector('#goalsum').innerHTML = summary(withKcal(makeCtx()))); upd(); }
      });
      root.querySelector('#goalbox').addEventListener('click', (e) => { if (e.target.closest('#gpreset')) { const id = recommendedPreset(curPet()); if (id) { usePreset(id); root.querySelector('#targets').scrollIntoView({ behavior: 'smooth', block: 'start' }); } } });

      root.querySelectorAll('[data-pri]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.pri;
        if (state.priority.has(id)) state.priority.delete(id);
        else if (state.priority.size >= MAX_PRIORITIES) { toast('Pick up to two. Tap one to remove it first.'); return; }
        else state.priority.add(id);
        b.setAttribute('aria-pressed', state.priority.has(id)); root.querySelector('#pri-count').textContent = `${state.priority.size} of ${MAX_PRIORITIES} chosen`; upd();
      }));
      root.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.quick; const opp = id === 'dry' ? 'wet' : id === 'wet' ? 'dry' : null;
        if (state.quick.has(id)) state.quick.delete(id); else { state.quick.add(id); if (opp) { state.quick.delete(opp); root.querySelector(`[data-quick="${opp}"]`).setAttribute('aria-pressed', 'false'); } }
        b.setAttribute('aria-pressed', state.quick.has(id)); upd();
      }));
      root.querySelectorAll('[data-need]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.need; if (state.needs.has(id)) state.needs.delete(id); else state.needs.add(id); b.setAttribute('aria-pressed', state.needs.has(id)); syncMoreBadge(); upd(); }));
      root.querySelector('#hide-al')?.addEventListener('change', (e) => { state.hideAllergy = e.target.checked; upd(); });
      const setOpen = (o) => { root.querySelector('#filters').classList.toggle('is-open', o); document.body.classList.toggle('filters-open', o); root.querySelector('#ft').setAttribute('aria-expanded', o); };
      root.querySelector('#ft').addEventListener('click', () => setOpen(!root.querySelector('#filters').classList.contains('is-open')));
      root.querySelector('#fdone').addEventListener('click', () => setOpen(false));
      root.querySelector('#fbd').addEventListener('click', () => setOpen(false));
      root.querySelector('#sp').addEventListener('change', (e) => { state.species = e.target.value; state.targets = { label: {}, kcal: {} }; state.preset = null; rerender(); });
      root.querySelector('#so').addEventListener('change', (e) => { state.sort = e.target.value; upd(); });
      root.querySelector('#inc').addEventListener('change', (e) => { state.include = e.target.checked; upd(); });
      root.querySelector('#clr').addEventListener('click', () => { state.targets = { label: {}, kcal: {} }; state.preset = null; state.quick = new Set(); state.priority = new Set(); state.needs = new Set(); state.hideAllergy = true; state.include = true; if (goal) { delete goal.kcalOverride; save(); } rerender(); });
    },
  };
}
