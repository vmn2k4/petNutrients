// Bottom sheet (mobile) / modal (desktop) and toast. Accessible: dialog role, focus trap, Escape, focus return.
import { esc, icon } from './ui.js';

export function openSheet({ title, body, onMount, onClose }) {
  const wrap = document.createElement('div'); wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet__grab" aria-hidden="true"></div><div class="sheet__head"><h2 id="sheet-title">${esc(title)}</h2><button class="btn btn--ghost sheet__close" type="button" data-close aria-label="Close">${icon('x')}</button></div><div class="sheet__body">${body}</div></div>`;
  document.body.appendChild(wrap); document.body.classList.add('no-scroll');
  const prev = document.activeElement; const panel = wrap.querySelector('.sheet');
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  const focusables = () => [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]),select,textarea,[tabindex="0"]')].filter((e) => e.offsetParent !== null || e.matches('input'));
  let closed = false;
  const close = () => { if (closed) return; closed = true; document.removeEventListener('keydown', key); wrap.classList.remove('is-open'); setTimeout(() => { wrap.remove(); document.body.classList.remove('no-scroll'); prev?.focus?.(); onClose?.(); }, 240); };
  const key = (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return; const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', key);
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  onMount?.(panel.querySelector('.sheet__body'), close);
  (focusables().find((e) => !e.matches('[data-close]')) || panel).focus?.();
  return { close };
}

let toastTimer;
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = message; el.classList.add('is-in'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-in'), 4200);
}
