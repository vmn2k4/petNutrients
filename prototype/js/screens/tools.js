import { TOXIC_ITEMS } from '../mock-data.js';
import { INGREDIENTS } from '../ingredients-data.js';
import { openSheet, toast } from '../sheet.js';
import { analyseMix, nutrientTargets, energyPlan, DIET_ROLES, todayStr } from '../domain.js';
import { getPet, changeDiet } from '../store.js';
import { GUIDES } from '../guides-data.js';
import { guideCard } from './guides.js';
import { rootOn, KCAL_NOTE, card, button, notice, verdictBadge, pageHead, iconBubble, meter, selectField, esc, icon, emptyState, expNote, stat, field } from '../ui.js';

export function hub() {
  const items = [['chart', 'Growth chart and goal planner', 'Puppy or kitten? See their percentile, set a goal weight, get daily calories.', '/pet/growth'], ['flask', 'Homemade mix builder', 'Cooking at home? Add ingredients and see what is missing or too much.', '/recipe'], ['alert', 'Can my pet eat this?', 'Grapes, chocolate, cheese? Quick answers before you share a snack.', '/toxic']];
  return { title: 'Free pet nutrition tools', html: `${pageHead('Tools')}<div class="page"><p class="lede">Free tools to check labels, plan puppy or kitten growth, test homemade recipes against AAFCO targets, and look up whether a snack is safe for dogs or cats. Start with a <a href="/new">pet profile</a> for personalised calories, or jump straight into a checker below.</p><h2 class="item-title" style="margin-bottom:var(--space-4)">Tools</h2><div class="grid grid--2">${items.map(([i, h, p, href]) => card(`<div class="stack">${iconBubble(i)}<div><h3 class="card__title">${h}</h3><p class="muted" style="margin:0">${p}</p></div></div>`, { href })).join('')}</div>
    <div class="row row--between" style="margin:var(--space-7) 0 var(--space-4)"><h2 class="item-title" style="margin:0">Guides</h2>${button({ label: 'All guides', href: '/guides', variant: 'secondary', iconName: 'arrow' })}</div><div class="grid grid--2">${GUIDES.slice(0, 4).map((g) => guideCard(g)).join('')}</div></div>` };
}

// ---- homemade mix builder: USDA ingredients (per 100 g) combined into one food ----
let rows = [{ id: 'chicken-breast-raw', amount: 40 }, { id: 'pumpkin-canned', amount: 20 }, { id: 'water', amount: 20 }];
let mode = 'pct'; let batchG = 1000;
const ingLabel = (x) => `${x.name}${x.state === 'raw' ? ' (raw)' : x.state === 'cooked' ? ' (cooked)' : x.state === 'canned' ? ' (canned)' : ''}`;
const ingOptions = (sel) => [...new Set(INGREDIENTS.map((x) => x.group))].map((g) => `<optgroup label="${esc(g)}">${INGREDIENTS.filter((x) => x.group === g).map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(ingLabel(x))}</option>`).join('')}</optgroup>`).join('');
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');

function mixBase() {
  const pet = getPet(); const species = pet?.species || 'dog';
  const base = pet || { species, birth: new Date(Date.now() - 4 * 365 * 86400000).toISOString().slice(0, 10), weightKg: 20, bcs: 5, sizeCat: 'IV' };
  return { pet, species, base };
}
const currentMix = () => { const { base } = mixBase(); return analyseMix(rows, INGREDIENTS, nutrientTargets(base), { mode, batchG }); };

function recipeOut() {
  const { pet, species, base } = mixBase(); const a = analyseMix(rows, INGREDIENTS, nutrientTargets(base), { mode, batchG });
  if (!a.grams) return notice('Add an ingredient and an amount to get started.');
  if (!(a.kcal > 0)) return notice('This mix has no calories yet. Add a food ingredient, not only water.');
  const bad = a.rows.filter((r) => r.state === 'bad'); const unknown = a.rows.filter((r) => r.state === 'unknown');
  const pctNote = a.pctSum != null && Math.abs(a.pctSum - 100) > 0.5 ? notice(`The percentages add up to ${fmt1(a.pctSum)}%. The numbers below describe only what is listed, not a full 100%. ${a.pctSum < 100 ? 'Add the rest (for example water) or raise an amount.' : 'Lower an amount so it adds up to 100%.'}`, 'caution') : '';
  const raw = a.lines.some((l) => l.state === 'raw' && /chicken|turkey|duck|beef|lamb|pork|venison|rabbit|liver|heart|kidney|tripe|gizzard|salmon|cod|whitefish|herring|mackerel|egg/i.test(l.name));
  const ratioNote = species === 'dog' && a.ratio != null && (a.ratio < 1 || a.ratio > 2) ? `<p class="small" style="margin:var(--space-3) 0 0;color:var(--color-caution)">${icon('alert')} Calcium to phosphorus is ${a.ratio.toFixed(2)} to 1. AAFCO asks for between 1 to 1 and 2 to 1.</p>` : '';
  const grams = pet ? (energyPlan(pet).hideKcal ? null : (energyPlan(pet).kcal / a.kcalPer100g) * 100) : null;
  return `<div class="stack">${pctNote}${card(`<div class="grid grid--3">${stat(`${fmt1(a.kcalPer100g)}`, 'kcal per 100 g', `${Math.round(a.kcalPerKg).toLocaleString('en-US')} kcal per kg`)}${stat(`${Math.round(a.moisturePct)}%`, 'water in the mix')}${stat(`${Math.round(a.grams)} g`, 'listed in total', `${Math.round(a.kcal)} kcal`)}</div>
    ${grams ? `<p class="small" style="margin:var(--space-3) 0 0">${esc(pet.name)} needs about ${Math.round(energyPlan(pet).kcal)} kcal a day, so about <strong>${Math.round(grams)} g</strong> of this mix a day if it were their whole diet. ${esc(KCAL_NOTE)}</p>` : ''}`)}
    ${card(`<div class="row row--between"><h2 style="margin:0">Per 1000 kcal</h2>${bad.length ? verdictBadge('bad', `${bad.length} gap${bad.length > 1 ? 's' : ''} found`) : unknown.length ? verdictBadge('caution', 'Not fully checked') : verdictBadge('good', 'No gaps on these 4 nutrients')}</div>
    <p class="muted small">${pet ? `Checked against ${esc(pet.name)}'s profile.` : 'Checked against an adult dog. Add a profile to personalise.'}</p>
    <div class="stack">${a.rows.map((r) => meter({ label: r.label, value: r.value, unit: 'g', min: r.target?.min, max: r.target?.max, state: r.state })).join('')}</div>${ratioNote}`)}
    ${raw ? notice('Raw meat, fish and eggs can carry bacteria such as Salmonella that can make pets and people sick. Talk to your vet before feeding raw, and wash hands and bowls well.', 'caution') : ''}
    ${notice(`This checks only protein, fat, calcium and phosphorus. A complete home diet also needs vitamins, trace minerals, essential fatty acids${species === 'cat' ? ' and taurine (essential for cats)' : ''}. A mix of meat and vegetables with no calcium source will show a calcium gap. Ask a veterinary nutritionist to review any recipe you feed long term.`, 'caution')}
    <div class="row">${pet ? button({ label: `Add this mix to ${pet.name}'s diet`, variant: 'primary', iconName: 'plus', attrs: 'id="to-diet"' }) : `<a class="btn btn--dark" href="/new">Create a free account to save it to a diet</a>`}</div>
    <p class="hint">Nutrient values: USDA FoodData Central (public domain), per 100 g of the food as listed (raw foods raw, cooked foods cooked). Real foods vary, so treat these as estimates.</p></div>`;
}

function openToDiet(root) {
  const pet = getPet(); const mix = currentMix(); if (!pet || !(mix.kcal > 0)) return;
  const plan = energyPlan(pet); const perDay = plan.hideKcal ? null : (plan.kcal / mix.kcalPer100g) * 100;
  openSheet({
    title: 'Add this mix to the diet',
    body: `<form id="mx" class="stack" novalidate>
      <p class="muted" style="margin:0">${fmt1(mix.kcalPer100g)} kcal per 100 g${perDay ? `. ${esc(pet.name)} needs about ${Math.round(plan.kcal)} kcal a day, so about ${Math.round(perDay)} g a day if it is their whole diet (our estimate).` : '.'}</p>
      ${field({ id: 'mx-name', label: 'Name', value: 'Homemade mix' })}
      <div class="grid grid--3"><div class="field"><label for="mx-amount">How much each meal (g)</label><input class="input" id="mx-amount" type="number" min="1" step="any" inputmode="decimal" value="${perDay ? Math.round(perDay / 2) : ''}"></div>
        <div class="field"><label for="mx-times">Times a day</label><input class="input" id="mx-times" type="number" min="0.5" max="12" step="0.5" inputmode="decimal" value="2"></div>
        <div class="field"><label for="mx-role">This is their</label><select class="select" id="mx-role">${Object.entries(DIET_ROLES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div></div>
      <p class="hint" style="margin:0">Starts today. Ask your vet before changing a diet. ${esc(KCAL_NOTE)}</p>
      <div id="mx-err" class="error-text" role="alert"></div>
      <div class="row row--between">${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save to diet', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount: (body, close) => {
      body.querySelector('#mx').addEventListener('submit', (e) => {
        e.preventDefault(); const err = body.querySelector('#mx-err'); err.textContent = '';
        const r = changeDiet({ date: todayStr(), stops: [], starts: [{ foodName: body.querySelector('#mx-name').value.trim() || 'Homemade mix', foodId: null, role: body.querySelector('#mx-role').value, amount: Number(body.querySelector('#mx-amount').value), unit: 'g', timesPerDay: Number(body.querySelector('#mx-times').value), kcalPerKg: Math.round(mix.kcalPerKg), recipe: mix.lines.map((l) => ({ id: l.id, name: l.name, grams: Math.round(l.grams * 10) / 10 })) }] });
        if (!r.ok) { err.textContent = r.message; return; }
        close(); toast('Added to the diet'); const note = root.querySelector('#to-diet'); if (note) note.insertAdjacentHTML('afterend', ' <a href="/pet/diet">See the diet</a>');
      });
    },
  });
}

export function recipe() {
  return {
    title: 'Homemade Pet Food Mix Builder – Calories & AAFCO Gaps',
    html: `${pageHead('Homemade mix builder')}<div class="page page--narrow">${expNote()}
      <p class="lede">Combine real ingredients into one homemade food and see its calories per 100 g, then check protein, fat, calcium and phosphorus per 1000 kcal against the AAFCO nutrient profile for your pet. Ingredient values come from USDA FoodData Central. This is a calculator, not a complete diet formulation: work with a vet nutritionist for long-term home cooking.</p>
      <div class="stack-lg">${card(`<form id="rf" class="stack"><div class="field"><span class="legend" id="md-l">Enter amounts as</span><div class="seg seg--2" role="radiogroup" aria-labelledby="md-l"><label><input type="radio" name="md" value="pct" ${mode === 'pct' ? 'checked' : ''}><span>% of the batch</span></label><label><input type="radio" name="md" value="g" ${mode === 'g' ? 'checked' : ''}><span>Grams</span></label></div></div>
        <div class="field" id="batch-f" ${mode === 'pct' ? '' : 'hidden'}><label for="batch">Batch size (g)</label><input class="input" id="batch" type="number" min="10" step="any" inputmode="decimal" value="${batchG}"><span class="hint">Only used to show grams. Calories per 100 g do not depend on it.</span></div>
        <div id="rows" class="stack"></div>${button({ label: 'Add ingredient', variant: 'secondary', iconName: 'plus', attrs: 'id="add" type="button"' })}</form>`)}<div id="rout"></div></div></div>`,
    mount(root) {
      const out = () => { root.querySelector('#rout').innerHTML = recipeOut(); };
      const draw = () => {
        root.querySelector('#rows').innerHTML = rows.map((r, i) => `<div class="input-row" style="grid-template-columns:1fr 7rem auto;align-items:end"><div class="field"><label for="ing${i}">Ingredient</label><select class="select" id="ing${i}" data-i="${i}" data-f="id">${ingOptions(r.id)}</select></div><div class="field"><label for="g${i}">${mode === 'pct' ? 'Percent' : 'Grams'}</label><input class="input" id="g${i}" type="number" min="0" step="any" inputmode="decimal" value="${r.amount}" data-i="${i}" data-f="amount"></div><button class="btn btn--ghost" type="button" aria-label="Remove ingredient ${i + 1}" data-rm="${i}">${icon('trash')}</button></div>`).join('');
        root.querySelector('#batch-f').hidden = mode !== 'pct'; out();
      };
      rootOn(root, 'input', 'mix', (e) => { const t = e.target; if (t.dataset?.f) { rows[+t.dataset.i][t.dataset.f] = t.dataset.f === 'amount' ? Number(t.value) : t.value; out(); } else if (t.id === 'batch') { batchG = Number(t.value) || 1000; out(); } });
      rootOn(root, 'change', 'mix', (e) => { const t = e.target; if (t.name === 'md') { mode = t.value; draw(); } else if (t.dataset?.f) { rows[+t.dataset.i][t.dataset.f] = t.dataset.f === 'amount' ? Number(t.value) : t.value; out(); } });
      rootOn(root, 'click', 'mix', (e) => { const rm = e.target.closest('[data-rm]'); if (rm) { rows.splice(+rm.dataset.rm, 1); draw(); } if (e.target.closest('#add')) { rows.push({ id: INGREDIENTS[0].id, amount: mode === 'pct' ? 10 : 100 }); draw(); } if (e.target.closest('#to-diet')) openToDiet(root); });
      draw(); 
    },
  };
}

export function toxic() {
  const draw = (q, sp) => {
    const items = TOXIC_ITEMS.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
    const text = { good: 'Generally safe', caution: 'Go easy', bad: 'Dangerous, avoid' };
    return items.length ? items.map((i) => card(`<div class="row row--between"><h2 class="item-title" style="margin:0">${esc(i.name)}</h2>${verdictBadge(i[sp], text[i[sp]])}</div><p class="muted" style="margin:var(--space-2) 0">${esc(i.note)}</p><p style="margin:var(--space-2) 0 0"><a href="/can-${sp}s-eat/${i.slug}">Read the full answer for ${sp}s</a></p>`)).join('') : emptyState({ img: 'cut-kitten', compact: true, title: 'Not in our list yet', text: 'When unsure, call your vet or an animal poison hotline.' });
  };
  return {
    title: 'Can My Dog or Cat Eat This? Toxic Food Checker (Free)',
    html: `${pageHead('Can my pet eat this?')}<div class="page page--narrow">${expNote()}
      <p class="lede">Pets steal snacks. Before you share grapes, chocolate, cheese or chicken, check whether it is safe, risky or toxic for dogs and cats. We only list foods we can back with published sources such as the ASPCA Animal Poison Control people-foods list. This is general guidance, not veterinary advice — if your pet already ate something dangerous, call your vet or a poison hotline now.</p>
      <div class="stack-lg"><form class="row" onsubmit="return false" style="align-items:end"><div class="field" style="flex:1;min-width:12rem"><label for="q">Food</label><input class="input" id="q" type="search" placeholder="e.g. grapes"></div>${selectField({ id: 'sp', label: 'Pet', options: [{ value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' }], value: getPet()?.species || 'dog' })}</form>
      <div id="tl" class="stack" aria-live="polite"></div>${notice('Sample entries for the prototype. The real list uses the BioVet veterinary dataset (CC BY 4.0) and ASPCA facts. If your pet ate something dangerous, call your vet or a pet poison line now.', 'caution')}</div></div>`,
    mount(root) {
      const q = root.querySelector('#q'); const sp = root.querySelector('#sp'); const tl = root.querySelector('#tl');
      const go = () => { tl.innerHTML = draw(q.value, sp.value); };
      q.addEventListener('input', go); sp.addEventListener('change', go); go();
    },
  };
}
