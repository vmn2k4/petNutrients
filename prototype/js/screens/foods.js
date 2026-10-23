import { getRegion, REGIONS, listFoods, getPet, updatePet, isSignedIn, getQuickPet, setQuickPet, setGoal, getGoalHistory, listTreats, listSupplements, listReviews } from '../store.js';
import { calc, calcMany } from '../calc.js';
import { round, lbToKg, fmtDay, todayStr, addDaysStr } from '../format.js';
import { NUTRIENT_HELP, GOALS, ALLERGENS, SIZE_CATEGORIES, breedSize, DOG_BREEDS } from '../reference.js';
import { KCAL_NOTE, foodPic, card, badge, verdictBadge, verdictBanner, stars, button, icon, esc, pageHead, emptyState, choiceGroup, selectField, field, expNote, comboField, mountCombos, sizeBlock, bindBreedSize, notice, rootOn } from '../ui.js';
import { toast, openSheet } from '../sheet.js';
import { openAddItem } from '../diet.js';
import { bindQuickWeight } from '../quickweight.js';
import { bindFields } from '../components/petfields.js';
import { targetPickerHtml, mountTargetPicker } from '../targetpicker.js';

const VERDICT_TEXT = { good: 'Meets targets', caution: 'Check details', bad: 'Not a fit' };
const DAYS = [30, 60, 90, 120, 180, 270, 365];
const fmt = (n, d = 1) => (n == null ? 'not reported' : n.toFixed(d));

// `c` holds the numbers calc worked out for this food and pet (rankFoods): fit, daily amount and cost, nutrients per 1000 kcal, the maker's table, goal match.
export function foodCard(food, c) {
  const fit = c.fit; const kcal = c.kcal;
  const g = c.grams; const cost = c.cost; const p = c.protein; const f = c.fat;
  const m = c.match;
  const inner = `
    <div class="fc__img">${foodPic(food)}</div>
    <div class="row row--between">${fit ? verdictBadge(fit.verdict, VERDICT_TEXT[fit.verdict]) : badge(isSignedIn() ? 'Create a profile for fit' : 'Add your pet for fit')}${m?.top ? badge('Top pick for this goal', 'good', 'star') : badge(food.format, 'info')}</div>
    <h3 class="card__title" style="margin-top:var(--space-3)">${esc(food.name)}</h3>
    <p class="muted small" style="margin:0">${esc(food.brand)}, ${food.species}</p>
    <div class="row" style="margin:var(--space-3) 0">${food.reviews ? `${stars(food.rating)}<span class="small muted">${food.rating} (${food.reviews}), ${food.rebuy}% would rebuy</span>` : '<span class="small muted">No reviews yet</span>'}</div>
    ${m?.reasons?.length ? `<ul class="reasons">${m.reasons.map((r) => `<li>${icon('check')}<span>${esc(r)}</span></li>`).join('')}</ul>` : ''}
    ${m?.targets?.length ? `<ul class="tmatch" aria-label="Compared with your numbers">${m.targets.map((t) => `<li class="tmatch--${t.state}">${icon(t.state === 'on' ? 'check' : t.state === 'na' ? 'help' : 'info')}<span>${esc(t.text)}</span></li>`).join('')}</ul>` : ''}
    <dl class="fstats">${(() => {
      // grams in the pet's daily bowl; with no pet, in a 1,000 kcal day (about a 20 kg dog), with the grams of food that is
      const ref = kcal || 1000; const grams = food.kcalPerKg ? c.gramsRef : null; const k = ref / 1000;
      const tail = kcal ? 'in the daily bowl' : 'in a 1,000 kcal day';
      const amt = (v) => (v == null ? 'not reported' : `<strong>${Math.round(v * k)} g</strong>`);
      const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
      return `${row('Protein', amt(p))}${row('Fat', amt(f))}${grams ? row(kcal ? 'Food per day' : 'Food for that', `<strong>${Math.round(grams)} g</strong>`) : ''}${food.kcalPerKg ? row('Energy', `<strong>${Math.round(food.kcalPerKg / 10)}</strong> kcal/100 g`) : ''}${cost ? row('Cost', `<strong>$${cost.toFixed(2)}</strong>/day`) : ''}<p class="fstats__note">Protein and fat ${tail}.</p>`;
    })()}</dl>
    ${(() => { const bg = c.guide; const petKg = c.petKg;
      return bg && !bg.covers ? `<p class="small muted" style="margin:var(--space-2) 0 0">The maker's table (${esc(bg.row.weight_label)}) does not cover ${Math.round(petKg * 10) / 10} kg. Check the bag.</p>` : bg ? `<p class="small" style="margin:var(--space-2) 0 0"><span class="muted">Maker's guide for ${esc(bg.row.weight_label)}:</span> <strong>${bg.grams ? `${Math.round(bg.grams[0])}${bg.grams[1] !== bg.grams[0] ? ` to ${Math.round(bg.grams[1])}` : ''} g a day` : esc(bg.text)}</strong></p>` : ''; })()}
    ${fit && fit.warn.length ? `<p class="small" style="margin:var(--space-3) 0 0;color:var(--color-${fit.warn[0].level === 'bad' ? 'bad' : 'caution'})">${icon(fit.warn[0].level === 'bad' ? 'x' : 'alert')} ${esc(fit.warn[0].text)}</p>` : ''}
  `;
  const buy = food.buyUrl ? `<a class="fc__buy" href="${esc(food.buyUrl)}" target="_blank" rel="noopener noreferrer sponsored">${icon('cart')}<span>${food.buyType === 'search' ? 'Search at' : 'Buy at'} ${esc(food.buyRetailer || 'a retailer')}</span></a>` : '';
  const addb = `<button type="button" class="btn btn--primary btn--small btn--block" ${isSignedIn() ? `data-fadd="${food.id}"` : 'data-signup data-then="/foods"'}>${icon('plus')}<span>${isSignedIn() ? 'Add to diet' : 'Sign up to add to diet'}</span></button>`;
  return `<div class="fcwrap">${card(inner, { href: `/food/${food.id}` })}${addb}${buy}</div>`;
}

// The pet this page works with: the saved profile, or a logged-out visitor's quick details (this tab only).
const curPet = () => getPet() || getQuickPet();
// What calc worked out for the page, loaded when it renders and refreshed when the goal changes:
let gview = null; // the pet's growth view (the goal chart reads it)
let gv = null;    // the goal view: plan, targets, the goal's plan and calories, and the numbers around it
let tv = null;    // the "your own numbers" view for the species shown: bounds and suggested numbers
let goal = null;  // {type, targetKg, days, kcalOverride?} for the current pet
export const makeCtx = () => ({ pet: curPet(), plan: gv?.plan || null, targets: gv?.targets || null, goalKcal: gv && goal ? gv.kcal : null });
async function loadGoal() { const pet = curPet(); gv = pet ? await calc('goalView', pet, goal) : null; }
async function loadTargets(species) { tv = await calc('targetsView', species); }

// ---- state ------------------------------------------------------------------------------------
const state = { kind: 'food', xq: '', xsort: 'budget', xtype: 'all', xhide: true, xshown: 48, species: null, stage: null, include: true, sort: 'fit', quick: new Set(), priority: new Set(), unit: 'kcal', targets: { label: {}, kcal: {} }, targetsOpen: false, moreOpen: false, preset: null, chartOpen: false, needs: new Set(), hideAllergy: true };
let goalOpen = true; // open while choosing; collapses to one line so the foods are visible
const kcalFor = () => gv.kcal; // calc keeps an old override from going below the safe level
const withKcal = (c) => c;

// ---- quick narrowing and priorities (the labels; calc does the filtering and scoring) -------------
const QUICK = [{ id: 'dry', label: 'Dry food' }, { id: 'wet', label: 'Wet food' }, { id: 'kcal', label: 'Calories on label' }, { id: 'budget', label: 'Under $2 a day' }];
// Extras the owner can ask for. These are filters ("must contain"), matched on ingredients or the declared extras.
const NEEDS = [
  { id: 'joints', label: 'Joints (glucosamine, chondroitin)', help: 'Often chosen for older, large or heavier pets.' },
  { id: 'collagen', label: 'Collagen', help: 'Skin, coat and joint support. Evidence is limited.' },
  { id: 'omega3', label: 'Omega-3 (skin and coat)', help: 'From fish oil, oily fish or flaxseed.' },
  { id: 'probiotics', label: 'Probiotics (gut)', help: 'Live cultures added for digestion.' },
  { id: 'antioxidants', label: 'Antioxidants (vitamins E, C)', help: 'Added vitamins and plant antioxidants.' },
];
const suggestedNeeds = () => gv?.needs || [];
// Priorities rank foods instead of hiding them. Picking at most two forces a trade-off, so "everything highest" is impossible.
const MAX_PRIORITIES = 2;
const PRIORITIES = [
  { id: 'cost', label: 'Lower cost' }, { id: 'protein', label: 'High protein' }, { id: 'lean', label: 'Lean (less fat)' },
  { id: 'fibre', label: 'Fibre-rich' }, { id: 'lighter', label: 'Lighter food' }, { id: 'small', label: 'Small portions' },
];

// ---- your own numbers: bounded sliders, closest foods first ----------------------------------
// Two ways to read a number: "% on the label" (as printed on the bag) or "per 1000 kcal" (fair comparison). calc owns the bounds and suggestions.
const TG = [
  { key: 'protein', label: 'Protein', aafco: 'Crude Protein' }, { key: 'fat', label: 'Fat', aafco: 'Crude Fat' }, { key: 'fibre', label: 'Fibre' },
  { key: 'moisture', label: 'Moisture (water)', labelOnly: true }, { key: 'calcium', label: 'Calcium', aafco: 'Calcium' }, { key: 'phosphorus', label: 'Phosphorus', aafco: 'Phosphorus' },
  { key: 'energy', label: 'Calories in the food' },
];
const snap = (v, step) => Math.round(v / step) * step;
// Bounds come from what is actually on offer (calc reads the catalogue), so a number can never be impossible.
const bounds = (T, mode) => tv?.bounds[mode][T.key] || null;
const clamp = (v, b) => Math.min(b.hi, Math.max(b.lo, v));
// Numbers are stored per 1,000 kcal (how foods are compared fairly) but shown as grams a day for this pet: scale by daily calories / 1,000.
const factorFor = (T, c) => (T.key === 'energy' ? 1 : dayFactor(c)); // calories in a food stay kcal per 100 g
const dayFactor = (c) => { const k = c?.goalKcal || c?.plan?.kcal; return k > 0 ? k / 1000 : 1; };
// the bounds as the owner sees them in the current reading
function shownBounds(b, mode, F) {
  if (mode !== 'kcal' || F === 1) return { lo: b.lo, hi: b.hi, step: b.step, dec: b.dec, unit: b.unit, F: 1 };
  const r = (v) => Math.round(v * F * 10) / 10;
  return { lo: r(b.lo), hi: r(b.hi), step: b.step >= 1 ? 1 : 0.1, dec: 1, unit: 'g a day', F };
}
const activeTargets = () => Object.entries(state.targets[state.unit]).filter(([, o]) => o && o.v != null);
const OPS = [['about', 'About'], ['min', 'At least'], ['max', 'At most']];
const OP_WORD = { about: 'you want', min: 'at least', max: 'at most' };

// ---- suggestion presets (the explanations; calc works out the numbers) ---------------------------
const PRESETS = [
  { id: 'lose', label: 'Weight loss', why: (s) => `Calories follow AAFCO's limit for "light" foods (${s === 'cat' ? '325' : '310'} kcal per 100 g, or ${s === 'cat' ? '3,250' : '3,100'} per kg, for dry food). ${s === 'cat' ? 'Higher protein helps cats keep muscle while losing fat (studies used 35 to 45% of calories from protein), so we ask for at least 85 g per 1000 kcal.' : 'Protein and fat follow a research review of weight-loss dog diets: more than about 25% protein and under 10% fat on a dry-matter basis, roughly 75 and 30 g per 1000 kcal.'} There is no official standard for protein and fat in weight-loss foods.` },
  { id: 'maintain', label: 'Keep steady', why: () => 'Protein about 20% above the AAFCO adult minimum and fat at least the minimum, so there is room to spare.' },
  { id: 'gain', label: 'Weight gain', why: () => 'No official standard. We ask for richer than most foods on offer: calories in the top quarter, fat above the middle, and comfortable protein.' },
  { id: 'grow', label: 'Growing', why: () => 'At least the AAFCO minimums for growth. Calcium and phosphorus, which matter most for big breeds, are checked for you.' },
  { id: 'active', label: 'Very active', why: () => 'No official standard. Energy-dense food with more fat and solid protein, for pets that burn more calories.' },
  { id: 'senior', label: 'Senior or less active', why: () => 'No official standard. Leaner, lower-calorie food with comfortable protein, for pets that move less.' },
];
const recommendedPreset = () => gv?.preset || null;
function applyPreset(id) {
  state.unit = 'kcal'; state.targets.kcal = {}; state.preset = id; state.targetsOpen = true;
  (tv.presets[id] || []).forEach((it) => { state.targets.kcal[it.key] = { v: it.v, op: it.op }; });
}

// The recommended intake (AAFCO, per 1000 kcal, for this pet's life stage) shown next to each number, in the unit being read.
// On the bag the same amount reads as a percentage that depends on how energy-dense the food is, so dry and wet are both shown.
const DRY_KCAL_KG = 3700; const WET_KCAL_KG = 1000;
function recLine(T, ctx, mode, b) {
  if (T.key === 'energy') return '';
  const r = T.aafco && ctx.targets?.[T.aafco]; const name = ctx.pet ? esc(ctx.pet.name) : 'your pet';
  if (!r || (r.min == null && r.max == null)) return `<div class="trow__rec muted small">No official target for ${T.label.toLowerCase()}: a wide range is normal.</div>`;
  const pct = (g) => Math.round(g * 10) / 10;
  // AAFCO states amounts per 1,000 kcal; an owner needs grams a day, so scale by the pet's daily calories
  const kcalDay = ctx.goalKcal || ctx.plan?.kcal; const perDay = (v) => (kcalDay ? Math.round((v * kcalDay) / 100) / 10 : null); const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(1));
  const day = (v) => (perDay(v) != null ? `<strong>${fmt(perDay(v))} g</strong> a day` : `<strong>${v} g</strong> per 1,000 kcal`);
  const parts = [r.min != null ? `at least ${day(r.min)}` : '', r.max != null ? `at most ${day(r.max)}` : ''].filter(Boolean).join(', ');
  const basis = kcalDay ? ` (at ${Math.round(kcalDay).toLocaleString('en-US')} kcal a day; ${r.min ?? r.max} g per 1,000 kcal, AAFCO)` : ' (AAFCO)';
  const asBag = mode === 'label' && r.min != null ? ` On the bag that is about <strong>${pct((r.min * DRY_KCAL_KG) / 10000)}%</strong> in a dry food or <strong>${pct((r.min * WET_KCAL_KG) / 10000)}%</strong> in a wet one.` : '';
  const use = r.min != null ? `<button type="button" class="btn btn--ghost btn--small" data-userec="${T.key}">Use this as the minimum</button>` : '';
  return `<div class="trow__rec small">Recommended for ${name}: ${parts}${basis}.${asBag} ${use}</div>`;
}

function targetsHtml(ctx, species) {
  const mode = 'kcal'; state.unit = 'kcal'; const pet = ctx.pet; const rec = recommendedPreset(); // always grams a day (per 1,000 kcal when there are no daily calories yet) const rec = recommendedPreset();
  const preset = PRESETS.find((p) => p.id === state.preset);
  const presets = `<div class="presets"><span class="legend" id="pre-l">Start from a suggestion</span>
    <div class="chips" role="group" aria-labelledby="pre-l">${PRESETS.map((p) => `<button type="button" class="chipbtn chipbtn--toggle" data-preset="${p.id}" aria-pressed="${state.preset === p.id}">${p.label}${rec === p.id ? ' (suggested)' : ''}</button>`).join('')}</div>
    ${preset ? `<div class="notice" role="note">${icon('info')}<div><strong>${preset.label}.</strong> ${esc(preset.why(species))} You can change any number below.</div></div>` : '<span class="hint">One tap fills sensible numbers. Then change any of them.</span>'}</div>`;
  const calories = pet && gv && !gv.plan.hideKcal ? (() => {
    const kb = gv.kcalBounds; const sug = Math.round(gv.suggestedKcal); const cur = goal.kcalOverride ?? sug;
    return `<div class="trow trow--cal"><div class="trow__head"><strong>Daily energy (kcal)</strong><span class="hint">We suggest ${sug} for ${esc(pet.name)}.${goal.kcalOverride != null ? ' You changed it.' : ''}</span></div>
      <div class="trow__ctl"><input type="range" aria-label="Daily kcal slider" min="${kb.lo}" max="${kb.hi}" step="10" value="${cur}" data-kcal-range><input class="input num" id="kcal-in" type="number" inputmode="numeric" aria-label="Daily kcal" min="${kb.lo}" max="${kb.hi}" step="10" value="${cur}" data-kcal-num><span class="unit">kcal a day</span></div>
      <div class="hint" id="kcal-msg" aria-live="polite">${goal.kcalOverride != null ? `<button type="button" class="btn btn--ghost btn--small" data-kcal-reset>Use our suggestion (${sug})</button>` : `${kb.safe ? `We will not go below the safe level of ${kb.safe} kcal a day for this goal. ` : ''}Allowed range ${kb.lo} to ${kb.hi}.`}</div></div>`;
  })() : '';
  const rows = TG.filter((T) => !(mode === 'kcal' && T.labelOnly)).map((T) => {
    const b = bounds(T, mode); if (!b) return '';
    const sb = shownBounds(b, mode, factorFor(T, ctx));
    const o = state.targets[mode][T.key]; const on = !!o; const val = Math.round((on ? o.v : b.mid) * sb.F * 10) / 10; const op = on ? o.op : 'about';
    const need = '';
    const fmtv = (x) => (+x).toFixed(sb.dec);
    return `<div class="trow ${on ? '' : 'is-off'}" data-tkey="${T.key}"><div class="trow__head"><div class="row row--between"><strong>${T.label}</strong><span class="trow__val"><span data-tval>${on ? `${fmtv(val)} ${sb.unit}` : 'Not set'}</span><button type="button" class="btn btn--ghost btn--small" data-tclear aria-label="Clear ${T.label}" ${on ? '' : 'hidden'}>${icon('x')}</button></span></div><span class="hint">${NUTRIENT_HELP[T.key === 'energy' ? 'kcal' : T.key] || ''}</span></div>
      <div class="trow__ctl"><input type="range" aria-label="${T.label}, ${sb.unit}" min="${sb.lo}" max="${sb.hi}" step="${sb.step}" value="${val}" data-trange></div>
      <div class="seg seg--3" role="radiogroup" aria-label="${T.label} rule" ${on ? '' : 'hidden'}>${OPS.map(([v, l]) => `<label><input type="radio" name="op-${T.key}" value="${v}" ${op === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      ${recLine(T, ctx, mode, b)}
      <div class="hint" data-thint ${on ? '' : 'hidden'}>${on ? `${OP_WORD[op][0].toUpperCase() + OP_WORD[op].slice(1)} ${fmtv(val)} ${sb.unit}: closest foods come first.` : ''}</div></div>`;
  }).join('');
  return `<div class="stack"><p class="hint" style="margin:0">For owners following a vet's numbers or a diet plan. Foods closest to your numbers come first. Every number is limited to a sensible range. Foods that fit your pet come first; a food that does not fit is still listed, lower down, with a label saying why.</p>
    ${presets}
    ${calories}${rows}<button class="btn btn--ghost" type="button" id="tclear">Clear my numbers</button></div>`;
}

// ---- goal card -------------------------------------------------------------------------------
function summary(ctx) {
  const gp = gv.gp; const kc = gv.kcal;
  const when = gp.days % 30 === 0 ? `${gp.days / 30} month${gp.days === 30 ? '' : 's'}` : `${gp.days} days`;
  const tgt = goal.type === 'grow' ? `expected in ${when}` : goal.type === 'maintain' ? 'about where they are now' : `goal in ${when}`;
  const bn = gv.breedNote;
  const breedNote = bn ? `${round(goal.targetKg, 1)} kg is outside the usual range for a ${bn.breed} (${round(bn.min, 1)} to ${round(bn.max, 1)} kg). Please check with your vet.` : '';
  const warn = gp.pace.state !== 'good' ? `<div class="goalsum__pace">${badge(gp.pace.text, gp.pace.state, gp.pace.state === 'caution' ? 'alert' : 'x')}</div>` : '';
  return `<div class="goalsum__stats"><div class="stat"><div class="stat__value">${kc.toLocaleString('en-US')}</div><div class="stat__label">kcal a day${goal.kcalOverride != null ? ' (your number)' : ''}</div></div><div class="stat"><div class="stat__value">${round(gp.targetKg, 1)} kg</div><div class="stat__label">${tgt}</div></div></div>
    ${gp.vetWarning ? verdictBanner('caution', 'Check with your vet first', esc(gp.vetWarning)) : ''}${warn}${gp.note ? `<p class="hint" style="margin:var(--space-2) 0 0">${esc(gp.note)}</p>` : ''}<p class="hint" style="margin:var(--space-2) 0 0">${KCAL_NOTE} (kcal are the "Calories" on food labels.)</p>${breedNote ? `<p class="hint" style="margin:var(--space-2) 0 0">${esc(breedNote)}</p>` : ''}`;
}

// The same chart and controls as the Growth tab, tucked in a collapsible section of the goal card.
function chartSection(pet) {
  if (!pet || !gview) return '';
  const growth = gview.kind === 'growth';
  return `<details class="disclosure" id="gchart-d" style="margin-top:var(--space-4)" ${state.chartOpen || goalOpen ? 'open' : ''}><summary>${growth ? 'See it on the growth chart' : 'See it on the weight chart'}</summary>
    <div style="padding:var(--space-3) 0">${targetPickerHtml(pet, gview, { intro: 'Tap the chart, or pick a date and weight below. The goal updates as you go.' })}</div></details>`;
}
// Where the picker starts: the goal's own target when it has one.
const pickerFrom = () => (goal && (goal.type === 'lose' || goal.type === 'gain' || (goal.type === 'grow' && goal.custom)) ? { days: gv.gp.days, kg: gv.gp.targetKg } : undefined);
function goalLine(pet) {
  const gp = gv.gp; const g = GOALS.find((x) => x.id === goal.type); const kc = gv.kcal;
  const saved = getPet()?.goal ? gv.saved : null;
  const date = saved?.targetDate || addDaysStr(todayStr(), gp.days); const left = saved ? saved.daysLeft : gp.days; const dateTxt = `by ${fmtDay(date)} (${left} days left)`;
  const short = goal.type === 'maintain' ? `Keep weight steady ${dateTxt}, ${kc} kcal a day` : goal.type === 'grow' && !goal.custom ? `Expected ${round(gp.targetKg, 1)} kg ${dateTxt}, ${kc} kcal a day` : `${round(saved ? saved.startKg : pet.weightKg, 1)} to ${round(gp.targetKg, 1)} kg ${dateTxt}, ${kc} kcal a day`;
  const pr = saved ? gv.progress : null;
  const prBadge = pr ? (saved.expired ? badge('Goal date reached', 'caution') : badge(pr.text, { on_track: 'good', ahead: 'good', behind: 'caution', no_data: '' }[pr.state])) : '';
  return `<div class="goalline__title"><strong>Goal: ${g.label.toLowerCase()}</strong>${prBadge}${gp.pace.state && gp.pace.state !== 'good' ? badge(gp.pace.text, gp.pace.state) : ''}</div><div class="muted small">${short}</div>${gp.vetWarning ? `<div style="margin-top:var(--space-3)">${verdictBanner('caution', 'Check with your vet first', esc(gp.vetWarning))}</div>` : ''}`;
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
    return card(`<div class="goalbar"><div id="goalline">${goalLine(pet)}</div><div class="goalbar__actions">${getPet() ? `<button class="btn btn--secondary btn--small" type="button" data-quick-weight>${icon('plus')}<span>Weight</span></button>` : ''}${gv.options.length > 1 ? '<button class="btn btn--secondary btn--small" type="button" id="gedit"><span>Change</span></button>' : ''}</div></div>${chartSection(pet)}`, { cls: 'goalcard' });
  }
  return card(`<h2 id="goal-h" style="margin:0 0 var(--space-2);font-size:var(--text-lg)">Set a goal for ${esc(pet.name)}</h2>
    <p class="muted small" style="margin:0 0 var(--space-3)">Drag on the chart, or pick a date and weight under it. A lower weight than now is a weight-loss goal, a higher one is weight gain, and the same is keeping steady.</p>
    <div class="goalsum" id="goalsum" aria-live="polite">${summary(ctx)}</div>
    ${chartSection(pet)}
    <div style="margin-top:var(--space-3)">${button({ label: 'Done', variant: 'dark btn--small', iconName: 'check', attrs: 'id="gdone"' })}</div>`, { cls: 'goalcard' });
}

const PAGE = 12; let shown = PAGE; // results are shown a page at a time so a phone is not scrolling through the whole catalogue
// ---- results ---------------------------------------------------------------------------------
// calc filters, scores and sorts the catalogue; this draws the page of cards it returns.
async function results(ctx) {
  const species = state.species || ctx.pet?.species || 'dog';
  const ratings = state.sort === 'rating' ? Object.fromEntries(listFoods().map((f) => [f.id, f.rating || 0])) : undefined; // owner ratings live in the app, not the catalogue
  const r = await calc('rankFoods', { pet: ctx.pet, goal: ctx.pet ? goal : null, species, stage: state.stage, region: getRegion(), quick: [...state.quick], needs: [...state.needs], hideAllergy: state.hideAllergy, include: state.include, priority: [...state.priority], unit: state.unit, targets: state.targets[state.unit], sort: state.sort, ratings, limit: shown });
  const byId = new Map(listFoods().map((f) => [f.id, f]));
  const hasT = activeTargets().length > 0;
  const goalLabel = goal ? GOALS.find((g) => g.id === goal.type).label.toLowerCase() : '';
  const extra = [state.priority.size ? 'your priorities' : '', hasT ? 'your numbers' : ''].filter(Boolean).join(' and ');
  return r.total
    ? `<h2 class="sr-only">Results</h2><p class="muted small" aria-live="polite">${r.total} food${r.total === 1 ? '' : 's'}${ctx.pet ? ` for ${esc(ctx.pet.name || 'your pet')}${goal ? `, ranked to ${goalLabel}${extra ? ` and ${extra}` : ''}` : ''}` : ''}</p><div class="grid grid--auto">${r.items.filter((c) => byId.has(c.id)).map((c) => foodCard(byId.get(c.id), c)).join('')}</div>${r.total > shown ? `<button class="btn btn--secondary btn--block" type="button" data-more>Show ${Math.min(PAGE, r.total - shown)} more (${shown} of ${r.total})</button>` : ''}`
    : emptyState({ img: (ctx.pet?.species === 'cat' || state.species === 'cat') ? 'cut-cat' : 'cut-beagle', title: 'No foods match, yet', text: 'Try removing a filter, or turn on "include foods that do not report a nutrient" in More filters.' });
}

function needsHtml(pet) {
  const sug = suggestedNeeds(pet);
  const al = pet?.allergies || [];
  const nOn = state.needs.size; const aOn = pet && al.length && state.hideAllergy ? 1 : 0;
  return `<details class="disclosure" id="needs-d" style="margin-top:var(--space-3)" ${nOn ? 'open' : ''}><summary>Special needs${nOn ? ` <span class="badge badge--info">${nOn} on</span>` : ''}</summary>
  <div style="padding:var(--space-3) 0"><p class="muted small" style="margin:0 0 var(--space-2)">Only foods that include them.</p>
  <div class="chips" role="group" aria-label="Extras">${NEEDS.map((n) => `<button type="button" class="chipbtn chipbtn--toggle" data-need="${n.id}" aria-pressed="${state.needs.has(n.id)}" title="${esc(n.help)}">${n.label}${sug.includes(n.id) ? ' <span class="badge badge--info">Suggested</span>' : ''}</button>`).join('')}</div></div></details>
  ${pet ? `<details class="disclosure" id="alg-d" style="margin-top:var(--space-2)"><summary>Anything they should avoid?${aOn ? ` <span class="badge badge--info">${aOn} on</span>` : ''}</summary><div style="padding:var(--space-3) 0">
  ${al.length ? `<div class="chips">${al.map((a) => `<span class="badge badge--bad">${esc(a)}</span>`).join('')}</div>
  <label class="switch" style="margin-top:var(--space-3)"><input type="checkbox" id="hide-al" ${state.hideAllergy ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Hide foods that contain them (from ${esc(pet.name)}'s profile)</span></label>`
    : `<p class="muted small" style="margin:0">None listed for ${esc(pet.name)}. <a href="/pet/profile">Add allergies in the profile</a> and we hide those foods.</p>`}</div></details>` : ''}`;
}
function syncMoreBadge() {
  const sb = (id, n) => { const el = document.querySelector(`#${id} > summary`); if (!el) return; el.querySelector('.badge')?.remove(); if (n) el.append(' ', Object.assign(document.createElement('span'), { className: 'badge badge--info', textContent: `${n} on` })); };
  sb('needs-d', state.needs.size); sb('alg-d', document.querySelector('#hide-al')?.checked ? 1 : 0);
  const s = document.querySelector('#more-opts > summary'); if (!s) return;
  s.querySelector('.badge')?.remove();
  const n = state.needs.size + (state.targetsOpen && activeTargets().length ? 1 : 0);
  if (n) s.firstChild.after(Object.assign(document.createElement('span'), { className: 'badge badge--info', textContent: `${n} on` }));
}
const hasPrices = () => listFoods().some((x) => x.pricePerKg);
const chipsHtml = (pet, ctx, species) => {
  const moreOpen = state.moreOpen !== false || state.needs.size > 0 || state.targetsOpen; // open until the owner closes it, so the special needs and own numbers are in view
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


// ---- treats and supplements in Find food ----------------------------------------------------------
const TYPE_LABEL = { biscuit: 'Biscuit', jerky: 'Jerky', 'dental chew': 'Dental chew', 'soft chew': 'Soft chew', 'freeze-dried': 'Freeze-dried', 'lickable/puree': 'Lickable', 'long-lasting chew': 'Long-lasting chew', 'training treat': 'Training treat', other: 'Other' };
const typeLabel = (t) => TYPE_LABEL[t] || 'Treat';
const KINDS = [['food', 'Foods'], ['treat', 'Treats'], ['supplement', 'Supplements']];
const fmtn = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');
const energyOf = (t) => (t.kcalPerTreat ? `${fmtn(t.kcalPerTreat)} kcal per ${esc(t.kcalPerTreatUnit || 'treat')}` : t.kcalPerKg ? `${Math.round(t.kcalPerKg / 10)} kcal per 100 g` : 'Calories not stated');
// How many of a treat fit in a day, worded from what calc worked out (v.day).
const treatDay = (d) => {
  if (d.kind === 'nopet') return { text: 'Add your pet to see how many fit in a day', strong: false };
  if (d.kind === 'vet') return { text: 'Ask your vet how many', strong: false };
  if (d.kind === 'count') return { text: d.count >= 1 ? `Up to ${d.count} a day${d.limitedBy === 'label' ? ' (label limit)' : ''}` : 'One is more than 10% of the day', strong: true };
  if (d.kind === 'grams') return { text: `About ${Math.round(d.grams)} g a day`, strong: true };
  return { text: 'Energy not stated, so we cannot count it', strong: false };
};
const addBtn = (id, kind) => (isSignedIn() ? button({ label: 'Add to diet', variant: 'primary btn--small', iconName: 'plus', attrs: `data-add="${id}" data-kind="${kind}"` }) : button({ label: 'Add to diet', variant: 'primary btn--small', iconName: 'plus', attrs: 'data-signup data-then="/foods"' }));

function treatCard(t, pet, v) {
  const fit = v.fit; const day = treatDay(v.day);
  const buy = t.buyUrl ? `<a class="fc__buy" href="${esc(t.buyUrl)}" target="_blank" rel="noopener noreferrer sponsored">${icon('cart')}<span>${t.buyType === 'search' ? 'Search at' : 'Buy at'} ${esc(t.buyRetailer || 'a retailer')}</span></a>` : '';
  return `<div class="fcwrap">${card(`<div class="fc__img">${foodPic(t)}</div>
    <div class="row row--between">${fit ? verdictBadge(fit.verdict, { good: 'No ingredient problems', caution: 'Check details', bad: 'Not a match' }[fit.verdict]) : badge('Add your pet to check')}${badge(typeLabel(t.treatType), 'info')}</div>
    <h3 class="card__title" style="margin-top:var(--space-3)">${esc(t.name)}</h3><p class="muted small" style="margin:0">${esc(t.brand)}, ${esc(t.species)}</p>
    <div class="fc__stats small"><div><span class="muted">Energy</span><br><strong>${energyOf(t)}</strong></div><div><span class="muted">${pet ? 'Per day' : 'In a day'}</span><br>${day.strong ? `<strong>${esc(day.text)}</strong>` : esc(day.text)}</div></div>
    ${fit && fit.warn.length ? `<p class="small" style="margin:var(--space-3) 0 0;color:var(--color-${fit.warn[0].level === 'bad' ? 'bad' : 'caution'})">${icon(fit.warn[0].level === 'bad' ? 'x' : 'alert')} ${esc(fit.warn[0].text)}</p>` : ''}
    <div class="row" style="margin-top:var(--space-3)">${button({ label: 'Details', variant: 'secondary btn--small', attrs: `data-tdetail="${t.id}" type="button"` })}${addBtn(t.id, 'treat')}</div>`, { flat: false })}${buy}</div>`;
}

const SUPP_TYPE = { joint: 'Joint', 'skin & coat': 'Skin and coat', multivitamin: 'Multivitamin', 'probiotic/digestive': 'Probiotic and digestive', calming: 'Calming', immune: 'Immune', dental: 'Dental', 'liver/kidney': 'Liver and kidney', 'fish oil/omega': 'Fish oil and omega', urinary: 'Urinary', hairball: 'Hairball', other: 'Other' };
const suppType = (t) => SUPP_TYPE[t] || 'Supplement';
const suppFor = (s) => (s.speciesAll && s.speciesAll.length ? `For ${s.speciesAll.map((x) => `${x}s`).join(' and ')}` : s.speciesUnknown ? 'Species not stated on the label' : `For ${s.species}s`);
const doseLine = (s, pet, d) => {
  if (!pet) return null;
  if (d && d.amount != null && d.covered !== false) return `Label dose at ${fmtn(pet.weightKg)} kg: ${fmtn(d.amount)} ${d.unit}`.trim();
  if (d && d.covered === false) return `The label's weight table does not cover ${fmtn(pet.weightKg)} kg. Check the bag.`;
  return s.dosingText ? 'See the label for the dose' : 'Dose not on our data. Check the bag.';
};
function supplementCard(s, pet, d) {
  const buy = s.buyUrl ? `<a class="fc__buy" href="${esc(s.buyUrl)}" target="_blank" rel="noopener noreferrer sponsored">${icon('cart')}<span>${s.buyType === 'search' ? 'Search at' : 'Buy at'} ${esc(s.buyRetailer || 'a retailer')}</span></a>` : '';
  const dose = doseLine(s, pet, d);
  return `<div class="fcwrap">${card(`${s.photo ? `<div class="fc__img">${foodPic(s)}</div>` : ''}
    <div class="row row--between">${badge(suppType(s.type), 'info')}${s.vetOnly ? badge('Vet only', 'caution') : ''}</div>
    <h3 class="card__title" style="margin-top:var(--space-3)">${esc(s.name)}</h3><p class="muted small" style="margin:0">${esc(s.brand)} · ${esc(suppFor(s))}</p>
    ${s.claim ? `<p class="small" style="margin:var(--space-3) 0 0"><span class="muted">Label says:</span> ${esc(s.claim.length > 140 ? `${s.claim.slice(0, 140)}…` : s.claim)}</p>` : ''}
    ${dose ? `<p class="small" style="margin:var(--space-2) 0 0">${esc(dose)}</p>` : ''}
    <p class="small muted" style="margin:var(--space-2) 0 0">Listed in the diet, not counted in calories. Ask your vet before starting one.</p>
    <div class="row" style="margin-top:var(--space-3)">${button({ label: 'Details', variant: 'secondary btn--small', attrs: `data-sdetail="${s.id}" type="button"` })}${addBtn(s.id, 'supplement')}</div>`)}${buy}</div>`;
}

function supplementSheet(s, ctx, d) {
  const pet = ctx.pet; const dose = doseLine(s, pet, d);
  const actives = s.actives.length ? `<ul class="small" style="margin:0;padding-left:1.2rem">${s.actives.map((a) => `<li>${esc(a.name || '')}${a.amount != null ? `: ${esc(String(a.amount))} ${esc(a.unit || '')}` : ''}</li>`).join('')}</ul>` : '<p class="small muted" style="margin:0">Amounts per serving are not in our data (many brands print them in images). Check the bag.</p>';
  const body = `<div class="stack"><p style="margin:0"><strong>${esc(suppType(s.type))}</strong>${s.form ? ` · ${esc(s.form)}` : ''} · ${esc(suppFor(s))}${s.servingSize ? ` · serving: ${esc(s.servingSize)}` : ''}</p>
    ${s.claim ? `<p class="small" style="margin:0"><span class="muted">The label says:</span> ${esc(s.claim)}</p>` : ''}
    ${dose ? `<p class="small" style="margin:0"><strong>${esc(dose)}</strong></p>` : ''}${s.dosingText ? `<p class="small" style="margin:0"><span class="muted">Dosing on the label:</span> ${esc(s.dosingText)}</p>` : ''}
    <div><div class="small muted">In each serving</div>${actives}</div>
    ${s.ingredients.length && s.ingredients.every((i) => i.length <= 60) ? `<div><div class="small muted">Ingredients</div><div class="chips">${s.ingredients.slice(0, 40).map((i) => badge(i)).join('')}</div></div>` : '<p class="small muted" style="margin:0">No clean ingredient list in our data. Check the bag.</p>'}
    ${s.nasc ? '<p class="small" style="margin:0">States the NASC quality seal.</p>' : ''}
    <p class="hint" style="margin:0">Claims are the maker's label text, not ours, and we have not checked that they work. Supplements are not counted in calories${s.kcalPerServing ? ` (this one lists ${fmtn(s.kcalPerServing)} kcal per ${esc(s.kcalPerServingUnit || 'serving')})` : ''}. Some supplements can interact with medicines, so ask your vet before you start one. Information is copied from the maker's page and may be incomplete.</p>
    <div class="row">${addBtn(s.id, 'supplement')}${s.buyUrl ? button({ label: `${s.buyType === 'search' ? 'Search at' : 'Buy at'} ${s.buyRetailer || 'a retailer'}`, href: s.buyUrl, variant: 'secondary', iconName: 'cart', attrs: 'target="_blank" rel="noopener noreferrer sponsored"' }) : ''}</div></div>`;
  openSheet({ title: `${s.brand} ${s.name}`, body, onMount: (el, close) => { el.querySelector('[data-add]')?.addEventListener('click', () => { if (isSignedIn() && getPet()) { close(); openAddItem(getPet(), 'supplement', s, () => {}); } }); } });
}

// Treats and supplements: calc filters, sorts and works out the day's amount or the label dose; this draws the cards.
let extraTypes = [];
async function extraResults(ctx) {
  const pet = ctx.pet; const species = pet?.species || 'dog';
  if (state.kind === 'supplement') {
    if (!listSupplements().length) return emptyState({ img: 'cut-beagle', title: 'Supplements are coming', text: 'We are adding supplements to this list. You can already add one by name on the Diet page.' });
    const v = await calc('supplementsView', { pet, species, type: state.xtype, q: state.xq, limit: state.xshown });
    extraTypes = v.types; const byId = new Map(listSupplements().map((x) => [x.id, x]));
    return v.total ? `<h2 class="sr-only">Supplement results</h2><p class="muted small" aria-live="polite">${v.total} supplement${v.total === 1 ? '' : 's'}${pet ? ` for ${esc(pet.name)}` : ''}. We list what the label says and do not judge whether they work. Ask your vet first.</p><div class="grid grid--auto">${v.items.filter((i) => byId.has(i.id)).map((i) => supplementCard(byId.get(i.id), pet, i.dose)).join('')}</div>${v.total > state.xshown ? `<div style="margin-top:var(--space-5);text-align:center">${button({ label: `Show more (${v.total - state.xshown} left)`, variant: 'secondary', attrs: 'id="xmore" type="button"' })}</div>` : ''}` : emptyState({ img: 'cut-beagle', title: 'No supplements match', text: 'Try another type or fewer words.' });
  }
  const v = await calc('treatsView', { pet, species, type: state.xtype, q: state.xq, hide: state.xhide, sort: state.xsort, limit: state.xshown });
  extraTypes = v.types; const byId = new Map(listTreats().map((x) => [x.id, x]));
  if (!v.total) return emptyState({ img: 'cut-beagle', title: 'No treats match', text: 'Try another type, or clear the search.' });
  return `<h2 class="sr-only">Treat results</h2><p class="muted small" aria-live="polite">${v.total} treat${v.total === 1 ? '' : 's'}${pet ? ` for ${esc(pet.name)}` : ''}. Treats are best kept to about 10% of a day's calories, all together.</p>
    <div class="grid grid--auto">${v.items.filter((i) => byId.has(i.id)).map((i) => treatCard(byId.get(i.id), pet, i)).join('')}</div>
    ${v.total > state.xshown ? `<div style="margin-top:var(--space-5);text-align:center">${button({ label: `Show more (${v.total - state.xshown} left)`, variant: 'secondary', attrs: 'id="xmore" type="button"' })}</div>` : ''}`;
}

async function extraHtml(ctx) {
  const res = await extraResults(ctx); const types = ['all', ...extraTypes];
  return `<div class="stack">${ctx.pet ? '' : notice(state.kind === 'supplement' ? 'Add your pet to see only the supplements for their species and the label dose for their weight.' : 'Add your pet to check ingredients against allergies and to see how many treats fit in a day.', 'info')}
    <div class="grid grid--3"><div class="field"><label for="xq">Search</label><input class="input" id="xq" type="search" value="${esc(state.xq)}" placeholder="Brand or name" autocomplete="off"></div>
      <div class="field" id="xs-f" ${state.kind === 'treat' ? '' : 'hidden'}><label for="xs">Sort by</label><select class="select" id="xs">${[['budget', 'Most treats a day'], ['calories', 'Fewest calories per treat'], ['name', 'Name']].map(([v, l]) => `<option value="${v}" ${state.xsort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${ctx.pet && state.kind === 'treat' ? `<label class="switch" style="align-self:end"><input type="checkbox" id="xh" ${state.xhide ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Hide treats with ${esc(ctx.pet.name)}'s allergens</span></label>` : ''}</div>
    <div class="row" id="xtypes" role="group" aria-label="Type">${types.map((v) => `<button type="button" class="chipbtn chipbtn--toggle" data-xtype="${esc(v)}" aria-pressed="${state.xtype === v}">${v === 'all' ? 'All' : state.kind === 'supplement' ? suppType(v) : typeLabel(v)}</button>`).join('')}</div>
    <div id="xres">${res}</div></div>`;
}

async function treatSheet(t, ctx) {
  const pet = ctx.pet; const td = pet ? await calc('treatDetail', pet, t.id) : null; const kcal = td ? td.kcal : null; const p = td ? td.plan : null; const fit = td ? td.fit : null;
  const flagged = (ing) => !!td && td.flagged[t.ingredients.indexOf(ing)];
  const lines = [];
  if (p && kcal != null) {
    lines.push(`Treats are best kept to about 10% of a day, <strong>${Math.round(p.budgetKcal)} kcal</strong> of ${esc(pet.name)}'s ${kcal.toLocaleString('en-US')}, for all treats together.`);
    if (p.byBudget != null) lines.push(`At ${fmtn(p.perTreat)} kcal each, that is up to <strong>${p.byBudget}</strong> by the 10% rule.`); else if (p.grams != null) lines.push(`That is about <strong>${Math.round(p.grams)} g</strong> a day.`);
    if (p.labelMax != null) lines.push(`The label allows up to <strong>${p.labelMax}</strong> a day at ${fmtn(pet.weightKg)} kg. We use the lower number.`); else if (p.bandsNotCovering) lines.push(`The label has a weight table that does not cover ${fmtn(pet.weightKg)} kg, so check the bag for its own limit.`);
  }
  const body = `<div class="stack">${fit ? `<p class="small" style="margin:0;color:var(--color-${fit.verdict === 'bad' ? 'bad' : fit.verdict === 'caution' ? 'caution' : 'good'})">${fit.warn.length ? esc(fit.warn.map((w) => w.text).join(' ')) : 'No unsafe ingredients or listed allergens found. We cannot check how it is made, so read the bag.'}</p>` : ''}
    <p style="margin:0"><strong>${energyOf(t)}</strong>${t.gramsPerTreat ? ` · about ${fmtn(t.gramsPerTreat)} g each` : ''} · ${esc(typeLabel(t.treatType))}</p>
    ${lines.map((l) => `<p class="small" style="margin:0">${l}</p>`).join('')}${t.treatFeedingText ? `<p class="small" style="margin:0"><span class="muted">Label says:</span> ${esc(t.treatFeedingText)}</p>` : ''}
    <div class="chips">${t.ingredients.length ? t.ingredients.map((i) => badge(i, flagged(i) ? 'bad' : '', flagged(i) ? 'alert' : '')).join('') : '<span class="muted small">Ingredients not in our data. Check the bag.</span>'}</div>
    <p class="hint" style="margin:0">Ingredient lists are copied from the maker's website or label and are not always complete or marked correctly. Flags only match the words listed here. Always read the ingredient list on the bag before you feed it. Treats are not complete meals. ${esc(KCAL_NOTE)}</p>
    <div class="row">${addBtn(t.id, 'treat')}${t.buyUrl ? button({ label: `${t.buyType === 'search' ? 'Search at' : 'Buy at'} ${t.buyRetailer || 'a retailer'}`, href: t.buyUrl, variant: 'secondary', iconName: 'cart', attrs: 'target="_blank" rel="noopener noreferrer sponsored"' }) : ''}</div></div>`;
  openSheet({ title: `${t.brand} ${t.name}`, body, onMount: (el, close) => { el.querySelector('[data-add]')?.addEventListener('click', () => { if (isSignedIn() && getPet()) { close(); openAddItem(getPet(), 'treat', t, () => {}); } }); } });
}

export async function render() {
  const pet0 = curPet();
  gview = pet0 ? await calc('growthPageView', pet0) : null;
  if (location.search) { const q = new URLSearchParams(location.search); state.species = q.get('species') || state.species; state.stage = q.get('stage'); if (['food', 'treat', 'supplement'].includes(q.get('kind'))) state.kind = q.get('kind'); }
  const species = state.species || pet0?.species || 'dog';
  // the goal starts from the saved one (or a sensible default), and calc works out its plan and calories
  goal = null; gv = null;
  if (pet0) { gv = await calc('goalView', pet0, null); goal = { ...gv.start }; }
  await loadTargets(species);
  const ctx = makeCtx();
  goalOpen = !ctx.pet; // with a pet the goal starts as a slim bar; "Change goal" opens the form
  state.chartOpen = false; // the goal chart always starts collapsed; tapping its heading opens it
  state.targetsOpen = state.targetsOpen || activeTargets().length > 0 || goal?.kcalOverride != null;
  const resultsHtml = await results(ctx);
  const extra = state.kind === 'food' ? '' : await extraHtml(ctx);
  return {
    title: 'Dog & Cat Food Compared by Fit and Cost per Day',
    html: `${pageHead('Find their food')}<div class="page">${expNote(' Food data can be wrong or out of date: check the label on the bag.')}
      <p class="regionbar">${icon('shield')}<span>Showing foods sold in <strong>${esc((REGIONS.find(([id]) => id === getRegion()) || [])[1] || '')}</strong>.</span> <button class="linkbtn" type="button" data-field="region">Change</button></p>
      <div class="row" style="margin-bottom:var(--space-4)" role="group" aria-label="What are you looking for">${KINDS.map(([v, l]) => `<button type="button" class="chipbtn chipbtn--toggle" data-kind-tab="${v}" aria-pressed="${state.kind === v}">${l}</button>`).join('')}</div>
      <div id="foodview" ${state.kind === 'food' ? '' : 'hidden'}>
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
        <div id="res" class="stack">${resultsHtml}</div>
      </div></div>
      <div id="extraview" ${state.kind === 'food' ? 'hidden' : ''}>${extra}</div></div>`,
    mount(root, rerender) {
      bindFields(root, rerender);
      mountCombos(root);
      // Foods / Treats / Supplements: the food view is not re-rendered, it is only hidden
      const extraOut = async () => { const x = root.querySelector('#xres'); if (x) x.innerHTML = await extraResults(makeCtx()); };
      const setKind = async (k) => {
        state.kind = k; state.xshown = 48; state.xtype = 'all'; root.querySelector('#foodview').hidden = k !== 'food'; root.querySelector('#extraview').hidden = k === 'food';
        root.querySelectorAll('[data-kind-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kindTab === k)));
        if (k !== 'food') root.querySelector('#extraview').innerHTML = await extraHtml(makeCtx());
      };
      rootOn(root, 'click', 'foods', (e) => {
        const fa = e.target.closest('[data-fadd]'); if (fa) { const fd = listFoods().find((x) => x.id === fa.dataset.fadd); if (fd && getPet()) openAddItem(getPet(), 'food', fd, () => {}); return; }
        const kt = e.target.closest('[data-kind-tab]'); if (kt) { setKind(kt.dataset.kindTab); return; }
        const xt = e.target.closest('[data-xtype]'); if (xt) { state.xtype = xt.dataset.xtype; state.xshown = 48; root.querySelectorAll('[data-xtype]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.xtype === state.xtype))); extraOut(); return; }
        if (e.target.closest('#xmore')) { state.xshown += 48; extraOut(); return; }
        const sd = e.target.closest('[data-sdetail]'); if (sd) { const sp = listSupplements().find((x) => x.id === sd.dataset.sdetail); if (sp) { const c = makeCtx(); calc('supplementDose', sp, c.pet?.weightKg || null).then((d) => supplementSheet(sp, c, d)); } return; }
        const td = e.target.closest('[data-tdetail]'); if (td) { const t = listTreats().find((x) => x.id === td.dataset.tdetail); if (t) treatSheet(t, makeCtx()); return; }
        const ad = e.target.closest('[data-add]'); if (ad && isSignedIn() && getPet()) { const kind = ad.dataset.kind; const item = (kind === 'supplement' ? listSupplements() : listTreats()).find((x) => x.id === ad.dataset.add); if (item) openAddItem(getPet(), kind, item, extraOut); }
      });
      rootOn(root, 'input', 'foods', (e) => { if (e.target.id === 'xq') { state.xq = e.target.value; state.xshown = 48; extraOut(); } });
      rootOn(root, 'change', 'foods', (e) => { if (e.target.id === 'xs') { state.xsort = e.target.value; extraOut(); } else if (e.target.id === 'xh') { state.xhide = e.target.checked; extraOut(); } });
      root.querySelector('#qedit')?.addEventListener('click', () => { setQuickPet(null); rerender(); });
      const qf = root.querySelector('#qform');
      if (qf) {
        bindBreedSize(root, { breedId: 'q-breed', sizeId: 'q-size', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
        const dog = root.querySelector('#q-dog');
        qf.addEventListener('change', () => { dog.hidden = new FormData(qf).get('q-species') === 'cat'; });
        qf.addEventListener('submit', async (e) => {
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
          const wc = await calc('weightCheck', { species, name: 'your pet', breed, sizeCat, birth }, kg); if (!wc.ok) { err.textContent = wc.message; return; }
          setQuickPet({ species, name: 'your pet', breed, sizeCat, birth, sex: 'unknown', neutered: true, weightKg: Math.round(kg * 100) / 100, bcs: 5, activity: 'normal', allergies: d.getAll('q-allergies'), health: [], answered: {}, logs: [{ on: today, kg, bcs: 5 }], quick: true });
          rerender();
        });
      }
      let pickerNode = null;
      bindQuickWeight(root, rerender);
      let keepPage = false;
      let updSeq = 0;
      const upd = async () => { if (!keepPage) shown = PAGE; keepPage = false; const mine = ++updSeq; const html = await results(makeCtx()); if (mine === updSeq) root.querySelector('#res').innerHTML = html; };
      root.querySelector('#res').addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { shown += PAGE; keepPage = true; upd(); } });
      const species$ = () => state.species || curPet()?.species || 'dog';
      const save = async () => {
        if (!getPet()) return; const before = getGoalHistory().length;
        await setGoal({ type: goal.type, targetKg: goal.targetKg, days: goal.days, custom: goal.custom, fromChart: goal.fromChart, kcalOverride: goal.kcalOverride });
        if (getGoalHistory().length > before) toast('Goal changed. Your previous goal is kept in your goal history.');
      };
      const drawTargets = () => { root.querySelector('#targets-body').innerHTML = targetsHtml(withKcal(makeCtx()), species$()); };
      const bindGoal = () => {
        const c = makeCtx();
        const redraw = () => { root.querySelector('#goalbox').innerHTML = goalBox(makeCtx()); bindGoal(); };
        root.querySelector('#gedit')?.addEventListener('click', () => { goalOpen = true; redraw(); });
        root.querySelector('#gdone')?.addEventListener('click', async () => { goalOpen = false; state.chartOpen = false; if (pickerNode) pickerNode.open = false; await save(); redraw(); root.querySelector('#res').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        const gd = root.querySelector('#gchart-d');
        if (gd && c.pet) {
          const pet = c.pet; const growth = gview.kind === 'growth';
          if (pickerNode) { gd.replaceWith(pickerNode); pickerNode.open = goalOpen || state.chartOpen; if (goalOpen) state.chartOpen = true; } // keep the live chart so a slider drag is never interrupted; opening the goal always shows it
          else {
            const start = () => {
              if (pickerNode) return; pickerNode = gd;
              mountTargetPicker(gd.querySelector('.tpick'), pet, gview, {
                from: pickerFrom(),
                onClamp: (b) => toast(`Kept within ${b.lo} to ${b.hi} kg`),
                onChange: async (d) => {
                  const before = goal.type; let type = 'grow';
                  if (!growth) { const kg = d.kg; type = kg < pet.weightKg - 0.05 ? 'lose' : kg > pet.weightKg + 0.05 ? 'gain' : 'maintain'; }
                  goal = growth ? { type: 'grow', targetKg: d.kg, days: d.days, custom: true, fromChart: true } : { type, targetKg: d.kg, days: d.days, fromChart: true };
                  await loadGoal(); save(); upd();
                  if (type !== before) { if (!growth) toast(`Switched to ${GOALS.find((g) => g.id === type).label.toLowerCase()}`); if (goalOpen) { redraw(); return; } }
                  const cc = makeCtx();
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
        const refresh = async () => { await loadGoal(); const cc = makeCtx(); root.querySelector('#goalsum').innerHTML = summary(cc); save(); drawTargets(); upd(); };
        form.addEventListener('change', async (e) => {
          if (e.target.name === 'goal') {
            goal = { type: e.target.value, targetKg: gv.targetFor[e.target.value], days: goal.days || 90 };
            await loadGoal(); save(); redraw(); drawTargets(); upd();
          } else if (e.target.id === 'days') { goal.days = Number(e.target.value); if (goal.type === 'grow') { delete goal.custom; delete goal.fromChart; } refresh(); }
        });
        form.addEventListener('input', (e) => { if (e.target.id === 'target') { const v = parseFloat(e.target.value); if (v > 0) { goal.targetKg = v; refresh(); } } });
        root.querySelector('#suggest')?.addEventListener('click', async () => { goal.days = gv.suggestDays; await loadGoal(); save(); redraw(); drawTargets(); upd(); });
      };
      bindGoal();

      // your own numbers (event delegation so the panel can redraw freely)
      const tbody = root.querySelector('#targets-body');
      const hint = (row, T) => { // sync one row in place (never redrawn mid-drag): value, on/off look, rule buttons, clear button
        const o = state.targets[state.unit][T.key]; const sb = shownBounds(bounds(T, state.unit, species$()), state.unit, factorFor(T, withKcal(makeCtx())));
        const txt = o ? `${(o.v * sb.F).toFixed(sb.dec)} ${sb.unit}` : '';
        row.classList.toggle('is-off', !o); row.querySelector('[data-tval]').textContent = o ? txt : 'Not set';
        row.querySelector('[data-tclear]').hidden = !o; row.querySelector('.seg').hidden = !o;
        const h = row.querySelector('[data-thint]'); h.hidden = !o; if (o) h.textContent = `${OP_WORD[o.op][0].toUpperCase() + OP_WORD[o.op].slice(1)} ${txt}: closest foods come first.`;
      };
      const usePreset = (id) => { applyPreset(id, species$()); root.querySelector('#more-opts').open = true; root.querySelector('#targets').open = true; drawTargets(); upd(); toast('Suggested numbers applied. Change any you like.'); };
      root.querySelector('#targets').addEventListener('toggle', (e) => { state.targetsOpen = e.target.open; });
      root.querySelector('#more-opts').addEventListener('toggle', (e) => { if (e.target.id === 'more-opts') state.moreOpen = e.target.open; });
      tbody.addEventListener('change', async (e) => {
        const t = e.target; const row = t.closest('[data-tkey]');
        if (/^op-/.test(t.name || '') && row) { state.targets[state.unit][row.dataset.tkey].op = t.value; state.preset = state.preset; hint(row, TG.find((x) => x.key === row.dataset.tkey)); upd(); return; }
        if (t.matches('[data-kcal-num]')) {
          const kb = gv.kcalBounds; let v = parseFloat(t.value); if (!Number.isFinite(v)) v = Math.round(gv.suggestedKcal);
          const k = Math.min(kb.hi, Math.max(kb.lo, Math.round(v))); if (k !== Math.round(v)) toast(kb.safe && Math.round(v) < kb.lo ? `Not below the safe level of ${kb.safe} kcal a day` : `Kept within ${kb.lo} to ${kb.hi} kcal a day`);
          goal.kcalOverride = k; await loadGoal(); save(); drawTargets(); root.querySelector('#goalsum') && (root.querySelector('#goalsum').innerHTML = summary(withKcal(makeCtx()))); upd();
        }
      });
      tbody.addEventListener('click', (e) => {
        const xb = e.target.closest('[data-tclear]');
        if (xb) { const row = xb.closest('[data-tkey]'); const T = TG.find((x) => x.key === row.dataset.tkey); delete state.targets[state.unit][T.key]; drawTargets(); upd(); return; }
        const btn = e.target.closest('[data-userec]'); if (!btn) return;
        const T = TG.find((x) => x.key === btn.dataset.userec); const c = makeCtx(); const min = c.targets?.[T.aafco]?.min; if (min == null) return;
        state.unit = 'kcal'; state.preset = null; const b = bounds(T, 'kcal', species$());
        state.targets.kcal[T.key] = { v: clamp(snap(min, b.step), b), op: 'min' }; drawTargets(); upd(); toast(`Minimum set to ${min} g per 1,000 kcal`);
      });
      tbody.addEventListener('input', async (e) => {
        const t = e.target; const row = t.closest('[data-tkey]');
        if (t.matches('[data-trange]') && row) { // slider is always in bounds; dragging it turns the number on
          const T = TG.find((x) => x.key === row.dataset.tkey); const F = shownBounds(bounds(T, state.unit, species$()), state.unit, factorFor(T, withKcal(makeCtx()))).F;
          const cur = state.targets[state.unit][T.key];
          state.targets[state.unit][T.key] = { v: parseFloat(t.value) / F, op: cur ? cur.op : 'about' }; hint(row, T); upd();
        } else if (t.matches('[data-kcal-range]')) {
          document.querySelector('#kcal-in').value = t.value; goal.kcalOverride = Math.round(+t.value); await loadGoal(); save(); root.querySelector('#goalsum') && (root.querySelector('#goalsum').innerHTML = summary(withKcal(makeCtx()))); upd();
        }
      });
      tbody.addEventListener('click', async (e) => {
        const pb = e.target.closest('[data-preset]'); if (pb) { usePreset(pb.dataset.preset); return; }
        if (e.target.closest('#tclear')) { state.targets = { label: {}, kcal: {} }; state.preset = null; drawTargets(); upd(); }
        if (e.target.closest('[data-kcal-reset]')) { delete goal.kcalOverride; await loadGoal(); save(); drawTargets(); root.querySelector('#goalsum') && (root.querySelector('#goalsum').innerHTML = summary(withKcal(makeCtx()))); upd(); }
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
      root.querySelector('#hide-al')?.addEventListener('change', (e) => { state.hideAllergy = e.target.checked; syncMoreBadge(); upd(); });
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
