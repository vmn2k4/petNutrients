// DIET: what the pet eats now, how it changed over time, and what happened to growth during each stretch.
// The log is descriptive. Growth depends on age, health, treats and season, so nothing here claims a food "caused" a change.
import { card, button, badge, esc, icon, comboField, mountCombos } from './ui.js';
import { openSheet, toast } from './sheet.js';
import { getDiet, changeDiet, undoDietChange, listFoods } from './store.js';
import { currentDiet, dietChanges, dietPeriods, dietKcal, perDay, unitWords, DIET_ROLES, DIET_UNITS, fmtDay, todayStr, round } from './domain.js';

const foodLabel = (f) => `${f.brand} ${f.name}`;
const amountText = (it) => `${it.amount} ${unitWords(it.unit, it.amount)} × ${it.timesPerDay} a day`;
const totalText = (it) => `${round(perDay(it), 1)} ${unitWords(it.unit, perDay(it))} a day`;

// ---- the page ---------------------------------------------------------------------------------------
export function dietHtml(pet, plan) {
  const diet = getDiet(); const now = currentDiet(diet);
  const foods = new Map(listFoods().map((f) => [f.id, f]));
  const k = dietKcal(now, (id) => foods.get(id)?.kcalPerKg || null);
  const rows = now.map((it) => `<li class="diet-row"><div class="diet-row__main"><strong>${esc(it.foodName)}</strong>${it.role !== 'main' ? ` ${badge(DIET_ROLES[it.role], 'info')}` : ''}
      <div class="small muted">${esc(amountText(it))} · ${esc(totalText(it))} · since ${fmtDay(it.startedOn)}</div></div>
      <div class="diet-row__acts"><button class="btn btn--ghost btn--small" type="button" data-diet="amount" data-item="${it.id}">Change amount</button><button class="btn btn--ghost btn--small" type="button" data-diet="replace" data-item="${it.id}">Replace</button><button class="btn btn--ghost btn--small" type="button" data-diet="stop" data-item="${it.id}">Stop</button></div></li>`).join('');
  const kcalLine = now.length && k.known ? `<p class="small" style="margin:var(--space-3) 0 0">About <strong>${k.kcal.toLocaleString('en-US')} kcal a day</strong> from the foods we have calories for${k.unknown ? `, plus ${k.unknown} we cannot count` : ''}. ${esc(pet.name)}'s plan is about ${Math.round(plan.kcal).toLocaleString('en-US')}.</p>` : '';
  const current = card(`<div class="row row--between"><h2 style="margin:0">What ${esc(pet.name)} eats now</h2>${button({ label: now.length ? 'Add a food' : 'Add what they eat', variant: 'primary btn--small', iconName: 'plus', attrs: 'data-diet="add"' })}</div>
    ${now.length ? `<ul class="diet-list">${rows}</ul>${kcalLine}` : `<p class="muted" style="margin:var(--space-3) 0 0">Tell us the food, how much and how many times a day. When it changes, log the change with its date and you will see how weight moved afterwards.</p>`}`);

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
  return `${current}${history}`;
}

// ---- the change sheet -------------------------------------------------------------------------------
const MODES = [['replace', 'Replace a food'], ['add', 'Add a food'], ['amount', 'Change amount'], ['stop', 'Stop a food']];

export function mountDiet(root, pet, rerender) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-diet]'); if (b) { openChange(pet, b.dataset.diet, b.dataset.item, rerender); return; }
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

function openChange(pet, startMode, itemId, rerender) {
  const items = currentDiet(getDiet());
  const foods = listFoods(); const byLabel = new Map(foods.map((f) => [foodLabel(f).toLowerCase(), f]));
  let mode = items.length || startMode === 'add' ? startMode : 'add';
  openSheet({
    title: 'Change what they eat',
    body: `<form id="dc" class="stack" novalidate>
      <div class="field"><label for="dc-date">When did it change?</label><input class="input" id="dc-date" type="date" value="${todayStr()}" max="${todayStr()}" min="${esc(pet.birth)}"><span class="hint">Today, or the day it really changed. You can go back in time.</span></div>
      <fieldset class="field"><legend class="legend">What changed?</legend><div class="choices" role="radiogroup">${MODES.map(([v, l]) => `<label class="choice"><input type="radio" name="dc-mode" value="${v}" ${v === mode ? 'checked' : ''} ${!items.length && v !== 'add' ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <div class="field" data-for="replace amount stop"><label for="dc-item">Which food?</label><select class="select" id="dc-item">${items.map((it) => `<option value="${it.id}" ${it.id === itemId ? 'selected' : ''}>${esc(it.foodName)} (${esc(amountText(it))})</option>`).join('')}</select></div>
      <div data-for="replace add">${comboField({ id: 'dc-food', label: 'New food', options: foods.map(foodLabel), placeholder: 'Pick from the list or type any food', hint: 'Not in the list? Just type the name.' })}</div>
      <div class="grid grid--3" data-for="replace add amount"><div class="field"><label for="dc-amount">How much each meal</label><input class="input" id="dc-amount" type="number" min="0.1" step="any" inputmode="decimal"></div>
        <div class="field" data-for="replace add"><label for="dc-unit">Unit</label><select class="select" id="dc-unit">${Object.entries(DIET_UNITS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
        <div class="field"><label for="dc-times">Times a day</label><input class="input" id="dc-times" type="number" min="0.5" max="12" step="0.5" inputmode="decimal" value="2"></div></div>
      <div class="field" data-for="replace add"><label for="dc-role">This is their</label><select class="select" id="dc-role">${Object.entries(DIET_ROLES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <p class="hint" data-for="replace" style="margin:0">Most pets do better switching slowly over about a week, mixing the old and new food. Add the new food first and stop the old one a few days later if you are mixing.</p>
      <div id="dc-err" class="error-text" role="alert"></div>
      <div class="row row--between">${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save change', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount: (body, close) => {
      mountCombos(body);
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
          change = { date, stops: mode === 'replace' && item ? [item.id] : [], starts: [{ foodName: hit ? foodLabel(hit) : typed, foodId: hit?.id || null, role: g('dc-role').value, amount, unit: g('dc-unit').value, timesPerDay: times, replacesId: mode === 'replace' && item ? item.id : undefined }] };
        }
        const r = changeDiet(change);
        if (!r.ok) { err.textContent = r.message; return; }
        close(); toast(mode === 'stop' ? 'Food stopped' : 'Diet updated'); rerender();
      });
    },
  });
}
