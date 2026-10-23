// QUICK WEIGHT: one-tap weigh-in from any screen. A bottom sheet with a big number, -/+ steppers and kg/lb.
// Any element with data-quick-weight opens it; bindQuickWeight(root, onSaved) wires a screen once after render.
import { openSheet, toast } from './sheet.js';
import { getPet, addWeighIn } from './store.js';
import { kgToLb, lbToKg, round } from './format.js';
import { calc } from './calc.js';
import { button, esc } from './ui.js';

const UNIT_KEY = 'pnm.unit';
const readUnit = () => { try { return localStorage.getItem(UNIT_KEY) === 'lb' ? 'lb' : 'kg'; } catch { return 'kg'; } };
const writeUnit = (u) => { try { localStorage.setItem(UNIT_KEY, u); } catch { /* storage blocked */ } };

let sheetOpen = false; // a flag, not a DOM check: three quick clicks arrive before the first sheet is in the page
export function openQuickWeight(onSaved) {
  const pet = getPet(); if (!pet || sheetOpen) return;
  sheetOpen = true;
  let unit = readUnit();
  const last = [...(pet.logs || [])].sort((a, b) => (a.on < b.on ? 1 : -1))[0];
  const show = (kg) => String(round(unit === 'lb' ? kgToLb(kg) : kg, 1));
  openSheet({
    onClose: () => { sheetOpen = false; },
    title: `Log ${esc(pet.name)}'s weight`,
    body: `<form id="qw" class="stack qw" novalidate>
      <p class="muted" style="margin:0">${last ? `Last weigh-in: ${round(last.kg, 1)} kg on ${esc(last.on)}.` : 'First weigh-in.'}</p>
      <div class="qw__row">
        <button class="btn btn--secondary qw__step" type="button" data-step="-0.1" aria-label="0.1 less">−</button>
        <input class="input qw__input" id="qw-val" inputmode="decimal" autocomplete="off" aria-label="Weight" value="${show(pet.weightKg)}">
        <button class="btn btn--secondary qw__step" type="button" data-step="0.1" aria-label="0.1 more">+</button>
      </div>
      <div class="choices" role="group" aria-label="Unit">
        <label class="choice"><input type="radio" name="qw-unit" value="kg" ${unit === 'kg' ? 'checked' : ''}><span>kg</span></label>
        <label class="choice"><input type="radio" name="qw-unit" value="lb" ${unit === 'lb' ? 'checked' : ''}><span>lb</span></label>
      </div>
      <div id="qw-err" class="error-text" role="alert"></div>
      <div class="row row--between">${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save weight', type: 'submit', iconName: 'check' })}</div>
    </form>`,
    onMount: (body, close) => {
      const input = body.querySelector('#qw-val'); const err = body.querySelector('#qw-err');
      const read = () => Number(String(input.value).replace(',', '.'));
      const toKg = (v) => (unit === 'lb' ? lbToKg(v) : v);
      input.select?.();
      body.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
        const v = read(); if (!(v >= 0)) return; input.value = String(round(Math.max(0.1, v + Number(b.dataset.step) * (unit === 'lb' ? 2 : 1)), 1));
      }));
      body.querySelectorAll('[name=qw-unit]').forEach((r) => r.addEventListener('change', () => {
        const kg = toKg(read()); unit = r.value; writeUnit(unit);
        if (kg > 0) input.value = show(kg);
      }));
      body.querySelector('#qw').addEventListener('submit', async (e) => {
        e.preventDefault(); const kg = toKg(read());
        if (!(kg > 0.1)) { err.textContent = 'Enter a weight.'; return; }
        const wc = await calc('weightCheck', pet, kg); if (!wc.ok) { err.textContent = wc.message; return; }
        addWeighIn(round(kg, 2), pet.bcs); close(); toast(`Saved ${show(kg)} ${unit}`); onSaved?.();
      });
    },
  });
}

// Delegated, so buttons that a screen redraws later (like the goal card) keep working. `root` outlives screens, so the
// listener is added once and only the "after saving" callback is replaced by each new screen.
export function bindQuickWeight(root, onSaved) {
  root.__qwSaved = onSaved;
  if (root.__qwBound) return;
  root.__qwBound = true;
  root.addEventListener('click', (e) => { if (e.target.closest('[data-quick-weight]')) openQuickWeight(() => root.__qwSaved?.()); });
}
