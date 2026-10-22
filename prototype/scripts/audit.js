// Dev-only UI audit. Load in the browser console: eval(await (await fetch('/scripts/audit.js')).text()); await window.__audit()
// Checks text contrast, touch targets, labels, alt text, headings and horizontal overflow on the current page.
window.__audit = async function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; } }
    let base = rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3);
    if (layers.length && layers[layers.length - 1][3] >= 0.99) base = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) { const [r, g, b, a] = layers[i]; base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)]; }
    return base;
  };
  const issues = []; const seen = new Set();
  const textEls = [...document.querySelectorAll('#app *, #footer *, .topbar *, .tabbar *')].filter((e) => {
    if (e.closest('svg') || e.closest('.sr-only') || e.classList.contains('sr-only')) return false;
    if (e.closest('.blob')) return false; // text sits on an SVG fill the audit cannot read: white on #15803d = 5.0:1 (checked by hand)
    const t = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length;
    const cs = getComputedStyle(e);
    return t > 0 && e.offsetParent !== null && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
  });
  for (const e of textEls) {
    const cs = getComputedStyle(e); const fg = rgba(cs.color); const bg = bgOf(e);
    const fgm = [fg[0] * fg[3] + bg[0] * (1 - fg[3]), fg[1] * fg[3] + bg[1] * (1 - fg[3]), fg[2] * fg[3] + bg[2] * (1 - fg[3])];
    const L1 = lum(fgm); const L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700); const need = large ? 3 : 4.5;
    if (ratio < need) { const k = `${e.className}|${e.textContent.trim().slice(0, 20)}`; if (!seen.has(k)) { seen.add(k); issues.push(`CONTRAST ${ratio.toFixed(2)} (<${need}) "${e.textContent.trim().slice(0, 28)}" .${String(e.className).split(' ')[0]} ${size}px`); } }
  }
  const inter = [...document.querySelectorAll('a[href],button,select,input:not([type=hidden]),textarea,summary,label.choice span,[tabindex="0"]')].filter((e) => e.offsetParent !== null || e.matches('input'));
  for (const e of inter) {
    if (e.matches('input[type=file]')) continue; // visually hidden; its label is the target
    let t = e;
    if (e.matches('input[type=radio],input[type=checkbox]')) { if (e.classList.contains('sr-only')) continue; t = e.closest('label') || e; }
    const r = t.getBoundingClientRect();
    if (r.width && r.height && (r.height < 43.5 || r.width < 43.5)) { const k = `T${e.tagName}${e.className}${Math.round(r.width)}${Math.round(r.height)}`; if (!seen.has(k)) { seen.add(k); issues.push(`TARGET ${Math.round(r.width)}x${Math.round(r.height)} <${e.tagName.toLowerCase()} .${String(e.className).split(' ')[0]}> "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 22)}"`); } }
  }
  for (const e of document.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea')) {
    const has = (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest('label') || e.getAttribute('aria-label');
    if (!has) issues.push(`NOLABEL <${e.tagName.toLowerCase()}> id=${e.id} name=${e.name}`);
  }
  for (const e of document.querySelectorAll('button,a[href]')) if (!e.textContent.trim() && !e.getAttribute('aria-label')) issues.push(`NONAME ${e.outerHTML.slice(0, 80)}`);
  for (const e of document.querySelectorAll('img')) if (!e.hasAttribute('alt')) issues.push(`NOALT ${e.src.slice(-30)}`);
  const h = [...document.querySelectorAll('#app h1,#app h2,#app h3')].map((x) => +x.tagName[1]);
  if (document.querySelectorAll('#app h1').length !== 1) issues.push(`H1 count ${document.querySelectorAll('#app h1').length}`);
  for (let i = 1; i < h.length; i++) if (h[i] - h[i - 1] > 1) issues.push(`HEADING skip h${h[i - 1]} to h${h[i]}`);
  const ov = document.documentElement.scrollWidth - innerWidth; if (ov > 0) issues.push(`OVERFLOW ${ov}`);
  return issues;
};
