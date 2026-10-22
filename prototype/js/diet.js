// DIET: what the pet eats now, how it changed over time, and what happened to growth during each stretch.
// The log is descriptive. Growth depends on age, health, treats and season, so nothing here claims a food "caused" a change.
import { card, button, badge, esc, icon, comboField, mountCombos } from './ui.js';
import { openSheet, toast } from './sheet.js';
import { KCAL_NOTE } from './ui.js';
import { getDiet, changeDiet, undoDietChange, listFoods, listSupplements, listTreats } from './store.js';
import { energyPlan, currentDiet, dietChanges, dietPeriods, dietKcal, dietVsPlan, ingredientWarnings, treatPlan, TREAT_SHARE, perDay, unitWords, DIET_ROLES, DIET_UNITS, SUPPLEMENTS, fmtDay, todayStr, round } from './domain.js';

const foodLabel = (f) => `${f.brand} ${f.name}`;
const amountText = (it) => `${it.amount} ${unitWords(it.unit, it.amount)} × ${it.timesPerDay} a day`;
const totalText = (it) => `${round(perDay(it), 1)} ${unitWords(it.unit, perDay(it))} a day`;

// ---- the page ---------------------------------------------------------------------------------------
export function dietHtml(pet, plan) {
  const diet = getDiet(); const now = currentDiet(diet);
  const treatsById = new Map(listTreats().map((t) => [t.id, t]));
  const foods = new Map([...listFoods(), ...listTreats()].map((f) => [f.id, f]));
  const k = dietKcal(now, (id) => foods.get(id)?.kcalPerKg || null, (id) => treatsById.get(id)?.kcalPerTreat || null);
  const foodsNow = now.filter((it) => it.role !== 'supplement' && it.role !== 'treat'); const suppsNow = now.filter((it) => it.role === 'supplement'); const treatsNow = now.filter((it) => it.role === 'treat');
  const rowHtml = (it) => { const f = it.foodId ? foods.get(it.foodId) : null; const wrongSpecies = f && f.species !== pet.species; const iw = f && !wrongSpecies ? ingredientWarnings(f, pet).warn.find((w) => w.level === 'bad') : null;
    return `<li class="diet-row"><div class="diet-row__main"><strong>${esc(it.foodName)}</strong>${it.role !== 'main' && it.role !== 'supplement' ? ` ${badge(DIET_ROLES[it.role], 'info')}` : ''}${wrongSpecies ? ` ${badge(`Made for ${f.species}s`, 'bad', 'alert')}` : iw ? ` ${badge('Check ingredients', 'bad', 'alert')}` : ''}
      <div class="small muted">${esc(amountText(it))} · ${esc(totalText(it))} · since ${fmtDay(it.startedOn)}${it.kcalPerKg && it.recipe ? ' · homemade mix' : ''}${it.role === 'treat' && it.unit === 'piece' && treatsById.get(it.foodId)?.kcalPerTreat ? ` · about ${Math.round(perDay(it) * treatsById.get(it.foodId).kcalPerTreat)} kcal` : ''}</div>${wrongSpecies ? `<div class="small" style="color:var(--color-bad)">This is a ${f.species} food and ${esc(pet.name)} is a ${pet.species}. ${f.species === 'cat' ? 'Cat food is richer in protein and fat and is not balanced for dogs.' : 'Dog food is not balanced for cats, who also need taurine.'} Please check with your vet.</div>` : iw ? `<div class="small" style="color:var(--color-bad)">${esc(iw.text)}</div>` : ''}</div>
      <div class="diet-row__acts"><button class="btn btn--ghost btn--small" type="button" data-diet="amount" data-item="${it.id}">Change amount</button>${it.role === 'supplement' ? '' : `<button class="btn btn--ghost btn--small" type="button" data-diet="replace" data-item="${it.id}">Replace</button>`}<button class="btn btn--ghost btn--small" type="button" data-diet="stop" data-item="${it.id}">Stop</button></div></li>`; };
  const planned = plan.hideKcal ? null : Math.round(plan.kcal); const vs = planned ? dietVsPlan(k, planned) : null;
  const barPct = vs && vs.pct != null ? Math.min(100, Math.max(0, vs.pct)) : 0;
  const verdict = !vs ? '' : { about: 'About right for the plan.', below: 'Below the plan. Check the amounts with your vet.', above: 'Above the plan. Check the amounts with your vet.', unknown: `This can read low because we have no calories for ${k.uncounted.map((n) => esc(n)).join(', ')}. Add its kcal per 100 g to count it.`, none: '' }[vs.state];
  const kcalPanel = foodsNow.length ? `<div class="dietkcal" style="margin-top:var(--space-4)"><div class="grid grid--2"><div><div class="small muted">Recommended</div><div><strong style="font-size:var(--text-xl)">${planned ? planned.toLocaleString('en-US') : 'ask your vet'}</strong>${planned ? ' kcal a day' : ''}</div><div class="hint">${planned ? `Our estimate for ${esc(pet.name)}. ${esc(KCAL_NOTE)}` : `${esc(pet.name)} is growing and we do not show a calorie number for this case.`}</div></div>
      <div><div class="small muted">Eating now</div><div><strong style="font-size:var(--text-xl)">${k.known ? k.kcal.toLocaleString('en-US') : '0'}</strong> kcal a day${vs && vs.pct != null && k.known ? ` (${vs.pct}%)` : ''}</div><div class="hint">${k.known ? `From ${k.known} food${k.known === 1 ? '' : 's'} we have calories for${k.unknown ? `, plus ${k.unknown} we cannot count` : ''}.` : 'We have no calories for these foods yet.'}</div></div></div>
      ${planned ? `<div class="gbar" role="img" aria-label="${vs && vs.pct != null ? `${vs.pct} percent of the recommended calories` : 'no calories counted'}" style="margin-top:var(--space-3)"><span style="width:${barPct}%"></span></div>` : ''}${verdict ? `<p class="small" style="margin:var(--space-2) 0 0">${verdict}</p>` : ''}</div>` : '';
  const current = card(`<div class="row row--between"><h2 style="margin:0">What ${esc(pet.name)} eats now</h2>${button({ label: foodsNow.length ? 'Add a food' : 'Add what they eat', variant: 'primary btn--small', iconName: 'plus', attrs: 'data-diet="add"' })}</div>
    ${foodsNow.length ? `<ul class="diet-list">${foodsNow.map(rowHtml).join('')}</ul>${kcalPanel}` : `<p class="muted" style="margin:var(--space-3) 0 0">Tell us the food, how much and how many times a day. When it changes, log the change with its date and you will see how weight moved afterwards.</p>`}`);
  const budget = planned ? Math.round(TREAT_SHARE * planned) : null; const tPct = planned ? Math.round((k.treatKcal / planned) * 100) : null;
  const treatLine = treatsNow.length && planned ? `<p class="small" style="margin:var(--space-3) 0 0">Treats add about <strong>${k.treatKcal} kcal</strong> a day, ${tPct}% of ${esc(pet.name)}'s plan. The usual limit is about 10%, ${budget} kcal.${k.treatKcal > budget ? ' <span style="color:var(--color-caution)">That is above the usual limit: consider fewer treats or a smaller food portion.</span>' : ''}${treatsNow.some((it) => !(treatsById.get(it.foodId)?.kcalPerTreat)) ? ' Some treats have no calories counted.' : ''}</p>` : '';
  const treatsCard = card(`<div class="row row--between"><h2 style="margin:0">Treats</h2>${button({ label: 'Add a treat', variant: 'secondary btn--small', iconName: 'plus', attrs: 'data-diet="addtreat"' })}</div>
    ${treatsNow.length ? `<ul class="diet-list">${treatsNow.map(rowHtml).join('')}</ul>${treatLine}` : `<p class="muted" style="margin:var(--space-3) 0 0">Pick a treat from our list to see how many calories it adds. Treats are best kept to about 10% of the day.</p>`}
    <p class="hint" style="margin:var(--space-3) 0 0">Treats are not complete meals. ${esc(KCAL_NOTE)}</p>`);
  const supplements = card(`<div class="row row--between"><h2 style="margin:0">Supplements</h2>${button({ label: 'Add a supplement', variant: 'secondary btn--small', iconName: 'plus', attrs: 'data-diet="addsupp"' })}</div>
    ${suppsNow.length ? `<ul class="diet-list">${suppsNow.map(rowHtml).join('')}</ul>` : `<p class="muted" style="margin:var(--space-3) 0 0">Collagen, turmeric, joint or fish oil, a probiotic? List them here so the history shows what ${esc(pet.name)} gets.</p>`}
    <p class="hint" style="margin:var(--space-3) 0 0">We list supplements but do not judge them, and they are not counted in the calories above. Some oils and powders do add calories (a teaspoon of fish oil is about 40 kcal). Some supplements can interact with medicines, so ask your vet before you start one.</p>`);
  // history: one entry per change day, with what happened to weight from that day until the next change
  const changes = dietChanges(diet); const periods = new Map(dietPeriods(pet, diet).map((p) => [p.start, p]));
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
  return `${current}${treatsCard}${supplements}${history}`;
}

// ---- the change sheet -------------------------------------------------------------------------------
const MODES = [['replace', 'Replace a food'], ['add', 'Add a food'], ['amount', 'Change amount'], ['stop', 'Stop a food']];

// Opens the add sheet for a treat or supplement picked elsewhere (Find food), with the product already chosen.
export function openAddItem(pet, kind, item, rerender) {
  openChange(pet, 'add', null, rerender, kind === 'supplement' ? { supplement: true, prefill: item } : { treat: true, prefill: item });
}

export function mountDiet(root, pet, rerender) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-diet]'); if (b) { if (b.dataset.diet === 'addsupp') openChange(pet, 'add', null, rerender, { supplement: true }); else if (b.dataset.diet === 'addtreat') openChange(pet, 'add', null, rerender, { treat: true }); else openChange(pet, b.dataset.diet, b.dataset.item, rerender); return; }
    // On a phone the whole row is the target: one tap opens the actions for that food.
    const row = e.target.closest('.diet-row');
    if (row && matchMedia('(max-width: 639px)').matches) {
      const id = row.querySelector('[data-item]')?.dataset.item; const name = row.querySelector('strong')?.textContent || 'Food';
      openSheet({ title: name, body: `<div class="stack">${[['amount', 'Change amount'], ['replace', 'Replace with another food'], ['stop', 'Stop this food']].map(([m, l]) => `<button class="btn btn--secondary btn--block" type="button" data-act="${m}">${l}</button>`).join('')}</div>`, onMount(body, close) { body.addEventListener('click', (ev) => { const a = ev.target.closest('[data-act]'); if (a) { close(); setTimeout(() => openChange(pet, a.dataset.act, id, rerender), 250); } }); } });
      return;
    }
    const u = e.target.closest('[data-diet-undo]'); if (u && confirm('Undo this change? Foods added on that day are removed and foods it stopped are brought back.')) { undoDietChange(u.dataset.dietUndo); toast('Change undone'); rerender(); }
  });
}

function openChange(pet, startMode, itemId, rerender, opts = {}) {
  const sup = !!opts.supplement; const tre = !!opts.treat;
  const items = currentDiet(getDiet());
  // Supplements: catalogue products for this species once they exist, then the built-in common ones. Typing any other name still works.
  const catSupps = listSupplements().filter((s) => !s.species || s.species === pet.species);
  const suppOptions = [...catSupps.map((s) => foodLabel(s)), ...SUPPLEMENTS.filter((n) => !catSupps.some((s) => foodLabel(s).toLowerCase() === n.toLowerCase()))];
  const treatList = listTreats().filter((t) => t.species === pet.species);
  const foods = sup ? catSupps : tre ? treatList : listFoods(); const byLabel = new Map(foods.map((f) => [foodLabel(f).toLowerCase(), f]));
  let mode = items.length || startMode === 'add' ? startMode : 'add';
  openSheet({
    title: sup ? 'Add a supplement' : tre ? 'Add a treat' : 'Change what they eat',
    body: `<form id="dc" class="stack" novalidate>
      <div class="field"><label for="dc-date">When did it change?</label><input class="input" id="dc-date" type="date" value="${todayStr()}" max="${todayStr()}" min="${esc(pet.birth)}"><span class="hint">Today, or the day it really changed. You can go back in time.</span></div>
      <fieldset class="field"><legend class="legend">What changed?</legend><div class="choices" role="radiogroup">${MODES.map(([v, l]) => `<label class="choice"><input type="radio" name="dc-mode" value="${v}" ${v === mode ? 'checked' : ''} ${!items.length && v !== 'add' ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <div class="field" data-for="replace amount stop"><label for="dc-item">Which food?</label><select class="select" id="dc-item">${items.map((it) => `<option value="${it.id}" ${it.id === itemId ? 'selected' : ''}>${esc(it.foodName)} (${esc(amountText(it))})</option>`).join('')}</select></div>
      <div data-for="replace add">${comboField({ id: 'dc-food', label: sup ? 'Supplement' : tre ? 'Treat' : 'New food', options: sup ? suppOptions : foods.map(foodLabel), placeholder: sup ? 'Pick one or type any supplement' : tre ? 'Pick a treat from the list or type any treat' : 'Pick from the list or type any food', hint: 'Not in the list? Just type the name.' })}
        ${sup || tre ? '' : `<div class="field" data-for="replace add" id="dc-kcal-f"><label for="dc-kcal">Calories in it, kcal per 100 g (optional)</label><input class="input" id="dc-kcal" type="number" min="1" max="950" step="any" inputmode="decimal"><span class="hint">Only for a food that is not in our list, so we can count it. Making your own food? <a href="/recipe">Build it in the mix builder</a> and add it from there.</span></div>`}</div>
      <div class="grid grid--3" data-for="replace add amount"><div class="field"><label for="dc-amount">${tre ? 'How many each time' : sup ? 'How much each time' : 'How much each meal'}</label><input class="input" id="dc-amount" type="number" min="0.1" step="any" inputmode="decimal"></div>
        <div class="field" data-for="replace add"><label for="dc-unit">Unit</label><select class="select" id="dc-unit">${Object.entries(DIET_UNITS).map(([v, l]) => `<option value="${v}" ${(sup && v === 'scoop') || (tre && v === 'piece') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="dc-times">Times a day</label><input class="input" id="dc-times" type="number" min="0.5" max="12" step="0.5" inputmode="decimal" value="2"></div></div>
      <div class="field" data-for="replace add"><label for="dc-role">This is their</label><select class="select" id="dc-role">${Object.entries(DIET_ROLES).map(([v, l]) => `<option value="${v}" ${(sup && v === 'supplement') || (tre && v === 'treat') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${sup ? '<p class="hint" data-for="add" style="margin:0">A supplement is listed but not counted in the calories. Ask your vet before starting one, especially if your pet takes medicine.</p>' : ''}${tre ? '<p class="hint" id="dc-treat-hint" data-for="add" style="margin:0">Pick a treat to see its calories and how many fit in a day. Treats are best kept to about 10% of the day, all together.</p>' : ''}<p class="hint" data-for="replace" style="margin:0">Most pets do better switching slowly over about a week, mixing the old and new food. Add the new food first and stop the old one a few days later if you are mixing.</p>
      <div id="dc-err" class="error-text" role="alert"></div>
      <div class="row row--between">${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save change', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount: (body, close) => {
      mountCombos(body);
      if (opts.prefill) { const pi = body.querySelector('#dc-food'); pi.value = foodLabel(opts.prefill); pi.dispatchEvent(new Event('change', { bubbles: true })); }
      if (tre) {
        body.querySelector('#dc-times').value = '1';
        const hint = body.querySelector('#dc-treat-hint'); const plan = energyPlan(pet); const kcal = plan.hideKcal ? null : plan.kcal;
        const upd = () => {
          const t = byLabel.get((body.querySelector('#dc-food').value || '').trim().toLowerCase()); if (!t) return;
          const p = treatPlan(t, pet, kcal); const bad = ingredientWarnings(t, pet).warn.find((w) => w.level === 'bad');
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
      const sync = () => {
        mode = form.querySelector('[name=dc-mode]:checked')?.value || 'add';
        body.querySelectorAll('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(mode); });
        const key = `${mode}|${g('dc-item')?.value}`; if (key === last) return; last = key;
        if (mode === 'amount' && cur()) { g('dc-amount').value = cur().amount; g('dc-times').value = cur().timesPerDay; }
        if (mode === 'replace' && cur()) { g('dc-role').value = cur().role; g('dc-unit').value = cur().unit; if (!g('dc-amount').value) g('dc-amount').value = cur().amount; g('dc-times').value = cur().timesPerDay; }
      };
      form.addEventListener('change', sync); sync();
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const err = body.querySelector('#dc-err'); err.textContent = '';
        const date = g('dc-date').value; const item = cur(); const typed = (g('dc-food')?.value || '').trim();
        const hit = byLabel.get(typed.toLowerCase());
        const amount = Number(g('dc-amount').value); const times = Number(g('dc-times').value);
        let change;
        if (mode === 'stop') { if (!item) { err.textContent = 'Pick the food that stopped.'; return; } change = { date, stops: [item.id], starts: [] }; }
        else if (mode === 'amount') { if (!item) { err.textContent = 'Pick the food.'; return; } change = { date, stops: [item.id], starts: [{ foodName: item.foodName, foodId: item.foodId, role: item.role, amount, unit: item.unit, timesPerDay: times, replacesId: item.id }] }; }
        else {
          if (!typed) { err.textContent = 'Add the name of the new food.'; return; }
          const kcal100 = Number(g('dc-kcal')?.value); if (!hit && g('dc-kcal')?.value && !(kcal100 > 0 && kcal100 <= 950)) { err.textContent = 'Calories per 100 g should be between 1 and 950.'; return; }
          change = { date, stops: mode === 'replace' && item ? [item.id] : [], starts: [{ foodName: hit ? foodLabel(hit) : typed, foodId: hit?.id || null, ...(!hit && kcal100 > 0 ? { kcalPerKg: kcal100 * 10 } : {}), role: g('dc-role').value, amount, unit: g('dc-unit').value, timesPerDay: times, replacesId: mode === 'replace' && item ? item.id : undefined }] };
        }
        const r = changeDiet(change);
        if (!r.ok) { err.textContent = r.message; return; }
        close(); toast(mode === 'stop' ? 'Food stopped' : 'Diet updated'); rerender();
      });
    },
  });
}
