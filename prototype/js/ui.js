// SHARED UI COMPONENTS: functions that return HTML. Each maps to one widget in the future Flutter app.
// No business logic and no data access here.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Phosphor icon font (one family). Names map our semantic names to Phosphor class names.
const PH = { home: 'house', paw: 'paw-print', bowl: 'bowl-food', scan: 'scan', flask: 'flask', check: 'check-circle', alert: 'warning', x: 'x-circle', help: 'question', star: 'star', filter: 'funnel', plus: 'plus', camera: 'camera', arrow: 'arrow-right', back: 'arrow-left', info: 'info', trash: 'trash', heart: 'heart', chart: 'chart-line-up', ruler: 'ruler', scales: 'scales', shield: 'shield-check', tag: 'tag', barcode: 'barcode', leaf: 'leaf', more: 'dots-three', book: 'book-open-text' };
export const icon = (name, cls = '') => `<i class="${cls.includes('is-on') ? 'ph-fill' : 'ph'} ph-${PH[name] || name} icon ${cls}" aria-hidden="true"></i>`;

export const button = ({ label, href, variant = 'primary', iconName, attrs = '', block = false, type = 'button' }) => {
  const c = `btn btn--${variant}${block ? ' btn--block' : ''}`;
  const inner = `${iconName ? icon(iconName) : ''}<span>${esc(label)}</span>`;
  return href ? `<a class="${c}" href="${esc(href)}" ${attrs}>${inner}</a>` : `<button class="${c}" type="${type}" ${attrs}>${inner}</button>`;
};

// Product picture: the maker's or retailer's packshot when we have one (their image, linked not copied), else our generic bowl. Falls back if the link is dead.
export const foodPic = (food, attrs = '') => `<img src="${esc(food.photo || food.img)}" alt="" width="600" height="600" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${esc(food.img)}'" ${attrs}>`;

export const card = (inner, { href, flat = false, cls = '' } = {}) =>
  href ? `<a class="card card--link ${flat ? 'card--flat' : ''} ${cls}" href="${esc(href)}">${inner}</a>` : `<section class="card ${flat ? 'card--flat' : ''} ${cls}">${inner}</section>`;

export const badge = (text, kind = '', iconName = '') => `<span class="badge ${kind ? `badge--${kind}` : ''}">${iconName ? icon(iconName) : ''}${esc(text)}</span>`;

const VERDICT_ICON = { good: 'check', caution: 'alert', bad: 'x' };
export const verdictBanner = (kind, title, body) =>
  `<div class="verdict verdict--${kind}" role="status">${icon(VERDICT_ICON[kind])}<div><h2>${esc(title)}</h2><p>${body}</p></div></div>`;
export const verdictBadge = (kind, text) => badge(text, kind, VERDICT_ICON[kind]);

export const stat = (value, label, note = '') => `<div class="stat"><div class="stat__value">${value}</div><div class="stat__label">${esc(label)}</div>${note ? `<div class="stat__note">${note}</div>` : ''}</div>`;

export const field = ({ id, label, type = 'text', value = '', hint = '', attrs = '', error = '' }) =>
  `<div class="field ${error ? 'field--error' : ''}"><label for="${id}">${esc(label)}</label><input class="input" id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${attrs} ${error ? `aria-invalid="true" aria-describedby="${id}-err"` : ''}>${hint ? `<span class="hint">${hint}</span>` : ''}${error ? `<span class="error-text" id="${id}-err">${esc(error)}</span>` : ''}</div>`;

export const selectField = ({ id, label, options, value = '', hint = '' }) =>
  `<div class="field"><label for="${id}">${esc(label)}</label><select class="select" id="${id}" name="${id}">${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

// Searchable dropdown that looks and behaves the same on every browser (replaces <input list> / <datalist>, whose popup is native and unstyled).
// The input keeps the typed or picked text as its value, so forms read it like any other field. Call mountCombos(root) after rendering.
export const comboField = ({ id, label, options, value = '', placeholder = '', hint = '' }) =>
  `<div class="field combo" data-combo data-options="${esc(JSON.stringify(options))}"><label for="${id}">${esc(label)}</label>
    <div class="combo__box"><input class="input combo__input" id="${id}" name="${id}" role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list" autocomplete="off" value="${esc(value)}" placeholder="${esc(placeholder)}">
    <button class="combo__toggle" type="button" tabindex="-1" aria-label="Show all options">${icon('caret-down')}</button>
    <ul class="combo__list" id="${id}-list" role="listbox" hidden></ul></div>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;

export function mountCombos(root) {
  root.querySelectorAll('[data-combo]').forEach((box) => {
    const input = box.querySelector('input'); const list = box.querySelector('ul'); const toggle = box.querySelector('.combo__toggle');
    const all = JSON.parse(box.dataset.options); let shown = []; let active = -1;
    const open = (v) => list.toggleAttribute('hidden', !v) || input.setAttribute('aria-expanded', String(v));
    const draw = (all_) => {
      const q = input.value.trim().toLowerCase();
      // every typed word must appear somewhere in the option, in any order ("open farm stew" finds "Open Farm Beef Dog Rustic Stew");
      // matches that start with the whole text come first, then ones that contain it as typed, then the rest
      const words = q.split(/\s+/).filter(Boolean); const lc = (o) => o.toLowerCase();
      const rest = all.filter((o) => words.every((w) => lc(o).includes(w)));
      shown = (all_ || !q ? all : [...rest.filter((o) => lc(o).startsWith(q)), ...rest.filter((o) => !lc(o).startsWith(q) && lc(o).includes(q)), ...rest.filter((o) => !lc(o).includes(q))]).slice(0, 60);
      active = shown.findIndex((o) => o.toLowerCase() === q);
      list.innerHTML = shown.length
        ? shown.map((o, i) => `<li role="option" id="${input.id}-o${i}" data-i="${i}" aria-selected="${i === active}">${esc(o)}</li>`).join('')
        : '<li class="combo__empty" role="presentation">No match. Leave it blank if mixed or not sure.</li>';
      open(true); mark();
    };
    const mark = () => { list.querySelectorAll('[role=option]').forEach((li, i) => li.classList.toggle('is-active', i === active)); const li = list.querySelector('.is-active'); if (li) { li.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', li.id); } else input.removeAttribute('aria-activedescendant'); };
    const pick = (o) => { input.value = o; open(false); input.dispatchEvent(new Event('change', { bubbles: true })); };
    input.addEventListener('focus', () => draw(true));
    input.addEventListener('input', () => draw(false));
    input.addEventListener('blur', () => open(false));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) draw(false); active = Math.min(shown.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1))); mark(); }
      else if (e.key === 'Enter' && !list.hidden && active >= 0) { e.preventDefault(); pick(shown[active]); }
      else if (e.key === 'Escape') open(false);
    });
    list.addEventListener('mousedown', (e) => { const li = e.target.closest('[role=option]'); if (li) { e.preventDefault(); pick(shown[Number(li.dataset.i)]); } });
    toggle.addEventListener('mousedown', (e) => { e.preventDefault(); if (list.hidden) { input.focus(); draw(true); } else open(false); });
  });
}

// Size follows the breed: once a known breed is typed or picked, the manual size select is replaced by a note
// (and the select is set to the breed's size, so the saved profile agrees). Blank or unknown breed shows the select.
// lookup(name) -> { size, min, max } | null comes from domain.js, so this stays free of data.
export const sizeBlock = ({ id, label, options, value, hint }) =>
  `<div data-size-field>${selectField({ id, label, value, options, hint })}</div><p class="notice notice--info" data-size-note hidden></p>`;

export function bindBreedSize(root, { breedId, sizeId, lookup, labelOf }) {
  const breed = root.querySelector(`#${breedId}`); const size = root.querySelector(`#${sizeId}`);
  const wrap = root.querySelector('[data-size-field]'); const note = root.querySelector('[data-size-note]');
  if (!breed || !size) return;
  const sync = () => {
    const b = lookup(breed.value);
    wrap.hidden = !!b; note.hidden = !b;
    if (!b && size.dataset.fromBreed) { size.value = 'IV'; delete size.dataset.fromBreed; } // back to the mixed-breed default
    if (b) {
      size.dataset.fromBreed = '1';
      size.value = b.size;
      const kg = b.min === b.max ? `about ${b.min} kg` : `usually ${Math.round(b.min)} to ${Math.round(b.max)} kg`;
      note.textContent = `Adult size comes from the breed: ${labelOf(b.size)}, ${kg}.`;
    }
  };
  breed.addEventListener('change', sync); breed.addEventListener('input', sync); sync();
}

export const choiceGroup = ({ name, legend, options, value, type = 'radio', tall = false }) =>
  `<fieldset class="field"><legend class="legend">${esc(legend)}</legend><div class="choices">${options.map((o) => {
    const on = type === 'radio' ? String(o.value) === String(value) : (value || []).includes(o.value);
    return `<label class="choice ${tall ? 'choice--tall' : ''}"><input type="${type}" name="${name}" value="${esc(o.value)}" ${on ? 'checked' : ''}><span>${o.icon ? icon(o.icon) : ''}${esc(o.label)}${o.sub ? `<small class="muted">${esc(o.sub)}</small>` : ''}</span></label>`;
  }).join('')}</div></fieldset>`;

export const stepper = (total, current) =>
  `<div class="stepper" role="img" aria-label="Step ${current + 1} of ${total}">${Array.from({ length: total }, (_, i) => `<span class="stepper__dot" data-state="${i < current ? 'done' : i === current ? 'current' : 'todo'}"></span>`).join('')}</div>`;

// min/max markers on a meter: value vs target band
export const meter = ({ label, value, unit, min, max, state, scaleMax }) => {
  const fmt = (n) => (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10); // 74.5, not 74.54335362163032
  const top = scaleMax || Math.max(value ?? 0, max ?? 0, (min ?? 0) * 2) * 1.15 || 1;
  const w = value == null ? 0 : Math.min(100, (value / top) * 100);
  return `<div class="meter" data-state="${state || ''}"><div class="meter__head"><span>${esc(label)}</span><strong>${value == null ? 'not reported' : `${value.toFixed(1)} ${esc(unit)}`}</strong></div><div class="meter__track" role="img" aria-label="${esc(label)} ${value == null ? 'not reported' : value.toFixed(1)}${min != null ? `, minimum ${fmt(min)}` : ''}${max != null ? `, maximum ${fmt(max)}` : ''}"><div class="meter__fill" style="width:${w}%"></div>${min != null ? `<span class="meter__mark" style="left:${(min / top) * 100}%"></span>` : ''}${max != null ? `<span class="meter__mark" style="left:${(max / top) * 100}%"></span>` : ''}</div><div class="hint">${min != null ? `min ${fmt(min)}` : ''}${min != null && max != null ? ' · ' : ''}${max != null ? `max ${fmt(max)}` : ''}${min == null && max == null ? 'no AAFCO limit' : ''}</div></div>`;
};

export const stars = (n) => `<span class="stars" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => icon('star', i <= Math.round(n) ? 'is-on' : '')).join('')}</span>`;

export const ratingInput = (name) =>
  `<fieldset class="field"><legend class="legend">Overall</legend><div class="rating-input">${[5, 4, 3, 2, 1].map((i) => `<input class="sr-only" type="radio" id="${name}-${i}" name="${name}" value="${i}" ${i === 5 ? 'checked' : ''}><label for="${name}-${i}"><span class="sr-only">${i} stars</span>${icon('star')}</label>`).join('')}</div></fieldset>`;

export const notice = (html, kind = '') => `<div class="notice ${kind ? `notice--${kind}` : ''}" role="note">${icon(kind === 'caution' ? 'alert' : 'info')}<div>${html}</div></div>`;
export const disclosure = (summary, inner) => `<details class="disclosure"><summary>${esc(summary)}</summary>${inner}</details>`;
// Yellow page band with wavy edge and doodles. Used by every screen so the whole app shares one look.
export const pageBand = (title, lead = '', extra = '', art = '') => `<section class="pband${art ? ' pband--art' : ''}"><span class="doodle d1" aria-hidden="true">${icon('paw')}</span><span class="doodle d2" aria-hidden="true">${icon('bone')}</span><span class="doodle d3" aria-hidden="true">${icon('fish')}</span>${art ? `<img class="pband__pet" src="/assets/${art}-480.webp" alt="" width="400" height="400">` : ''}<div class="wrap pband__inner"><h1>${esc(title)}</h1>${lead ? `<p class="pband__lead">${lead}</p>` : ''}${extra}</div><svg class="wave pband__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,45 C180,95 360,0 540,38 C720,76 900,100 1080,52 C1260,6 1380,30 1440,48 L1440,90 L0,90 Z"/></svg></section>`;
export const pageHead = pageBand;
export const iconBubble = (name) => `<span class="icon-bubble">${icon(name)}</span>`;

// Circular progress (plan accuracy). Text alternative included.
export const progressRing = (percent, label) => `<div class="ring" role="img" aria-label="${esc(label)} ${percent} percent"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="ring__track" cx="40" cy="40" r="34"/><circle class="ring__fill" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="${percent} 100"/></svg><span class="ring__num">${percent}<small>%</small></span></div>`;

// Friendly empty state with a transparent pet.
export const emptyState = ({ img, title, text, action = '', compact = false }) => `<div class="empty${compact ? ' empty--compact' : ''}"><img src="/assets/${img}-480.webp" alt="" width="240" height="240" loading="lazy"><div><h2 class="item-title">${esc(title)}</h2><p class="muted" style="margin-bottom:${action ? 'var(--space-4)' : '0'}">${text}</p>${action}</div></div>`;

// Section tabs for My pet (Overview, Growth, Profile).
export const petTabs = (active) => `<nav class="pettabs" aria-label="My pet sections">${[['overview', 'Overview', '/pet'], ['growth', 'Growth', '/pet/growth'], ['diet', 'Diet', '/pet/diet'], ['profile', 'Profile', '/pet/profile']].map(([k, l, h]) => `<a href="${h}" ${active === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
// Wording shown wherever a daily kcal or gram amount appears: it is an estimate, and a diet change belongs with the vet.
export const KCAL_NOTE = 'Calories are estimates, not exact amounts. Check with your vet before starting or changing a diet, especially a weight-loss or weight-gain plan.';
// Short persistent disclaimer shown next to estimates (growth, calories, matches, safety answers).
export const expNote = (extra = '') => `<p class="expnote">${icon('info')} Beta and experimental. We do our best with the best information available, but it can be wrong. Not veterinary advice, and we are not responsible for decisions made from it. Check with another reliable source and your vet before acting.${extra} <a href="/disclaimer">Disclaimer</a></p>`;
