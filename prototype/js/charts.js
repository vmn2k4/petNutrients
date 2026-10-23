// SHARED CHART COMPONENT: growth chart with percentile bands.
// Pure SVG, drawn at the container's real pixel width so text stays readable on phones.
// Smoothed bands (the source data is empirical and jagged), direct percentile labels, a clear marker
// for the latest weight, and a hover/tap readout. Colors come from CSS tokens via classes.
import { esc } from './ui.js';

const KEYS = ['p02', 'p25', 'p50', 'p75', 'p98'];
const LABELS = { p98: '98th', p75: '75th', p50: '50th', p25: '25th', p02: '2nd' };

// 3-point moving average, edges use 2 points.
const smooth = (rows, key) => rows.map((_, i) => {
  const a = rows[Math.max(0, i - 1)][key]; const b = rows[i][key]; const c = rows[Math.min(rows.length - 1, i + 1)][key];
  return i === 0 || i === rows.length - 1 ? (b + (i === 0 ? c : a)) / 2 : (a + b + c) / 3;
});

// Monotone cubic segments (no overshoot) through increasing-x points.
function segments(pts) {
  const n = pts.length; const dx = []; const m = []; const s = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  s[0] = m[0]; s[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) s[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  return pts.slice(0, -1).map((p, i) => ({ c1: [p[0] + dx[i] / 3, p[1] + (s[i] * dx[i]) / 3], c2: [pts[i + 1][0] - dx[i] / 3, pts[i + 1][1] - (s[i + 1] * dx[i]) / 3], to: pts[i + 1], from: p }));
}
const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const forward = (sg) => sg.map((g) => `C${f(g.c1)} ${f(g.c2)} ${f(g.to)}`).join(' ');
const backward = (sg) => [...sg].reverse().map((g) => `C${f(g.c2)} ${f(g.c1)} ${f(g.from)}`).join(' ');

// A smooth curve through the owner's own weigh-ins. Monotone cubic: it passes through every point and never overshoots,
// so a puppy's line bends like real growth instead of zig-zagging between dots. Points that share an x are merged.
function smoothD(coords) {
  const c = [];
  coords.slice().sort((a, b) => a[0] - b[0]).forEach((p) => { const l = c[c.length - 1]; if (l && Math.abs(l[0] - p[0]) < 0.5) l[1] = (l[1] + p[1]) / 2; else c.push([p[0], p[1]]); });
  if (c.length < 2) return '';
  if (c.length === 2) return `M${f(c[0])} L${f(c[1])}`;
  return `M${f(c[0])} ${forward(segments(c))}`;
}

function niceTicks(max, count = 4) {
  // smallest "nice" step that reaches the data maximum in at most count + 1 steps, so there is little wasted headroom
  const steps = []; for (let e = -2; e <= 4; e++) [1, 2, 2.5, 5].forEach((b) => steps.push(b * 10 ** e));
  const step = steps.find((s) => Math.ceil(max / s) <= count + 1) || max;
  const out = []; for (let v = 0; ; v += step) { out.push(+v.toFixed(2)); if (v >= max) break; }
  return { ticks: out, top: out[out.length - 1] };
}

export function growthChart({ bands, points, unit = 'kg', maxMonth, title, width = 640, label = '', compact = false, target = null, pick = false, projection = null, marks = [] }) {
  const W = Math.max(280, Math.round(width));
  const H = compact ? Math.round(W * 0.55) : Math.round(Math.min(420, Math.max(250, W * 0.62)));
  const m = { l: compact ? 34 : 42, r: compact ? 34 : 46, t: 30, b: compact ? 30 : 46 };
  const rows = bands.filter((r) => r.m >= 1 && r.m <= maxMonth);
  const maxData = Math.max(...rows.map((r) => r.p98), ...points.map((p) => p.kg), ...(projection ? projection.points.filter((p) => p.m <= maxMonth).map((p) => p.kg) : []));
  const { ticks, top } = niceTicks(maxData * 1.04, compact ? 3 : 4);
  const x = (mo) => m.l + ((mo - 1) / (maxMonth - 1)) * (W - m.l - m.r);
  const y = (kg) => H - m.b - (kg / top) * (H - m.t - m.b);
  const S = {}; KEYS.forEach((k) => { S[k] = smooth(rows, k); });
  const pts = (k) => rows.map((r, i) => [x(r.m), y(S[k][i])]);
  const seg = {}; KEYS.forEach((k) => { seg[k] = segments(pts(k)); });
  const area = (lo, hi) => `M${f(pts(hi)[0])} ${forward(seg[hi])} L${f(pts(lo)[rows.length - 1])} ${backward(seg[lo])} Z`;
  const line = (k) => `M${f(pts(k)[0])} ${forward(seg[k])}`;
  const xStep = maxMonth > 24 ? 6 : 3;
  const xTicks = []; for (let t = xStep; t <= maxMonth; t += xStep) xTicks.push(t);
  // direct labels at the right end, nudged apart
  const last = rows.length - 1; let prev = -99; const lab = KEYS.slice().reverse().map((k) => { let yy = y(S[k][last]); if (yy - prev < 13) yy = prev + 13; prev = yy; return { k, y: yy }; });
  const sorted = [...points].sort((a, b) => a.m - b.m); const now = sorted[sorted.length - 1];
  const mid = (mo) => { const i = rows.findIndex((r) => r.m >= mo); if (i <= 0) return S.p50[Math.max(0, i)]; const a = rows[i - 1]; const b = rows[i]; return S.p50[i - 1] + (S.p50[i] - S.p50[i - 1]) * ((mo - a.m) / (b.m - a.m || 1)); };
  // the projected path starts exactly at the latest weigh-in and eases onto the percentile line the pet is following
  const projD = () => {
    if (!projection) return { d: '', end: null };
    const p0 = projection.points[0]; const vis = projection.points.filter((p) => p.m <= maxMonth);
    if (vis.length < 2) return { d: '', end: null };
    const adj = vis.map((p) => ({ m: p.m, kg: p.kg + (now.kg - p0.kg) * Math.exp(-(p.m - p0.m) / 2.5) }));
    return { d: smoothD(adj.map((p) => [x(Math.max(1, p.m)), y(p.kg)])), end: adj[adj.length - 1] };
  };
  // the route to a target follows the typical growth shape (fast early, slowing later), not a straight line
  const planD = (tg) => {
    const m0 = Math.max(1, now.m); const mf = Math.min(maxMonth, Math.max(1, tg.m)); const span = mid(mf) - mid(m0);
    const pts = []; for (let k = 0; k <= 10; k++) { const mo = m0 + ((mf - m0) * k) / 10; const s = Math.abs(span) > 0.2 ? (mid(mo) - mid(m0)) / span : k / 10; pts.push([x(mo), y(now.kg + (tg.kg - now.kg) * s)]); }
    return smoothD(pts);
  };
  const pLine = sorted.map((p) => f([x(Math.max(1, p.m)), y(p.kg)]));
  const text = `${label ? `${label} ` : ''}${now.kg} ${unit}`; const tw = text.length * 7 + 18;
  const bx = Math.min(W - m.r - tw + 20, Math.max(m.l, x(Math.max(1, now.m)) - tw / 2)); const by = Math.max(m.t, y(now.kg) - 42);
  const ariaLabel = `${title}. ${sorted.map((p) => `${p.kg} ${unit} at ${Math.round(p.m * 10) / 10} months`).join('; ')}. Shaded bands show the 2nd to 98th percentile.`;
  return `<svg class="chart${pick ? ' chart--pick' : ''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(ariaLabel)}" data-w="${W}" data-h="${H}" data-ml="${m.l}" data-mr="${m.r}" data-mt="${m.t}" data-mb="${m.b}" data-top="${top}" data-max="${maxMonth}" data-pts="${esc(JSON.stringify([...sorted.map((p) => [Math.round(x(Math.max(1, p.m))), Math.round(y(p.kg))]), ...(target ? [[Math.round(x(Math.min(maxMonth, Math.max(1, target.m)))), Math.round(y(target.kg))]] : [])]))}">
    <defs><linearGradient id="gcOuter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--chart-band-outer)" stop-opacity="1"/><stop offset="1" stop-color="var(--chart-band-outer)" stop-opacity="1"/></linearGradient></defs>
    ${ticks.map((t) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="tick" x="${m.l - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${t}</text>`).join('')}
    ${xTicks.map((t) => `<text class="tick" x="${x(t).toFixed(1)}" y="${H - m.b + 18}" text-anchor="middle">${t}</text>`).join('')}
    <text class="axis-title" x="${((m.l + W - m.r) / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">Age in months</text>
    <text class="axis-title" x="${m.l - 8}" y="${m.t - 14}" text-anchor="end">${unit}</text>
    <path class="band-outer" d="${area('p02', 'p98')}"/>
    <path class="band-inner" d="${area('p25', 'p75')}"/>
    <path class="pline pline--edge" d="${line('p02')}"/><path class="pline pline--edge" d="${line('p98')}"/>
    <path class="median" d="${line('p50')}"/>
    ${lab.map((l) => `<text class="plabel${l.k === 'p50' ? ' plabel--median' : ''}" x="${W - m.r + 6}" y="${(l.y + 4).toFixed(1)}">${LABELS[l.k]}</text>`).join('')}
    <g class="tip" hidden><line class="tip-line" y1="${m.t}" y2="${H - m.b}"/><g class="tip-box"><rect rx="10" width="132" height="86"/><text class="tip-title" x="10" y="19"></text><text x="10" y="37" class="tip-row" data-k="p98"></text><text x="10" y="53" class="tip-row" data-k="p50"></text><text x="10" y="69" class="tip-row" data-k="p02"></text></g></g>
    ${marks.filter((k) => k.m >= 1 && k.m <= maxMonth).map((k) => `<g class="diet-mark"><title>${esc(k.label)}</title><line x1="${x(k.m).toFixed(1)}" x2="${x(k.m).toFixed(1)}" y1="${m.t}" y2="${H - m.b}"/><circle r="9" cx="${x(k.m).toFixed(1)}" cy="${m.t - 6}"/><text x="${x(k.m).toFixed(1)}" y="${m.t - 2.5}" text-anchor="middle">${k.n}</text></g>`).join('')}
    ${(() => { const pj = projD(); if (!pj.d) return ''; const ex = x(Math.max(1, pj.end.m)); const ey = y(pj.end.kg); const near = target && Math.abs(y(target.kg) - ey) < 26 && Math.abs(x(Math.min(maxMonth, Math.max(1, target.m))) - ex) < 150; return `<path class="proj-line" d="${pj.d}"/><circle class="proj-end" r="5" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}"/><text class="proj-label" x="${(ex - 8).toFixed(1)}" y="${(ey + (near ? 26 : -12)).toFixed(1)}" text-anchor="end">${compact ? '' : `Projected ${pj.end.kg.toFixed(0)} kg`}</text>`; })()}
    ${sorted.length > 1 ? `<path class="pet-line" pathLength="1" d="${smoothD(sorted.map((p) => [x(Math.max(1, p.m)), y(p.kg)]))}"/>` : ''}
    ${sorted.slice(0, -1).map((p) => `<circle class="pet-dot pet-dot--past" r="4.5" cx="${x(Math.max(1, p.m)).toFixed(1)}" cy="${y(p.kg).toFixed(1)}"/>`).join('')}
    <circle class="pet-halo" r="13" cx="${x(Math.max(1, now.m)).toFixed(1)}" cy="${y(now.kg).toFixed(1)}"/>
    <circle class="pet-dot" r="7" cx="${x(Math.max(1, now.m)).toFixed(1)}" cy="${y(now.kg).toFixed(1)}"/>
    ${compact ? '' : (() => { const nx = x(Math.max(1, now.m)); const ny = y(now.kg); const room = nx - 14 - tw > m.l; return `<text class="now-label" x="${(room ? nx - 14 : nx + 14).toFixed(1)}" y="${(room ? ny - 12 : ny + 24).toFixed(1)}" text-anchor="${room ? 'end' : 'start'}">${esc(text)}</text>`; })()}
    ${target ? (() => { const tx = x(Math.min(maxMonth, Math.max(1, target.m))); const ty = y(target.kg); const lab = target.label || `Target ${target.kg.toFixed(1)} kg`; const end = tx > W - 130; return `<path class="target-line" d="${planD(target)}"/><circle class="target-dot" r="9" cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}"/><text class="target-label" x="${(end ? tx - 14 : tx + 14).toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="${end ? 'end' : 'start'}">${esc(lab)}</text>`; })() : ''}
    <rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>
  </svg>`;
}

export function chartLegend({ projection = false, diet = false } = {}) {
  return `<ul class="chart-legend" aria-hidden="true"><li><i class="sw sw--outer"></i>Typical range, 2nd to 98th percentile</li><li><i class="sw sw--inner"></i>Middle half, 25th to 75th</li><li><i class="sw sw--pet"></i>Your pet</li>${projection ? '<li><i class="sw sw--proj"></i>Projected on the current track</li>' : ''}${diet ? '<li><i class="sw sw--diet"></i>Diet change</li>' : ''}</ul>`;
}


// Hover or tap a weigh-in dot to see its details. `items` are the chart's points oldest first, in the same order the dots are drawn;
// `info(item)` returns the HTML for the tip (date, age, weight, percentile). Large invisible circles make the dots easy to hit.
function bindDots(container, items, info) {
  const svg = container.querySelector('svg'); if (!svg || !info) return;
  const dots = [...svg.querySelectorAll('.pet-dot')]; if (!dots.length) return;
  container.style.position = 'relative';
  const tip = document.createElement('div'); tip.className = 'dottip'; tip.hidden = true; tip.setAttribute('role', 'status'); container.appendChild(tip);
  const show = (i) => {
    const dot = dots[i]; const item = items[i]; if (!dot || !item) return;
    const c = container.getBoundingClientRect(); const r = dot.getBoundingClientRect();
    tip.innerHTML = info(item); tip.hidden = false;
    const cx = r.left - c.left + r.width / 2; const w = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(cx - w / 2, 0), Math.max(0, c.width - w))}px`;
    tip.style.top = `${Math.max(0, r.top - c.top - tip.offsetHeight - 10)}px`;
  };
  dots.forEach((dot, i) => {
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('class', 'dot-hit'); hit.setAttribute('r', '15'); hit.setAttribute('cx', dot.getAttribute('cx')); hit.setAttribute('cy', dot.getAttribute('cy'));
    hit.addEventListener('pointerenter', () => show(i)); hit.addEventListener('click', (e) => { e.stopPropagation(); show(i); });
    hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') tip.hidden = true; });
    svg.appendChild(hit);
  });
  svg.addEventListener('click', () => { tip.hidden = true; });
}

// Renders into a container at its real width, re-renders on resize, and wires the hover/tap readout.
// The chart is read-only: the target is set with the controls under it, never by clicking the plot. Returns { setTarget }.
export function mountGrowthChart(container, opts) {
  if (!container) return null;
  let o = { ...opts };
  const draw = () => {
    const w = container.clientWidth || 640;
    container.innerHTML = growthChart({ ...o, width: w, pick: false });
    const svg = container.querySelector('svg'); const tip = svg.querySelector('.tip'); if (!svg || o.compact) return;
    bindDots(container, [...o.points].sort((a, b) => a.m - b.m), o.pointInfo);
    const d = svg.dataset; const max = +d.max; const ml = +d.ml; const mr = +d.mr; const mt = +d.mt; const mb = +d.mb; const W = +d.w; const H = +d.h; const top = +d.top;
    const rows = o.bands.filter((r) => r.m >= 1 && r.m <= max); const hit = svg.querySelector('.hit'); const box = svg.querySelector('.tip-box');
    const at = (e) => { const r = svg.getBoundingClientRect(); return { px: ((e.clientX - r.left) / r.width) * W, py: ((e.clientY - r.top) / r.height) * H }; };
    const show = (e) => {
      const { px } = at(e); const lo = rows[0].m; const hi = rows[rows.length - 1].m; const mo = Math.min(hi, Math.max(lo, Math.round(1 + ((px - ml) / (W - ml - mr)) * (max - 1)))); const row = rows.find((q) => q.m === mo) || rows[0];
      const xx = ml + ((mo - 1) / (max - 1)) * (W - ml - mr); tip.hidden = false;
      tip.querySelector('.tip-line').setAttribute('x1', xx); tip.querySelector('.tip-line').setAttribute('x2', xx);
      const bx = xx > W / 2 ? xx - 142 : xx + 10; let by = mt + 6; let dots = [];
      try { dots = JSON.parse(d.pts || '[]'); } catch { dots = []; }
      const hits = (yy) => dots.some(([dx, dy]) => dx > bx - 14 && dx < bx + 146 && dy > yy - 14 && dy < yy + 100);
      if (hits(by)) { const alt = H - mb - 92; if (!hits(alt)) by = alt; }
      box.setAttribute('transform', `translate(${bx},${by})`);
      box.querySelector('.tip-title').textContent = `${mo} months`;
      box.querySelector('[data-k=p98]').textContent = `98th   ${row.p98} kg`; box.querySelector('[data-k=p50]').textContent = `Median ${row.p50} kg`; box.querySelector('[data-k=p02]').textContent = `2nd    ${row.p02} kg`;
    };
    hit.addEventListener('pointermove', show); hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; });
  };
  draw();
  if ('ResizeObserver' in window) { let lastW = container.clientWidth; new ResizeObserver(() => { if (Math.abs(container.clientWidth - lastW) > 8) { lastW = container.clientWidth; draw(); } }).observe(container); }
  return { setTarget: (tg) => { o = { ...o, target: tg }; draw(); }, setOpts: (patch) => { o = { ...o, ...patch }; draw(); } };
}

// ---- weight over time (adult pets: no growth curve, so show the trend against a healthy range) ----
const fmtDay = (ms) => new Date(ms).toLocaleDateString('en', { month: 'short', day: 'numeric' });

export function weightChart({ points, idealKg = null, range = null, label = '', title, width = 640, target = null, pick = false, projection = null, marks = [] }) {
  const W = Math.max(280, Math.round(width)); const H = Math.round(Math.min(380, Math.max(240, W * 0.55)));
  const m = { l: 42, r: 16, t: 30, b: 42 };
  const pts = [...points].map((p) => ({ t: new Date(p.on).getTime(), kg: p.kg })).sort((a, b) => a.t - b.t);
  const DAY = 86400000; const now = Date.now();
  const x0 = Math.min(pts[0].t, now - 60 * DAY); const x1 = Math.max(pts[pts.length - 1].t, now, target ? target.t : 0, projection ? projection.points[projection.points.length - 1].t : 0) + 7 * DAY;
  const ys = [...pts.map((p) => p.kg), ...(projection ? projection.points.map((p) => p.kg) : []), ...(target ? [target.kg] : []), ...(idealKg ? [idealKg] : []), ...(range ? [range.min, range.max] : [])];
  const lo0 = Math.min(...ys); const hi0 = Math.max(...ys); const pad = Math.max(1, (hi0 - lo0) * 0.15);
  const { ticks, top } = niceTicks(hi0 + pad, 4); const bottom = Math.max(0, Math.floor((lo0 - pad) / (ticks[1] - ticks[0] || 1)) * (ticks[1] - ticks[0] || 1));
  const yT = ticks.filter((t) => t >= bottom);
  const x = (t) => m.l + ((t - x0) / (x1 - x0)) * (W - m.l - m.r);
  const y = (kg) => H - m.b - ((kg - bottom) / (top - bottom || 1)) * (H - m.t - m.b);
  const xt = Array.from({ length: 4 }, (_, i) => x0 + ((x1 - x0) * i) / 3);
  const now_ = pts[pts.length - 1]; const text = `${label ? `${label} ` : ''}${round1(now_.kg)} kg`; const tw = text.length * 7 + 18;
  const bx = Math.min(W - m.r - tw, Math.max(m.l, x(now_.t) - tw / 2)); const by = Math.max(m.t - 10, y(now_.kg) - 42);
  const aria = `${title}. ${pts.map((p) => `${round1(p.kg)} kg on ${fmtDay(p.t)}`).join('; ')}.${idealKg ? ` Ideal weight about ${round1(idealKg)} kg.` : ''}${range ? ` Usual adult range ${round1(range.min)} to ${round1(range.max)} kg.` : ''}`;
  return `<svg class="chart${pick ? ' chart--pick' : ''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(aria)}" data-w="${W}" data-h="${H}" data-ml="${m.l}" data-mr="${m.r}" data-mt="${m.t}" data-mb="${m.b}" data-x0="${x0}" data-x1="${x1}" data-top="${top}" data-bottom="${bottom}">
    ${yT.map((t) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="tick" x="${m.l - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${t}</text>`).join('')}
    ${xt.map((t, i) => `<text class="tick" x="${x(t).toFixed(1)}" y="${H - m.b + 18}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}">${fmtDay(t)}</text>`).join('')}
    <text class="axis-title" x="${m.l - 8}" y="${m.t - 14}" text-anchor="end">kg</text>
    ${range ? `<rect class="band-inner" x="${m.l}" y="${y(range.max).toFixed(1)}" width="${W - m.l - m.r}" height="${(y(range.min) - y(range.max)).toFixed(1)}" rx="6"/><text class="plabel" x="${m.l + 6}" y="${(y(range.min) - 6).toFixed(1)}">Usual adult range</text>` : ''}
    ${idealKg ? `<line class="ideal-line" x1="${m.l}" x2="${W - m.r}" y1="${y(idealKg).toFixed(1)}" y2="${y(idealKg).toFixed(1)}"/><text class="ideal-label" x="${m.l + 6}" y="${(y(idealKg) - 6).toFixed(1)}">Ideal about ${round1(idealKg)} kg</text>` : ''}
    ${marks.filter((k) => k.t >= x0 && k.t <= x1).map((k) => `<g class="diet-mark"><title>${esc(k.label)}</title><line x1="${x(k.t).toFixed(1)}" x2="${x(k.t).toFixed(1)}" y1="${m.t}" y2="${H - m.b}"/><circle r="9" cx="${x(k.t).toFixed(1)}" cy="${m.t - 6}"/><text x="${x(k.t).toFixed(1)}" y="${m.t - 2.5}" text-anchor="middle">${k.n}</text></g>`).join('')}
    ${projection ? (() => { const lp = pts[pts.length - 1]; const pp = projection.points; const ex = x(pp[2].t); const ey = y(pp[2].kg); const near = target && Math.abs(y(target.kg) - ey) < 26 && Math.abs(x(target.t) - ex) < 150; return `<path class="proj-line" d="${smoothD([[x(lp.t), y(lp.kg)], [x(pp[1].t), y(pp[1].kg)], [ex, ey]])}"/><circle class="proj-end" r="5" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}"/><text class="proj-label" x="${(ex - 8).toFixed(1)}" y="${(ey + (near ? 26 : -12)).toFixed(1)}" text-anchor="end">Projected ${pp[2].kg.toFixed(1)} kg</text>`; })() : ''}
    ${pts.length > 1 ? `<path class="pet-line" pathLength="1" d="${smoothD(pts.map((p) => [x(p.t), y(p.kg)]))}"/>` : ''}
    ${pts.slice(0, -1).map((p) => `<circle class="pet-dot pet-dot--past" r="4.5" cx="${x(p.t).toFixed(1)}" cy="${y(p.kg).toFixed(1)}"><title>${round1(p.kg)} kg, ${fmtDay(p.t)}</title></circle>`).join('')}
    <circle class="pet-halo" r="13" cx="${x(now_.t).toFixed(1)}" cy="${y(now_.kg).toFixed(1)}"/><circle class="pet-dot" r="7" cx="${x(now_.t).toFixed(1)}" cy="${y(now_.kg).toFixed(1)}"><title>${round1(now_.kg)} kg, ${fmtDay(now_.t)}</title></circle>
    ${(() => { const nx = x(now_.t); const ny = y(now_.kg); const room = nx - 14 - tw > m.l; return `<text class="now-label" x="${(room ? nx - 14 : nx + 14).toFixed(1)}" y="${(room ? ny - 12 : ny + 24).toFixed(1)}" text-anchor="${room ? 'end' : 'start'}">${esc(text)}</text>`; })()}
    ${target ? (() => { const tx = x(target.t); const ty = y(target.kg); const lab = target.label || `Target ${round1(target.kg)} kg`; const end = tx > W - 130; return `<line class="target-line" x1="${x(now_.t).toFixed(1)}" y1="${y(now_.kg).toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}"/><circle class="target-dot" r="9" cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}"/><text class="target-label" x="${(end ? tx - 14 : tx + 14).toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="${end ? 'end' : 'start'}">${esc(lab)}</text>`; })() : ''}
    <rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>
  </svg>`;
}
const round1 = (n) => Math.round(n * 10) / 10;

export function weightLegend({ hasRange, hasIdeal, hasProjection = false, hasDiet = false }) {
  return `<ul class="chart-legend" aria-hidden="true"><li><i class="sw sw--pet"></i>Weigh-ins</li>${hasProjection ? '<li><i class="sw sw--proj"></i>Projected on the recent trend</li>' : ''}${hasDiet ? '<li><i class="sw sw--diet"></i>Diet change</li>' : ''}${hasRange ? '<li><i class="sw sw--inner"></i>Usual adult range for the breed</li>' : ''}${hasIdeal ? '<li><i class="sw sw--ideal"></i>Estimated ideal weight</li>' : ''}</ul>`;
}

export function mountWeightChart(container, opts) {
  if (!container) return null;
  let o = { ...opts };
  const draw = () => {
    container.innerHTML = weightChart({ ...o, width: container.clientWidth || 640, pick: false });
    bindDots(container, [...o.points].sort((a, b) => new Date(a.on) - new Date(b.on)), o.pointInfo);
  };
  draw();
  if ('ResizeObserver' in window) { let last = container.clientWidth; new ResizeObserver(() => { if (Math.abs(container.clientWidth - last) > 8) { last = container.clientWidth; draw(); } }).observe(container); }
  return { setTarget: (tg) => { o = { ...o, target: tg }; draw(); } };
}
