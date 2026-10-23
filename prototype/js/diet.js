// DIET: what the pet eats now, how it changed over time, and what happened to growth during each stretch.
// The log is descriptive. Growth depends on age, health, treats and season, so nothing here claims a food "caused" a change.
import { rootOn, card, button, badge, esc, icon, comboField, mountCombos, disclosure } from './ui.js';
import { openSheet, toast } from './sheet.js';
import { KCAL_NOTE } from './ui.js';
import { getRegion, getDiet, changeDiet, undoDietChange, setDietKcal, listFoods, listSupplements, listTreats } from './store.js';
import { calc } from './calc.js';
import { perDay, unitWords, fmtDay, todayStr, round } from './format.js';
import { DIET_ROLES, DIET_UNITS, SUPPLEMENTS } from './reference.js';

const foodLabel = (f) => `${f.brand} ${f.name}`;
const amountText = (it) => `${it.amount} ${unitWords(it.unit, it.amount)} × ${it.timesPerDay} a day`;
const totalText = (it) => `${round(perDay(it), 1)} ${unitWords(it.unit, perDay(it))} a day`;

// ---- the page ---------------------------------------------------------------------------------------
// Everything the page shows is worked out by calc in one request: calories per item and in total, against the plan, the history and its effect on weight.
export async function loadDietView(pet) {
  const foods = new Map([...listFoods(), ...listTreats()].map((f) => [f.id, f]));
  const used = [...new Set((pet.diet || []).map((it) => it.foodId).filter(Boolean))].map((id) => foods.get(id)).filter(Boolean);
  return calc('dietView', pet, used);
}

// `dv` is the diet view from loadDietView.
export function dietHtml(pet, dv) {
  const diet = getDiet(); const now = dv.current; const plan = dv.plan;
  const treatsById = new Map(listTreats().map((t) => [t.id, t]));
  const foods = new Map([...listFoods(), ...listTreats()].map((f) => [f.id, f]));
  const k = dv.kcal;
  const foodsNow = now.filter((it) => it.role !== 'supplement' && it.role !== 'treat'); const suppsNow = now.filter((it) => it.role === 'supplement'); const treatsNow = now.filter((it) => it.role === 'treat');
  const perText = (it, ik) => (it.unit === 'g' ? `${Math.round(ik.perUnit * 100)} kcal per 100 g` : `${Math.round(ik.perUnit * 10) / 10} kcal per ${it.unit}`);
  const SRC = { label: 'from the label', estimate: 'estimated from the label analysis', yours: 'your number', mix: 'homemade mix' };
  const energyLine = (it, f) => {
    if (it.role === 'supplement') return '';
    const ik = dv.items[it.id];
    return ik ? `<span class="small muted"> · ${Math.round(ik.perDay)} kcal</span>` : ` <button type="button" class="linkbtn small" data-diet="kcal" data-item="${it.id}">${it.unit === 'g' ? 'Add kcal per 100 g' : `Add kcal per ${esc(it.unit)}`}</button>`;
  };
  const rowHtml = (it) => { const f = it.foodId ? foods.get(it.foodId) : null; const fl = dv.flags[it.id]; const wrongSpecies = fl?.wrongSpecies; const iw = fl?.bad;
    return `<li class="diet-row"><div class="diet-row__main"><strong>${esc(it.foodName)}</strong>${it.role !== 'main' && it.role !== 'supplement' ? ` ${badge(DIET_ROLES[it.role], 'info')}` : ''}${wrongSpecies ? ` ${badge(`Made for ${f.species}s`, 'bad', 'alert')}` : iw ? ` ${badge('Check ingredients', 'bad', 'alert')}` : ''}
      <div class="small muted">${esc(amountText(it))}${energyLine(it, f)}</div>${wrongSpecies ? `<div class="small" style="color:var(--color-bad)">This is a ${f.species} food and ${esc(pet.name)} is a ${pet.species}. ${f.species === 'cat' ? 'Cat food is richer in protein and fat and is not balanced for dogs.' : 'Dog food is not balanced for cats, who also need taurine.'} Please check with your vet.</div>` : iw ? `<div class="small" style="color:var(--color-bad)">${esc(iw.text)}</div>` : ''}</div>
      <div class="diet-row__acts"><button class="btn btn--ghost btn--small" type="button" data-diet="amount" data-item="${it.id}">Change amount</button>${it.role === 'supplement' ? '' : `<button class="btn btn--ghost btn--small" type="button" data-diet="replace" data-item="${it.id}">Replace</button>`}<button class="btn btn--ghost btn--small" type="button" data-diet="stop" data-item="${it.id}">Stop</button></div></li>`; };
  const tgt = dv.target; const planned = tgt ? tgt.kcal : null; const vs = planned ? dv.vs : null;
  const barPct = vs && vs.pct != null ? Math.min(100, Math.max(0, vs.pct)) : 0;
  const verdict = !vs ? '' : { about: 'About right', below: 'Below the goal', above: 'Above the goal', unknown: 'Some foods have no calories yet', none: '' }[vs.state];
  const goalCard = card(planned
    ? `<div class="dietgoal"><div class="dietgoal__eat"><span class="small muted">Eating</span><strong>${k.known ? k.kcal.toLocaleString('en-US') : '–'}</strong></div>
      <div class="dietgoal__goal"><span class="small muted">Daily goal · ${esc(tgt.label)}</span><strong class="dietgoal__num">${planned.toLocaleString('en-US')}<small> kcal</small></strong></div></div>
      <div class="gbar" role="img" aria-label="${vs && vs.pct != null ? `${vs.pct} percent of the goal` : 'no calories counted'}"><span style="width:${barPct}%"></span></div>${vs && vs.state === 'unknown' ? '<p class="small muted" style="margin:var(--space-2) 0 0">Some foods have no calories yet.</p>' : ''}${plan.stage !== 'growth' ? `<p class="small muted" style="margin:var(--space-2) 0 0">Estimated ideal weight about ${round(plan.ideal, 1)} kg.${plan.losing ? ` Never go below ${Math.round(plan.floor)} kcal without a vet nutritionist.` : ''}</p>` : ''}`
    : '<div class="dietgoal"><strong class="dietgoal__num">Ask your vet</strong></div>', { cls: 'card--tight' });
  const current = card(`<div class="row row--between"><h2 style="margin:0">What ${esc(pet.name)} eats now</h2>${button({ label: foodsNow.length ? 'Add a food' : 'Add what they eat', variant: `primary btn--small${foodsNow.length ? '' : ' btn--cta'}`, iconName: 'plus', attrs: 'data-diet="add"' })}</div>
    ${foodsNow.length ? `<ul class="diet-list">${foodsNow.map(rowHtml).join('')}</ul>` : `<p class="muted" style="margin:var(--space-3) 0 0">Nothing added yet.</p>`}
    <div class="row" style="margin-top:var(--space-3)">${button({ label: 'Cook for them? Build a homemade mix', href: '/recipe', variant: 'ghost btn--small', iconName: 'flask' })}</div>`);
  const budget = planned ? Math.round(dv.treatShare * planned) : null; const tPct = planned ? Math.round((k.treatKcal / planned) * 100) : null;
  const treatLine = treatsNow.length && planned ? `<p class="small" style="margin:var(--space-3) 0 0">Treats add about <strong>${k.treatKcal} kcal</strong> a day, ${tPct}% of ${esc(pet.name)}'s plan. The usual limit is about 10%, ${budget} kcal.${k.treatKcal > budget ? ' <span style="color:var(--color-caution)">That is above the usual limit: consider fewer treats or a smaller food portion.</span>' : ''}${treatsNow.some((it) => !(treatsById.get(it.foodId)?.kcalPerTreat)) ? ' Some treats have no calories counted.' : ''}</p>` : '';
  const treatsCard = card(`<div class="row row--between"><h2 style="margin:0">Treats</h2>${button({ label: 'Add a treat', variant: 'secondary btn--small', iconName: 'plus', attrs: 'data-diet="addtreat"' })}</div>
    ${treatsNow.length ? `<ul class="diet-list">${treatsNow.map(rowHtml).join('')}</ul>${treatLine}` : `<p class="muted" style="margin:var(--space-3) 0 0">Keep treats under about 10% of the day.</p>`}
    `);
  const supplements = card(`<div class="row row--between"><h2 style="margin:0">Supplements</h2>${button({ label: 'Add a supplement', variant: 'secondary btn--small', iconName: 'plus', attrs: 'data-diet="addsupp"' })}</div>
    ${suppsNow.length ? `<ul class="diet-list">${suppsNow.map(rowHtml).join('')}</ul>` : `<p class="muted" style="margin:var(--space-3) 0 0">None added.</p>`}
    <p class="hint" style="margin:var(--space-3) 0 0">Not counted in calories. Ask your vet before starting one.</p>`);
  // history: one entry per change day, with what happened to weight from that day until the next change
  const changes = dv.changes; const periods = new Map(dv.periods.map((p) => [p.start, p]));
  const lines = (c) => [
    ...c.replaced.map((r) => `Replaced <strong>${esc(r.from.foodName)}</strong> (${esc(amountText(r.from))}) with <strong>${esc(r.to.foodName)}</strong> (${esc(amountText(r.to))})`),
    ...c.amountChanges.map((r) => `Changed <strong>${esc(r.to.foodName)}</strong> from ${esc(amountText(r.from))} to ${esc(amountText(r.to))}`),
    ...c.started.filter((s) => !c.replaced.some((r) => r.to.id === s.id) && !c.amountChanges.some((r) => r.to.id === s.id)).map((s) => `${c.isFirst ? 'Started' : 'Added'} <strong>${esc(s.foodName)}</strong> (${esc(amountText(s))})`),
    ...c.stopped.filter((s) => !c.replaced.some((r) => r.from.id === s.id) && !c.amountChanges.some((r) => r.from.id === s.id)).map((s) => `Stopped <strong>${esc(s.foodName)}</strong>`),
  ];
  const impact = (p) => {
    if (!p) return '';
    const span = p.end ? `until ${fmtDay(p.end)}` : 'until now';
    if (p.startKg == null || p.endKg == null || p.weighIns === 0) return `<p class="small muted">No weigh-ins ${span} yet. Weigh in to see how weight moved on this diet.</p>`;
    const pace = p.enough && p.weeklyGain != null ? ` · ${p.weeklyGain > 0 ? '+' : ''}${p.weeklyGain.toFixed(1)} kg a week` : '';
    const pct = p.enough && p.pctStart != null ? ` · ${p.pctStart}th to ${p.pctEnd}th percentile` : '';
    return `<p class="small">Weight ${span}: <strong>${round(p.startKg, 1)} to ${round(p.endKg, 1)} kg</strong>${pace}${pct}${p.enough ? '' : `<span class="muted"> (not enough weigh-ins yet to read a pace: about 3 over 2 weeks)</span>`}</p>`;
  };
  const history = changes.length ? card(`<h2>Diet changes and what happened after</h2><ol class="diet-timeline">${changes.map((c, i) => `<li class="diet-change"><span class="diet-dot" aria-hidden="true">${changes.length - i}</span><div><div class="row row--between"><strong>${fmtDay(c.date)}</strong>${i === 0 ? `<button class="linkbtn small" type="button" data-diet-undo="${c.date}">Undo this change</button>` : ''}</div>
      ${lines(c).map((l) => `<p style="margin:var(--space-1) 0 0">${l}</p>`).join('')}${impact(periods.get(c.date))}</div></li>`).join('')}</ol>
    <p class="hint" style="margin:var(--space-3) 0 0">This shows what happened after each change. Growth also depends on age, health, treats and the season, so it does not prove that a food caused a change.</p>`) : '';
  return `${goalCard}${current}${treatsCard}${supplements}${history ? disclosure('Diet history and what happened after', history) : ''}`;
}

// ---- the change sheet -------------------------------------------------------------------------------
const MODES = [['replace', 'Replace a food'], ['add', 'Add a food'], ['amount', 'Change amount'], ['stop', 'Stop a food']];

// Opens the add sheet for a treat or supplement picked elsewhere (Find food), with the product already chosen.
export function openAddItem(pet, kind, item, rerender) {
  openChange(pet, 'add', null, rerender, kind === 'supplement' ? { supplement: true, prefill: item } : kind === 'treat' ? { treat: true, prefill: item } : { prefill: item });
}

// Add calories to a food that is already in the diet (no new history entry: the calories are a fact about the food).
async function openKcal(pet, itemId, rerender) {
  const it = getDiet().find((x) => x.id === itemId); if (!it) return;
  const g = it.unit === 'g'; const plan = (await calc('petSummary', pet)).plan;
  openSheet({
    title: `Calories in ${it.foodName}`,
    body: `<form id="kc" class="stack" novalidate>
      <p class="muted" style="margin:0">${esc(pet.name)} gets ${esc(amountText(it))}. Enter the calories for ${g ? '100 g' : `one ${esc(it.unit)}`} from the label or the maker's website, and we count it.</p>
      <div class="field"><label for="kc-v">${g ? 'kcal per 100 g' : `kcal in one ${esc(it.unit)}`}</label><input class="input" id="kc-v" type="number" min="1" max="${g ? 950 : 5000}" step="any" inputmode="decimal" autofocus></div>
      <p class="small" id="kc-live" style="margin:0" aria-live="polite"></p>
      <p class="hint" style="margin:0">This is your number, kept on this food only. Labels often say "kcal per cup" or "kcal/kg" (divide kcal/kg by 10 for per 100 g).</p>
      <div id="kc-err" class="error-text" role="alert"></div>
      <div class="row row--between">${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-close type="button"' })}${button({ label: 'Save calories', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount: (body, close) => {
      const inp = body.querySelector('#kc-v'); const live = body.querySelector('#kc-live');
      inp.addEventListener('input', () => { const v = Number(inp.value); const per = g ? v / 100 : v; live.textContent = v > 0 ? `That is about ${Math.round(it.amount * per)} kcal a meal, ${Math.round(perDay(it) * per)} kcal a day${plan.hideKcal ? '' : ` (${Math.round((perDay(it) * per / plan.kcal) * 100)}% of ${pet.name}'s plan)`}.` : ''; });
      body.querySelector('#kc').addEventListener('submit', async (e) => { e.preventDefault(); const r = await setDietKcal(it.id, inp.value); if (!r.ok) { body.querySelector('#kc-err').textContent = r.message; return; } close(); toast('Calories saved'); rerender(); });
    },
  });
}

export function mountDiet(root, pet, rerender) {
  rootOn(root, 'click', 'diet', (e) => {
    const b = e.target.closest('[data-diet]'); if (b) { if (b.dataset.diet === 'kcal') openKcal(pet, b.dataset.item, rerender); else if (b.dataset.diet === 'addsupp') openChange(pet, 'add', null, rerender, { supplement: true }); else if (b.dataset.diet === 'addtreat') openChange(pet, 'add', null, rerender, { treat: true }); else openChange(pet, b.dataset.diet, b.dataset.item, rerender); return; }
    // On a phone the whole row is the target: one tap opens the actions for that food.
    const row = e.target.closest('.diet-row');
    if (row && matchMedia('(max-width: 639px)').matches) {
      const id = row.querySelector('[data-item]')?.dataset.item; const name = row.querySelector('strong')?.textContent || 'Food';
      openSheet({ title: name, body: `<div class="stack">${[['amount', 'Change amount'], ['replace', 'Replace with another food'], ['stop', 'Stop this food']].map(([m, l]) => `<button class="btn btn--secondary btn--block" type="button" data-act="${m}">${l}</button>`).join('')}</div>`, onMount(body, close) { body.addEventListener('click', (ev) => { const a = ev.target.closest('[data-act]'); if (a) { close(); setTimeout(() => openChange(pet, a.dataset.act, id, rerender), 250); } }); } });
      return;
    }
    const u = e.target.closest('[data-diet-undo]'); if (u && confirm('Undo this change? Foods added on that day are removed and foods it stopped are brought back.')) { undoDietChange(u.dataset.dietUndo).then(() => { toast('Change undone'); rerender(); }); }
  });
}

async function openChange(pet, startMode, itemId, rerender, opts = {}) {
  const sup = !!opts.supplement; const tre = !!opts.treat;
  const dv0 = await loadDietView(pet); const items = dv0.current;
  // Supplements: catalogue products for this species once they exist, then the built-in common ones. Typing any other name still works.
  const fitIds = new Set(((await calc('supplementsView', { pet, species: pet.species, type: 'all', limit: 5000 })).items).map((i) => i.id));
  const catSupps = listSupplements().filter((sp) => fitIds.has(sp.id));
  const suppOptions = [...catSupps.map((s) => foodLabel(s)), ...SUPPLEMENTS.filter((n) => !catSupps.some((s) => foodLabel(s).toLowerCase() === n.toLowerCase()))];
  const treatList = listTreats().filter((t) => t.species === pet.species);
  const region = getRegion(); // the picker lists foods for this pet's species that are sold in the owner's region, like Find food
  const foods = sup ? catSupps : tre ? treatList : listFoods().filter((f) => f.species === pet.species && (region === 'all' || (f.markets || []).includes(region))); const byLabel = new Map(foods.map((f) => [foodLabel(f).toLowerCase(), f]));
  let mode = items.length || startMode === 'add' ? startMode : 'add';
  openSheet({
    title: sup ? 'Add a supplement' : tre ? 'Add a treat' : 'Change what they eat',
    body: `<form id="dc" class="stack" novalidate>
      <div class="field"><label for="dc-date">When did it change?</label><input class="input" id="dc-date" type="date" value="${todayStr()}" max="${todayStr()}" min="${esc(pet.birth)}"><span class="hint">Today, or the day it really changed. You can go back in time.</span></div>
      <fieldset class="field"><legend class="legend">What changed?</legend><div class="choices" role="radiogroup">${MODES.map(([v, l]) => `<label class="choice"><input type="radio" name="dc-mode" value="${v}" ${v === mode ? 'checked' : ''} ${!items.length && v !== 'add' ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <div class="field" data-for="replace amount stop"><label for="dc-item">Which food?</label><select class="select" id="dc-item">${items.map((it) => `<option value="${it.id}" ${it.id === itemId ? 'selected' : ''}>${esc(it.foodName)} (${esc(amountText(it))})</option>`).join('')}</select></div>
      ${sup || tre ? '' : `<div class="segtabs" role="group" aria-label="How to add" data-for="replace add"><button type="button" class="chipbtn chipbtn--toggle" data-tab-btn="food" aria-pressed="true">${icon('bowl')}<span>Choose a food</span></button><button type="button" class="chipbtn chipbtn--toggle" data-tab-btn="mix" aria-pressed="false">${icon('flask')}<span>Select ingredients</span></button></div>`}
      <div data-for="replace add" data-tab="food">${comboField({ id: 'dc-food', label: sup ? 'Supplement' : tre ? 'Treat' : 'New food', options: sup ? suppOptions : foods.map(foodLabel), placeholder: sup ? 'Pick one or type any supplement' : tre ? 'Pick a treat from the list or type any treat' : 'Pick from the list or type any food', hint: 'Not in the list? Just type the name.' })}
</div>
      ${sup || tre ? '' : `<div class="stack" data-for="replace add" data-tab="mix" hidden id="dc-mix"><div class="field"><label for="dc-mixname">Name (optional)</label><input class="input" id="dc-mixname" placeholder="Homemade mix" autocomplete="off"></div>
        <div><span class="legend">Ingredients and grams in one meal</span><div id="dc-mix-rows" class="stack" style="margin-top:var(--space-2)"></div><div class="row" style="margin-top:var(--space-3)"><button type="button" class="btn btn--ghost btn--small" id="dc-mix-add">${icon('plus')}<span>Add ingredient</span></button></div></div>
        <p class="small" id="dc-mix-out" style="margin:0" aria-live="polite"></p><span class="hint">Nutrients from USDA FoodData Central, per 100 g as listed. Estimates; a complete home diet also needs vitamins and minerals, so ask your vet.</span></div>`}
      <div class="grid grid--3" data-for="replace add amount"><div class="field" data-tab="food"><label for="dc-amount">${tre ? 'How many each time' : sup ? 'How much each time' : 'How much each meal'}</label><input class="input" id="dc-amount" type="number" min="0.1" step="any" inputmode="decimal"></div>
        <div class="field" data-for="replace add" data-tab="food"><label for="dc-unit">Unit</label><select class="select" id="dc-unit">${Object.entries(DIET_UNITS).map(([v, l]) => `<option value="${v}" ${(sup && v === 'scoop') || (tre && v === 'piece') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="dc-times">Times a day</label><input class="input" id="dc-times" type="number" min="0.5" max="12" step="0.5" inputmode="decimal" value="2"></div></div>
      ${sup ? '' : '<div class="dclive" id="dc-live" data-for="replace add amount" aria-live="polite" hidden></div>'}
      ${sup || tre ? '' : `<div class="field" id="dc-gpc-f" data-tab="food" hidden><label for="dc-gpc">About how many grams in one cup?</label><input class="input" id="dc-gpc" type="number" min="10" max="400" step="any" inputmode="decimal"><span class="hint">We have no cup size for this food. Weigh a level cup of it, or give your best guess (dry food is often 100 to 130 g a cup).</span></div>`}
      ${sup ? '' : `<div class="field" data-for="replace add" id="dc-kcal-f" data-tab="food"><label for="dc-kcal" id="dc-kcal-l">Calories in it, kcal per 100 g (optional)</label><input class="input" id="dc-kcal" type="number" min="1" max="5000" step="any" inputmode="decimal"><span class="hint" id="dc-kcal-src" aria-live="polite"></span><span class="hint">Only if the food is not in our list, or you know better than the label. It is kept as your number. Making your own food? Use the "Select ingredients" tab.</span></div>`}
      <div class="field" data-for="replace add"><label for="dc-role">This is their</label><select class="select" id="dc-role">${Object.entries(DIET_ROLES).map(([v, l]) => `<option value="${v}" ${(sup && v === 'supplement') || (tre && v === 'treat') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${sup ? '<p class="hint" data-for="add" style="margin:0">A supplement is listed but not counted in the calories. Ask your vet before starting one, especially if your pet takes medicine.</p>' : ''}${tre ? '<p class="hint" id="dc-treat-hint" data-for="add" style="margin:0">Pick a treat to see its calories and how many fit in a day. Treats are best kept to about 10% of the day, all together.</p>' : ''}<p class="hint" data-for="replace" style="margin:0">Most pets do better switching slowly over about a week, mixing the old and new food. Add the new food first and stop the old one a few days later if you are mixing.</p>
      <div id="dc-err" class="error-text" role="alert"></div>
      <div class="row row--between">${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save change', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount: (body, close) => {
      mountCombos(body);
      if (opts.prefill) { const pi = body.querySelector('#dc-food'); pi.value = foodLabel(opts.prefill); pi.dispatchEvent(new Event('change', { bubbles: true })); }
      // a food picked elsewhere: suggest an amount from the pet's calorie plan (our estimate, two meals a day) so it is one tap to save
      if (opts.prefill && !sup && !tre && opts.prefill.kcalPerKg) {
        calc('suggestAmount', pet, opts.prefill).then((sg) => {
          if (!sg) return;
          body.querySelector('#dc-amount').value = sg.perMeal; body.querySelector('#dc-unit').value = 'g'; body.querySelector('#dc-times').value = String(sg.meals);
          const hint = document.createElement('p'); hint.className = 'hint'; hint.style.margin = '0'; hint.textContent = `Suggested from ${pet.name}'s calorie plan (about ${Math.round(sg.kcal)} kcal a day): ${sg.perMeal} g, ${sg.meals} times a day. Change it if the bag or your vet says otherwise.`; body.querySelector('#dc-err').before(hint);
        });
      }
      if (tre) {
        body.querySelector('#dc-times').value = '1';
        const hint = body.querySelector('#dc-treat-hint');
        const upd = async () => {
          const t = byLabel.get((body.querySelector('#dc-food').value || '').trim().toLowerCase()); if (!t) return;
          const { plan: p, bad } = await calc('treatHintView', pet, t);
          const bits = [t.kcalPerTreat ? `${Math.round(t.kcalPerTreat * 10) / 10} kcal each` : t.kcalPerKg ? `${Math.round(t.kcalPerKg / 10)} kcal per 100 g, so pick the unit "g" and count in grams` : 'calories not stated, so we cannot count it'];
          if (p.count === 0) bits.push(`one of these is more than 10% of ${pet.name}'s day, so it is best as a rare, shared treat`); else if (p.count != null) bits.push(`${pet.name} could have up to ${p.count} a day if treats are all they get${p.limitedBy === 'label' ? ' (label limit)' : ''}, 10% of the day`);
          hint.textContent = `${t.brand} ${t.name}: ${bits.join('. ')}.${bad ? ` Warning: ${bad.text}` : ''}`;
          if (!t.kcalPerTreat && t.kcalPerKg) body.querySelector('#dc-unit').value = 'g';
        };
        body.querySelector('#dc-food').addEventListener('change', upd); body.querySelector('#dc-food').addEventListener('input', upd); if (body.querySelector('#dc-food').value) upd();
      }
      const form = body.querySelector('#dc'); const g = (id) => body.querySelector(`#${id}`);
      const cur = () => items.find((i) => i.id === g('dc-item')?.value);
      let last = '';
      let tab = 'food';
      const sync = () => {
        mode = form.querySelector('[name=dc-mode]:checked')?.value || 'add';
        body.querySelectorAll('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(mode); });
        // each field is shown when it belongs to this mode AND to the current tab (food or ingredients); the grams-per-cup box is managed by live()
        body.querySelectorAll('[data-tab]').forEach((el) => {
          if (el.id === 'dc-gpc-f') return;
          const forOk = !el.dataset.for || el.dataset.for.split(' ').includes(mode);
          const tabOk = ['add', 'replace'].includes(mode) ? el.dataset.tab === tab : el.dataset.tab === 'food';
          el.hidden = !(forOk && tabOk);
        });
        live();
        const key = `${mode}|${g('dc-item')?.value}`; if (key === last) return; last = key;
        if (mode === 'amount' && cur()) { g('dc-amount').value = cur().amount; g('dc-times').value = cur().timesPerDay; }
        if (mode === 'replace' && cur()) { g('dc-role').value = cur().role; g('dc-unit').value = cur().unit; if (!g('dc-amount').value) g('dc-amount').value = cur().amount; g('dc-times').value = cur().timesPerDay; }
      };
      const allFoods = new Map([...listFoods(), ...listTreats()].map((f) => [f.id, f]));
      // The labels follow the form at once; the calories and the units that make sense for the food come from calc, and an answer for an
      // earlier state of the form is dropped.
      let liveSeq = 0;
      const live = async () => {
        const out = body.querySelector('#dc-live'); if (!out) return;
        const amount = Number(g('dc-amount').value); const times = Number(g('dc-times').value);
        const m = form.querySelector('[name=dc-mode]:checked')?.value || 'add'; const kEl = g('dc-kcal');
        const unitNow = m === 'amount' && cur() ? cur().unit : g('dc-unit').value;
        const lab = body.querySelector('#dc-kcal-l'); if (lab) lab.textContent = unitNow === 'g' ? 'Calories in it, kcal per 100 g (optional)' : `Calories in one ${DIET_UNITS[unitNow] || unitNow}, kcal (optional)`;
        if (kEl) kEl.max = unitNow === 'g' ? 950 : 5000;
        const hitK = m !== 'amount' ? byLabel.get((g('dc-food')?.value || '').trim().toLowerCase()) : null;
        const item = m === 'amount' ? cur() : null;
        const mine = ++liveSeq;
        const v = await calc('dietLiveView', pet, { mode: m, hit: hitK || null, item: item || null, itemFood: item && item.foodId ? allFoods.get(item.foodId) || null : null, unit: g('dc-unit').value, amount, times, kcalTyped: kEl?.value ? Number(kEl.value) : null, gpc: g('dc-gpc')?.value ? Number(g('dc-gpc').value) : null });
        if (mine !== liveSeq) return;
        // A food picked from the list: offer only the units we have calories for, and ask for the cup weight when we have none.
        const unitSel = g('dc-unit');
        if (!sup && !tre && m !== 'amount' && unitSel && tab === 'food') {
          const key = hitK ? hitK.id : ''; if (unitSel.dataset.foodKey !== key) {
            unitSel.dataset.foodKey = key; const keep = unitSel.value;
            const allowed = v.allowed || Object.keys(DIET_UNITS);
            const pieceName = v.pieceName || DIET_UNITS.piece;
            unitSel.innerHTML = allowed.map((u) => `<option value="${u}">${u === 'piece' ? esc(pieceName) : DIET_UNITS[u]}</option>`).join(''); unitSel.value = allowed.includes(keep) ? keep : 'g';
          }
        }
        const unitNow2 = v.unit;
        const gf = body.querySelector('#dc-gpc-f'); if (gf) gf.hidden = !v.needGrams || tab !== 'food' || !['add', 'replace'].includes(m);
        const ph = v.placeholder != null ? v.placeholder : ''; const srcEl = body.querySelector('#dc-kcal-src');
        if (kEl) kEl.placeholder = ph !== '' ? `${ph} (from the label)` : '';
        if (srcEl) srcEl.textContent = hitK ? (v.needGrams ? 'Calories come from the label per gram and your cup weight.' : v.hasLabel ? `From the label: ${ph} kcal per ${unitNow2 === 'g' ? '100 g' : unitNow2}. Check it against your bag; leave blank to use it.` : `No calories for this food per ${unitNow2 === 'g' ? 'gram' : unitNow2}. Enter your own.`) : '';
        const o = v.out;
        if (!o) { out.textContent = ''; out.hidden = true; return; }
        const srcNote = o.src === 'label' ? 'from the label' : o.src === 'estimate' ? `an estimate (about ${o.mg}% either way): the maker does not state calories` : o.src === 'yours' ? 'from your number' : '';
        out.hidden = false;
        if (o.per) out.innerHTML = `<div class="dclive__main"><strong>${o.kD.toLocaleString('en-US')} kcal a day</strong><span>${o.kM.toLocaleString('en-US')} kcal a meal</span></div><div class="dclive__sub">${o.dayAmount} ${unitWords(unitNow2, amount * times)} a day${o.pct == null ? '' : ` · ${o.pct}% of ${esc(pet.name)}'s goal`}${srcNote ? ` · ${srcNote}` : ''}. You can change the calories below.</div>`;
        else out.textContent = (tre ? 'We have no calories for this treat in this measure yet.' : `We have no calories for this food in ${unitNow2 === 'g' ? 'grams' : `${DIET_UNITS[unitNow2] || unitNow2}s`} yet. Add calories above and we count it.`);
      };
      form.addEventListener('input', live); form.addEventListener('change', live);
      form.addEventListener('change', sync); sync(); live();
      // Homemade food: pick ingredients and grams, and the calories per 100 g are worked out from USDA values.
      let mixLines = null; let INGS = null; const mixRows = [];
      const mixOptions = (sel) => [...new Set(INGS.map((x) => x.group))].map((gr) => `<optgroup label="${esc(gr)}">${INGS.filter((x) => x.group === gr).map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}${x.state === 'raw' ? ' (raw)' : x.state === 'cooked' ? ' (cooked)' : x.state === 'canned' ? ' (canned)' : ''}</option>`).join('')}</optgroup>`).join('');
      const drawMix = () => { body.querySelector('#dc-mix-rows').innerHTML = mixRows.map((r, i) => `<div class="mixrow"><select class="select" data-mi="${i}" aria-label="Ingredient ${i + 1}">${mixOptions(r.id)}</select><input class="input" type="number" min="1" step="any" inputmode="decimal" placeholder="grams" aria-label="Grams of ingredient ${i + 1}" data-mg="${i}" value="${r.grams}"><button type="button" class="btn btn--ghost btn--small" data-mr="${i}" aria-label="Remove ingredient ${i + 1}">${icon('trash')}</button></div>`).join(''); };
      const calcMix = async () => {
        const out = body.querySelector('#dc-mix-out');
        const a = await calc('mixAnalysis', pet, mixRows.map((r) => ({ id: r.id, amount: r.grams })), { mode: 'g' });
        if (!(a.kcal > 0)) { mixLines = null; out.textContent = 'Add an ingredient and its grams.'; return; }
        mixLines = a.lines.map((l) => ({ id: l.id, name: l.name, grams: Math.round(l.grams * 10) / 10 }));
        const k = Math.round(a.kcalPer100g * 10) / 10; g('dc-kcal').value = k; g('dc-unit').value = 'g'; g('dc-amount').value = Math.round(a.grams * 10) / 10; live();
        out.innerHTML = `One meal: <strong>${Math.round(a.grams)} g</strong>, about <strong>${Math.round(a.kcal)} kcal</strong> (${k} kcal per 100 g, USDA). Next: how many meals a day.`;
      };
      const setTab = async (t) => {
        tab = t; body.querySelectorAll('[data-tab-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tabBtn === t)));
        if (t === 'mix' && !INGS) { INGS = (await import('./ingredients-data.js')).INGREDIENTS; mixRows.push({ id: INGS.find((x) => x.id === 'chicken-breast-raw')?.id || INGS[0].id, grams: '' }); drawMix(); }
        sync(); if (t === 'mix') calcMix(); else mixLines = null;
      };
      body.querySelectorAll('[data-tab-btn]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tabBtn)));
      body.querySelector('#dc-mix-add')?.addEventListener('click', () => { mixRows.push({ id: INGS[0].id, grams: '' }); drawMix(); calcMix(); });
      body.querySelector('#dc-mix')?.addEventListener('input', (e) => { const mg = e.target.dataset.mg; if (mg != null) { mixRows[mg].grams = e.target.value; calcMix(); } });
      body.querySelector('#dc-mix')?.addEventListener('change', (e) => { const mi = e.target.dataset.mi; if (mi != null) { mixRows[mi].id = e.target.value; calcMix(); } });
      body.querySelector('#dc-mix')?.addEventListener('click', (e) => { const mr = e.target.closest('[data-mr]'); if (mr && mixRows.length > 1) { mixRows.splice(Number(mr.dataset.mr), 1); drawMix(); calcMix(); } });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); const err = body.querySelector('#dc-err'); err.textContent = '';
        const date = g('dc-date').value; const item = cur(); const typed = (g('dc-food')?.value || '').trim();
        const hit = byLabel.get(typed.toLowerCase());
        const amount = Number(g('dc-amount').value); const times = Number(g('dc-times').value);
        let change;
        if (mode === 'stop') { if (!item) { err.textContent = 'Pick the food that stopped.'; return; } change = { date, stops: [item.id], starts: [] }; }
        else if (mode === 'amount') { if (!item) { err.textContent = 'Pick the food.'; return; } change = { date, stops: [item.id], starts: [{ foodName: item.foodName, foodId: item.foodId, role: item.role, amount, unit: item.unit, timesPerDay: times, replacesId: item.id, kcalPerKg: item.kcalPerKg, kcalPerUnit: item.kcalPerUnit, recipe: item.recipe }] }; }
        else {
          if (tab === 'mix' && !mixLines) { err.textContent = 'Add at least one ingredient with its grams.'; return; }
          if (tab !== 'mix' && !typed) { err.textContent = 'Add the name of the new food.'; return; }
          const unitNow = g('dc-unit').value; const kv = Number(g('dc-kcal')?.value); const kHas = !!g('dc-kcal')?.value;
          // calc checks the calories typed (their range) and the cup weight, when the label has no calories per cup
          const chk = await calc('dietEntryCheck', hit || null, { unit: unitNow, kcalTyped: g('dc-kcal')?.value || null, gpc: g('dc-gpc')?.value || null, mix: tab === 'mix' });
          if (!chk.ok) { err.textContent = chk.message; return; }
          const cupKcal = chk.cupKcal || null;
          change = { date, stops: mode === 'replace' && item ? [item.id] : [], starts: [{ ...(cupKcal ? { kcalPerUnit: cupKcal } : {}), foodName: tab === 'mix' ? (g('dc-mixname').value.trim() || 'Homemade mix') : hit ? foodLabel(hit) : typed, foodId: tab === 'mix' ? null : hit?.id || null, ...(tab === 'mix' && mixLines ? { recipe: mixLines } : {}), ...(kHas && unitNow === 'g' ? { kcalPerKg: kv * 10 } : {}), ...(kHas && unitNow !== 'g' ? { kcalPerUnit: kv } : {}), role: g('dc-role').value, amount, unit: g('dc-unit').value, timesPerDay: times, replacesId: mode === 'replace' && item ? item.id : undefined }] };
        }
        const r = await changeDiet(change);
        if (!r.ok) { err.textContent = r.message; return; }
        close(); toast(mode === 'stop' ? 'Food stopped' : 'Diet updated'); rerender();
      });
    },
  });
}
