// WEIGHT LOG: the history of weigh-ins, newest first, with the change since the one before. Shows the latest few; the rest unfold.
import { card, disclosure, badge, button, esc } from '../ui.js';
import { round, fmtDay } from '../format.js';

const row = (l, prev) => { const d = prev ? l.kg - prev.kg : null; return `<li class="wlog__row"><span class="wlog__date">${esc(fmtDay(l.on))}</span><strong>${round(l.kg, 1)} kg</strong><span class="wlog__delta ${d == null ? '' : d > 0 ? 'is-up' : d < 0 ? 'is-down' : ''}">${d == null ? '' : `${d > 0 ? '+' : ''}${round(d, 1)} kg`}</span></li>`; };

export function weightLogHtml(pet, s, { show = 5 } = {}) {
  const logs = [...(pet.logs || [])].sort((a, b) => (a.on < b.on ? 1 : -1));
  const head = '<h2 style="margin:0">Weight log</h2>';
  if (!logs.length) return card(`${head}<p class="muted" style="margin:var(--space-3) 0 0">No weigh-ins yet.</p>`);
  const rows = logs.map((l, i) => row(l, logs[i + 1]));
  const w = s.weigh;
  const rhythm = `<div class="row row--between wlog__rhythm"><span class="small muted">Every ${w.interval === 14 ? '2 weeks' : 'month'}${w.streak ? '' : ''}</span><span class="row">${w.streak ? badge(`${w.streak} on schedule`, 'good', 'fire') : ''}${button({ label: 'Skip this one', variant: 'ghost btn--small', attrs: 'data-skip-weigh title="Skipping keeps your streak"' })}</span></div>`;
  return card(`${head}${rhythm}<ul class="wlog">${rows.slice(0, show).join('')}</ul>${rows.length > show ? disclosure(`Show all ${rows.length} weigh-ins`, `<ul class="wlog">${rows.slice(show).join('')}</ul>`) : ''}`);
}
