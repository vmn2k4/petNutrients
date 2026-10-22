// Small, motivated motion: numbers count up to their value (draws the eye to the result). Honors reduced motion.
export function runCounters(root = document) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count); const dec = Number(el.dataset.dec || 0);
    const fmt = (v) => (dec ? v.toFixed(dec) : String(Math.round(v)));
    if (reduce || !Number.isFinite(to)) { el.textContent = fmt(to); return; }
    const t0 = performance.now(); const dur = 900;
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
