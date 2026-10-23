// PLAN ACCURACY: how complete the pet's answers are, and the questions still open. Lives on Profile, where the answers can be changed.
import { card, icon, esc, progressRing } from '../ui.js';
import { FIELDS } from './petfields.js';

export function planAccuracyHtml(pet, s) {
  const pct = s.completeness; const left = s.remaining.filter((k) => FIELDS[k]);
  if (!left.length) return card(`<div class="plancard plancard--slim">${progressRing(100, 'Plan accuracy')}<div><h2>${esc(pet.name)}'s plan is complete</h2></div></div>`, { cls: 'card--tight' });
  return card(`<div class="plancard plancard--slim">${progressRing(pct, 'Plan accuracy')}<div><h2>Make the plan more accurate</h2></div><div class="chips">${left.map((k) => `<button type="button" class="chipbtn" data-field="${k}" data-ask>${icon('plus')}<span>${FIELDS[k].chip}</span></button>`).join('')}</div></div>`, { cls: 'card--tight' });
}
