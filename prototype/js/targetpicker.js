// One component for "where do you want the pet to be?": the chart, a compact control strip under it
// (when chips, weight slider and number, one-line result) and optional save actions.
// Used by the Growth tab and by the goal card on Foods, so both always behave the same.
// Every number comes from calc (the growth view `v`, then targetCheck / retarget as the target moves); this file only draws and wires.
import { calc } from './calc.js';
import { mountGrowthChart, mountWeightChart, chartLegend, weightLegend } from './charts.js';
import { growthChartOpts, weightChartOpts } from './petcharts.js';
import { round, ordinal, fmtDay, addDaysStr, todayStr } from './format.js';
import { badge, button, esc } from './ui.js';

const HORIZONS = [[7, '1 week'], [14, '2 weeks'], [30, '1 month'], [60, '2 months'], [90, '3 months']];

// Starting point: an explicit { days, kg }, else the saved target, else a typical track a month ahead (all worked out by calc).
export const initialDraft = (v, from) => (from && from.days >= 1 && from.kg > 0 ? { days: from.days, kg: from.kg } : { days: v.initial.days, kg: v.initial.kg });

export const markerFor = (v, d) => (v.kind === 'growth'
  ? { m: v.nowM + d.days / 30.44, kg: d.kg, label: `Target ${round(d.kg, 1)} kg` }
  : { t: Date.now() + d.days * 864e5, kg: d.kg, label: `Target ${round(d.kg, 1)} kg` });

// "To reach this, feed about X kcal a day", with a way straight to foods that fit.
function feedLine(r) {
  if (r.hideKcal || !(r.kcal > 0)) return '<p class="tpick__feed">Ask your vet how much to feed to reach this.</p>';
  return `<p class="tpick__feed">To reach this, feed about <strong>${Math.round(r.kcal).toLocaleString('en-US')} kcal</strong> a day.</p>${button({ label: 'Find food that fits', href: '/foods', variant: 'secondary', iconName: 'bowl', attrs: 'data-find' })}`;
}

function resultLine(r, d) {
  const when = fmtDay(addDaysStr(todayStr(), d.days));
  const ic = r.pace.state === 'good' ? 'check' : r.pace.state === 'caution' ? 'alert' : 'x';
  const facts = r.kind === 'growth'
    ? `${round(d.kg, 1)} kg by ${when} · ${ordinal(r.pct)} percentile (now ${ordinal(r.curPct)})`
    : `${round(d.kg, 1)} kg by ${when} · ${r.weeklyPct > 0 ? '+' : ''}${r.weeklyPct.toFixed(1)}% a week ${r.hideKcal ? '' : `· required ${r.kcal} kcal a day`}`;
  return `${badge(r.pace.text, r.pace.state, ic)}<span class="tpick__facts">${esc(facts)}</span>${r.note && r.kind !== 'growth' ? `<span class="hint tpick__note">${esc(r.note)}</span>` : ''}`;
}

function controls(d, b) {
  const label = (HORIZONS.find(([n]) => n === d.days) || [d.days, `${d.days} days`])[1];
  return `<div class="tpick__chips chips" role="group" aria-label="When">${HORIZONS.map(([n, l]) => `<button type="button" class="chipbtn chipbtn--toggle" data-h="${n}" aria-pressed="${d.days === n}" aria-label="${l}"><span class="hz-long">${l}</span><span class="hz-short" aria-hidden="true">${l.replace(' weeks', 'w').replace(' week', 'w').replace(' months', 'm').replace(' month', 'm')}</span></button>`).join('')}</div>
    <div class="tpick__ctl"><label class="tpick__lbl" for="tp-num">Target in ${esc(label)}</label>
      <input type="range" id="tp-range" aria-label="Target weight slider" min="${b.lo}" max="${b.hi}" step="0.1" value="${d.kg}">
      <span class="tpick__num"><input class="input num" id="tp-num" type="number" inputmode="decimal" min="${b.lo}" max="${b.hi}" step="0.1" value="${d.kg}"><span class="unit">kg</span></span></div>
    <p class="hint tpick__range">Most similar pets weigh ${b.lo} to ${b.hi} kg by then.</p>`;
}

export function targetPickerHtml(pet, v, { actions = false, intro = '' } = {}) {
  const growth = v.kind === 'growth';
  const o = growth ? growthChartOpts(pet, v) : null;
  const wo = growth ? null : weightChartOpts(pet, v);
  return `<div class="tpick">
    <div class="row row--between tpick__top"><span class="small muted">${esc(intro)}</span>${o && o.canZoom ? `<button class="btn btn--ghost btn--small" type="button" data-zoom>${o.zoomOn ? 'Show full curve' : 'Zoom in'}</button>` : ''}</div>
    <div class="gchart" data-chart></div>${growth ? chartLegend({ projection: !!o.projection, diet: !!o.marks?.length }) : weightLegend({ hasRange: !!wo.range, hasIdeal: !!wo.idealKg, hasProjection: !!wo.projection, hasDiet: !!wo.marks?.length })}
    <div class="tpick__panel" data-panel></div>
    ${actions ? `<div class="row tpick__actions">${button({ label: 'Save as my goal', variant: 'dark', iconName: 'check', attrs: 'data-save disabled' })}${pet.target ? button({ label: 'Clear target', variant: 'ghost', attrs: 'data-clear' }) : ''}</div>` : ''}</div>`;
}

// opts: { from, onChange(draft), onSave(draft), onClear() }. Returns { setDraft, getDraft }. Moving the target asks calc again; the last answer stays
// on screen until the new one arrives, and an answer for an earlier position is dropped.
export async function mountTargetPicker(root, pet, v, opts = {}) {
  const growth = v.kind === 'growth';
  let d = initialDraft(v, opts.from);
  let b = d.days === v.initial.days ? { lo: v.initial.lo, hi: v.initial.hi } : await calc('targetBounds', pet, d.days);
  const clamp = () => { d.kg = Math.min(b.hi, Math.max(b.lo, round(d.kg, 1))); };
  clamp();
  // "Save as my goal" is enabled only when there is something new to save: no goal yet, or the draft differs from the saved one.
  const saved = v.goal; const hasSaved = !!(saved && (saved.type !== 'grow' || saved.custom));
  const base = initialDraft(v);
  const syncSave = () => { const btn = root.querySelector('[data-save]'); if (btn) btn.disabled = hasSaved && d.days === base.days && Math.abs(d.kg - base.kg) < 0.05; };
  const panel = root.querySelector('[data-panel]');
  let ctl = null; let zoomOn = false; let co = null; let seq = 0;
  const check = async () => {
    const mine = ++seq; const r = await calc('targetCheck', pet, d.days, d.kg);
    if (mine !== seq) return;
    const res = root.querySelector('#tp-res'); if (res) res.innerHTML = resultLine(r, d);
    const fb = root.querySelector('#tp-feed'); if (fb) fb.innerHTML = feedLine(r);
  };
  const draw = () => { panel.innerHTML = `${controls(d, b)}<div class="tpick__res" id="tp-res" aria-live="polite"></div>${opts.feed ? '<div class="tpick__feedbox" id="tp-feed"></div>' : ''}`; ctl?.setTarget(markerFor(v, d)); syncSave(); check(); };
  const light = () => { ctl?.setTarget(markerFor(v, d)); syncSave(); check(); };
  const changed = () => opts.onChange?.({ ...d });

  const el = root.querySelector('[data-chart]');
  if (growth) { co = growthChartOpts(pet, v); zoomOn = co.zoomOn; ctl = mountGrowthChart(el, { ...co, target: markerFor(v, d) }); }
  else ctl = mountWeightChart(el, { ...weightChartOpts(pet, v), target: markerFor(v, d) });
  root.querySelector('[data-zoom]')?.addEventListener('click', (e) => { zoomOn = !zoomOn; ctl.setOpts({ maxMonth: zoomOn ? co.zoomMax : co.fullMax }); e.currentTarget.textContent = zoomOn ? 'Show full curve' : 'Zoom in'; });
  draw();

  root.addEventListener('click', async (e) => {
    const h = e.target.closest('button[data-h]');
    if (h) { const r = await calc('retarget', pet, d.days, d.kg, Number(h.dataset.h)); d = { days: r.days, kg: r.kg }; b = { lo: r.lo, hi: r.hi }; clamp(); draw(); changed(); return; }
    if (e.target.closest('[data-find]')) opts.onFind?.({ ...d });
    if (e.target.closest('[data-save]')) opts.onSave?.({ ...d });
    if (e.target.closest('[data-clear]')) opts.onClear?.();
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'tp-range') { d.kg = parseFloat(e.target.value); root.querySelector('#tp-num').value = d.kg; light(); changed(); }
    else if (e.target.id === 'tp-num') { const val = parseFloat(e.target.value); if (Number.isFinite(val) && val >= b.lo && val <= b.hi) { d.kg = val; root.querySelector('#tp-range').value = val; light(); changed(); } }
  });
  root.addEventListener('change', (e) => {
    if (e.target.id !== 'tp-num') return;
    const val = parseFloat(e.target.value);
    if (Number.isFinite(val)) { if (val < b.lo || val > b.hi) opts.onClamp?.(b); d.kg = val; }
    clamp(); draw(); changed();
  });
  return { getDraft: () => ({ ...d }), setDraft: (n) => { d = { ...n }; clamp(); draw(); } };
}
