// One component for "where do you want the pet to be?": the chart, a compact control strip under it
// (when chips, weight slider and number, one-line result) and optional save actions.
// Used by the Growth tab and by the goal card on Foods, so both always behave the same.
import { ageInMonths, monthsExact, growthBands, percentile, weightAtPercentile, targetBounds, targetCheck, lifeStage, round, ordinal, effectiveGoal, fmtDay, todayStr, addDaysStr } from './domain.js';
import { mountGrowthChart, mountWeightChart, chartLegend, weightLegend } from './charts.js';
import { chartKind, growthChartOpts, weightChartOpts } from './petcharts.js';
import { badge, button, esc, icon } from './ui.js';

const HORIZONS = [[7, '1 week'], [14, '2 weeks'], [30, '1 month'], [60, '2 months'], [90, '3 months']];
const fmtDate = (ms) => new Date(ms).toLocaleDateString('en', { month: 'short', day: 'numeric' });
const maxDays = (pet) => (chartKind(pet) === 'growth' ? 270 : 180);

// Starting point: an explicit { days, kg }, else the saved target, else a typical track a month ahead.
export function initialDraft(pet, from) {
  if (from && from.days >= 1 && from.kg > 0) return { days: from.days, kg: from.kg };
  const g = effectiveGoal(pet);   // the saved goal keeps its fixed date: the picker shows what is LEFT, so reopening never moves it
  if (g && g.daysLeft >= 1 && g.targetKg > 0 && (g.type !== 'grow' || g.custom)) return { days: g.daysLeft, kg: g.targetKg };
  const days = 30; let kg = pet.weightKg;
  if (lifeStage(pet) === 'growth') { const bands = growthBands(pet); const m0 = monthsExact(pet.birth); kg = round(weightAtPercentile(bands, m0 + days / 30.44, percentile(pet.weightKg, m0, bands).value), 1); }
  return { days, kg };
}

// Moving the time frame keeps the previous target's track: the same percentile for a growing pet,
// the same weekly pace otherwise. The owner can still set the weight by hand afterwards.
function rescale(pet, d, days) {
  if (days === d.days) return d.kg;
  if (chartKind(pet) === 'growth') {
    const bands = growthBands(pet); const m0 = monthsExact(pet.birth);
    const pct = percentile(d.kg, m0 + d.days / 30.44, bands).value;
    return round(weightAtPercentile(bands, m0 + days / 30.44, pct), 1);
  }
  return round(pet.weightKg + (d.kg - pet.weightKg) * (days / d.days), 1);
}

export const markerFor = (pet, d) => (chartKind(pet) === 'growth'
  ? { m: monthsExact(pet.birth) + d.days / 30.44, kg: d.kg, label: `Target ${round(d.kg, 1)} kg` }
  : { t: Date.now() + d.days * 864e5, kg: d.kg, label: `Target ${round(d.kg, 1)} kg` });

// "To reach this, feed about X kcal a day", with a way straight to foods that fit.
function feedLine(pet, d) {
  const r = targetCheck(pet, d.days, d.kg);
  if (r.hideKcal || !(r.kcal > 0)) return '<p class="tpick__feed">Ask your vet how much to feed to reach this.</p>';
  return `<p class="tpick__feed">To reach this, feed about <strong>${Math.round(r.kcal).toLocaleString('en-US')} kcal</strong> a day.</p>${button({ label: 'Find food that fits', href: '/foods', variant: 'secondary', iconName: 'bowl', attrs: 'data-find' })}`;
}

function resultLine(pet, d) {
  const r = targetCheck(pet, d.days, d.kg); const when = fmtDay(addDaysStr(todayStr(), d.days));
  const ic = r.pace.state === 'good' ? 'check' : r.pace.state === 'caution' ? 'alert' : 'x';
  const facts = r.kind === 'growth'
    ? `${round(d.kg, 1)} kg by ${when} · ${ordinal(r.pct)} percentile (now ${ordinal(r.curPct)})`
    : `${round(d.kg, 1)} kg by ${when} · ${r.weeklyPct > 0 ? '+' : ''}${r.weeklyPct.toFixed(1)}% a week ${r.hideKcal ? '' : `· required ${r.kcal} kcal a day`}`;
  return `${badge(r.pace.text, r.pace.state, ic)}<span class="tpick__facts">${esc(facts)}</span>${r.note && r.kind !== 'growth' ? `<span class="hint tpick__note">${esc(r.note)}</span>` : ''}`;
}

function controls(pet, d) {
  const b = targetBounds(pet, d.days);
  const label = (HORIZONS.find(([n]) => n === d.days) || [d.days, `${d.days} days`])[1];
  return `<div class="tpick__chips chips" role="group" aria-label="When">${HORIZONS.map(([n, l]) => `<button type="button" class="chipbtn chipbtn--toggle" data-h="${n}" aria-pressed="${d.days === n}" aria-label="${l}"><span class="hz-long">${l}</span><span class="hz-short" aria-hidden="true">${l.replace(' weeks', 'w').replace(' week', 'w').replace(' months', 'm').replace(' month', 'm')}</span></button>`).join('')}</div>
    <div class="tpick__ctl"><label class="tpick__lbl" for="tp-num">Target in ${esc(label)}</label>
      <input type="range" id="tp-range" aria-label="Target weight slider" min="${b.lo}" max="${b.hi}" step="0.1" value="${d.kg}">
      <span class="tpick__num"><input class="input num" id="tp-num" type="number" inputmode="decimal" min="${b.lo}" max="${b.hi}" step="0.1" value="${d.kg}"><span class="unit">kg</span></span></div>
    <p class="hint tpick__range">Most similar pets weigh ${b.lo} to ${b.hi} kg by then.</p>`;
}

export function targetPickerHtml(pet, { actions = false, intro = '' } = {}) {
  const growth = chartKind(pet) === 'growth';
  const o = growth ? growthChartOpts(pet) : null;
  const wo = growth ? null : weightChartOpts(pet);
  return `<div class="tpick">
    <div class="row row--between tpick__top"><span class="small muted">${esc(intro)}</span>${o && o.canZoom ? `<button class="btn btn--ghost btn--small" type="button" data-zoom>${o.zoomOn ? 'Show full curve' : 'Zoom in'}</button>` : ''}</div>
    <div class="gchart" data-chart></div>${growth ? chartLegend({ projection: !!o.projection, diet: !!o.marks?.length }) : weightLegend({ hasRange: !!wo.range, hasIdeal: !!wo.idealKg, hasProjection: !!wo.projection, hasDiet: !!wo.marks?.length })}
    <div class="tpick__panel" data-panel></div>
    ${actions ? `<div class="row tpick__actions">${button({ label: 'Save as my goal', variant: 'dark', iconName: 'check', attrs: 'data-save disabled' })}${pet.target ? button({ label: 'Clear target', variant: 'ghost', attrs: 'data-clear' }) : ''}</div>` : ''}</div>`;
}

// opts: { from, onChange(draft), onSave(draft), onClear() }. Returns { setDraft, getDraft }.
export function mountTargetPicker(root, pet, opts = {}) {
  const growth = chartKind(pet) === 'growth';
  const limit = maxDays(pet);
  let d = initialDraft(pet, opts.from);
  const clamp = () => { const b = targetBounds(pet, d.days); d.kg = Math.min(b.hi, Math.max(b.lo, round(d.kg, 1))); return b; };
  clamp();
  // "Save as my goal" is enabled only when there is something new to save: no goal yet, or the draft differs from the saved one.
  const saved = effectiveGoal(pet); const hasSaved = !!(saved && (saved.type !== 'grow' || saved.custom));
  const base = initialDraft(pet);
  const syncSave = () => { const b = root.querySelector('[data-save]'); if (b) b.disabled = hasSaved && d.days === base.days && Math.abs(d.kg - base.kg) < 0.05; };
  const panel = root.querySelector('[data-panel]');
  let ctl = null; let zoomOn = false; let co = null;
  const draw = () => { panel.innerHTML = `${controls(pet, d)}<div class="tpick__res" id="tp-res" aria-live="polite">${resultLine(pet, d)}</div>${opts.feed ? `<div class="tpick__feedbox" id="tp-feed">${feedLine(pet, d)}</div>` : ''}`; ctl?.setTarget(markerFor(pet, d)); syncSave(); };
  const light = () => { root.querySelector('#tp-res').innerHTML = resultLine(pet, d); const fb = root.querySelector('#tp-feed'); if (fb) fb.innerHTML = feedLine(pet, d); ctl?.setTarget(markerFor(pet, d)); syncSave(); };
  const changed = () => opts.onChange?.({ ...d });

  const el = root.querySelector('[data-chart]');
  if (growth) { co = growthChartOpts(pet); zoomOn = co.zoomOn; ctl = mountGrowthChart(el, { ...co, target: markerFor(pet, d) }); }
  else ctl = mountWeightChart(el, { ...weightChartOpts(pet), target: markerFor(pet, d) });
  root.querySelector('[data-zoom]')?.addEventListener('click', (e) => { zoomOn = !zoomOn; ctl.setOpts({ maxMonth: zoomOn ? co.zoomMax : co.fullMax }); e.currentTarget.textContent = zoomOn ? 'Show full curve' : 'Zoom in'; });
  draw();

  root.addEventListener('click', (e) => {
    const h = e.target.closest('button[data-h]'); if (h) { const nd = Number(h.dataset.h); d.kg = rescale(pet, d, nd); d.days = nd; clamp(); draw(); changed(); return; }
    if (e.target.closest('[data-find]')) opts.onFind?.({ ...d });
    if (e.target.closest('[data-save]')) opts.onSave?.({ ...d });
    if (e.target.closest('[data-clear]')) opts.onClear?.();
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'tp-range') { d.kg = parseFloat(e.target.value); root.querySelector('#tp-num').value = d.kg; light(); changed(); }
    else if (e.target.id === 'tp-num') { const v = parseFloat(e.target.value); const b = targetBounds(pet, d.days); if (Number.isFinite(v) && v >= b.lo && v <= b.hi) { d.kg = v; root.querySelector('#tp-range').value = v; light(); changed(); } }
  });
  root.addEventListener('change', (e) => {
    if (e.target.id !== 'tp-num') return;
    const v = parseFloat(e.target.value); const b = targetBounds(pet, d.days);
    if (Number.isFinite(v)) { if (v < b.lo || v > b.hi) opts.onClamp?.(b); d.kg = v; }
    clamp(); draw(); changed();
  });
  return { getDraft: () => ({ ...d }), setDraft: (n) => { d = { ...n }; clamp(); draw(); } };
}
