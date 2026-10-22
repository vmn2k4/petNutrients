import { findFoodByBarcode, listFoods } from '../store.js';
import { foodFit, NUTRIENTS, energyPlan, nutrientTargets, gramsPerDay, costPerDay } from '../domain.js';
import { KCAL_NOTE, card, button, verdictBanner, meter, notice, field, icon, esc, pageHead, badge, expNote } from '../ui.js';
import { makeCtx, foodCard } from './foods.js';

const SAMPLE = { name: 'Photographed label (sample)', protein: 26, fat: 14, fibre: 4, moisture: 10, kcalPerKg: 3600, calcium: '', phosphorus: '' };
const FIELDS = [['protein', 'Crude protein (min %)'], ['fat', 'Crude fat (min %)'], ['fibre', 'Crude fibre (max %)'], ['moisture', 'Moisture (max %)'], ['kcalPerKg', 'Energy (kcal/kg)'], ['calcium', 'Calcium (%) if listed'], ['phosphorus', 'Phosphorus (%) if listed']];
let current = null; let status = '';

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const asFood = (v, species) => ({ id: 'scan', name: v.name || 'Scanned food', species, lifeStage: 'all', ingredients: v.ingredients || [], protein: num(v.protein), fat: num(v.fat), fibre: num(v.fibre), moisture: num(v.moisture), kcalPerKg: num(v.kcalPerKg), calcium: num(v.calcium), phosphorus: num(v.phosphorus) });

function result(ctx) {
  const species = ctx.pet?.species || 'dog';
  const pet = ctx.pet || { species: 'dog', name: 'a sample adult dog', birth: new Date(Date.now() - 4 * 365 * 86400000).toISOString().slice(0, 10), weightKg: 20, bcs: 5, neutered: true, activity: 'normal', allergies: [], sizeCat: 'IV' };
  const plan = ctx.plan || energyPlan(pet); const targets = ctx.targets || nutrientTargets(pet);
  const food = asFood(current, species);
  if (!food.kcalPerKg) return notice('Add the calories (kcal/kg) from the label so we can compare fairly. No kcal/kg? Many labels show kcal per cup instead.', 'caution');
  const fit = foodFit(food, pet, plan, targets);
  const titles = { good: 'Meets the nutrient targets', caution: 'Partly checked', bad: 'Not the best match' };
  const alts = listFoods().filter((f) => f.species === species).map((f) => ({ f, v: foodFit(f, pet, plan, targets).verdict })).filter((x) => x.v === 'good').slice(0, 3);
  return `<div class="stack">
    ${verdictBanner(fit.verdict, `${titles[fit.verdict]} for ${esc(pet.name)}`, fit.warn.length ? fit.warn.map((w) => esc(w.text)).join('<br>') : 'Protein, fat, calcium and phosphorus all hit the targets for their life stage. Vitamins and "complete and balanced" are not checked, so read the bag too.')}
    ${card(`<h2>Nutrients per 1000 kcal</h2><div class="stack">${fit.checks.map((k) => meter({ label: k.label, value: k.value, unit: 'g', min: k.target?.min, max: k.target?.max, state: k.state === 'unknown' ? '' : k.state })).join('')}</div>
      <p class="hint">${!plan.hideKcal && gramsPerDay(food, plan.kcal) ? `Feeding about ${Math.round(gramsPerDay(food, plan.kcal))} g a day would give ${Math.round(plan.kcal)} kcal. ${KCAL_NOTE}` : ''}</p>`)}
    <section><h2>Similar foods that fit</h2>${alts.length ? `<div class="grid grid--auto">${alts.map((a) => foodCard(a.f, { pet, plan, targets })).join('')}</div>` : '<p class="muted">No similar foods in our catalogue yet. We are adding more.</p>'}</section></div>`;
}

export function render() {
  const ctx = makeCtx();
  return {
    title: 'Free Pet Food Label Scanner – Check Nutrients & AAFCO',
    html: `${pageHead('Scan a pet food label')}<div class="page page--narrow">${expNote()}<p class="lede">Pet food labels hide the useful facts in the guaranteed analysis. Snap a photo or enter a barcode and we convert the numbers to per-1000-kcal values, then check them against AAFCO nutrient targets for your dog or cat. This is a free label checker for protein, fat, calcium and phosphorus — not a full lab analysis. Always read the bag yourself, and ask your vet about medical diets.</p>
      <div class="stack-lg">
        ${card(`<div class="dropzone"><img class="dropzone__pet" src="/assets/cut-beagle-480.webp" alt="" width="120" height="120"><div><h2 class="card__title" style="margin-bottom:var(--space-1)">Photograph the label</h2><p class="muted small" style="margin:0">Include the guaranteed analysis and calorie content. Good light helps.</p></div>
          <div class="row" style="justify-content:center"><label class="btn btn--primary" for="photo">${icon('camera')}<span>Snap or upload a photo</span></label><input id="photo" type="file" accept="image/*" capture="environment" class="sr-only">${button({ label: 'Try a sample label', variant: 'secondary', attrs: 'id="sample"' })}</div></div>
          <div style="margin-top:var(--space-5)"><form id="bc" class="input-row">${field({ id: 'code', label: 'Or enter a barcode', attrs: 'inputmode="numeric" placeholder="e.g. 0000000000011"', hint: 'Sample barcodes in this prototype: 0000000000011 to 0000000000080' })}<div style="align-self:end">${button({ label: 'Look up', type: 'submit' })}</div></form></div>
          <p id="st" class="small" role="status" aria-live="polite">${esc(status)}</p>`)}
        <div id="out"></div>
      </div></div>`,
    mount(root, rerender) {
      const out = root.querySelector('#out');
      const draw = () => {
        if (!current) { out.innerHTML = ''; return; }
        out.innerHTML = `<div class="stack-lg">${card(`<h2>Did we read it right?</h2><p class="muted small">Fix anything that looks off. The results update as you type.</p><form id="ex" class="stack"><div class="grid grid--2">${FIELDS.map(([k, l]) => field({ id: k, label: l, type: 'number', value: current[k] ?? '', attrs: 'step="0.1" inputmode="decimal"' })).join('')}</div></form>${badge('Photo reading is simulated in this prototype', 'info', 'info')}`)}<div id="res">${result(makeCtx())}</div></div>`;
        out.querySelector('#ex').addEventListener('input', (e) => { current[e.target.id] = e.target.value; out.querySelector('#res').innerHTML = result(makeCtx()); });
      };
      const load = (v, msg) => { current = v; status = msg; root.querySelector('#st').textContent = msg; draw(); out.scrollIntoView({ behavior: 'smooth' }); };
      root.querySelector('#sample').addEventListener('click', () => load({ ...SAMPLE }, 'Sample label loaded. Real photos will be read by a vision model on the server.'));
      root.querySelector('#photo').addEventListener('change', (e) => { if (e.target.files[0]) load({ ...SAMPLE, name: 'Your photo' }, 'Photo received. In the real app we read the label for you; here we show sample values to edit.'); });
      root.querySelector('#bc').addEventListener('submit', async (e) => {
        e.preventDefault(); const f = await findFoodByBarcode(new FormData(e.target).get('code'));
        if (f) load({ name: f.name, protein: f.protein, fat: f.fat, fibre: f.fibre, moisture: f.moisture, kcalPerKg: f.kcalPerKg, calcium: f.calcium ?? '', phosphorus: f.phosphorus ?? '', ingredients: f.ingredients }, f.unreliable ? `Found: ${f.brand} ${f.name}. Community data often has wrong nutrition numbers, so please fill them in from the label.` : `Found: ${f.name}`);
        else { status = 'We do not know this one yet. Snap the label and we will check it.'; root.querySelector('#st').textContent = status; }
      });
      draw();
    },
  };
}
