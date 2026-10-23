// APP HEADER + SAFETY: the compact top of every signed-in screen (pet switcher, name, facts, action) and the vet banners.
// Replaces the big decorative band on these screens so content starts higher and the page stays calm.
import { petSwitcherHtml } from './petswitcher.js';
import { badge, button, verdictBanner, esc } from '../ui.js';
import { ageText } from '../format.js';

// `s` is the pet's summary from calc (petSummary).
export function appHeader(pet, s, { title = pet.name, facts = true, action = '' } = {}) {
  const f = facts ? `<p class="apphead__facts">${esc(pet.species === 'dog' ? pet.breed || 'Mixed breed' : 'Cat')} · ${esc(ageText(s.ageMonths))} · ${s.plan.stage === 'growth' ? 'Growing' : 'Adult'}</p>` : '';
  return `<header class="apphead">${petSwitcherHtml()}<div class="apphead__row"><div>${title === pet.name ? `<h1>${esc(title)}</h1>${f}` : `<h1 class="sr-only">${esc(title)}</h1>`}</div>${action}</div></header>`;
}

// Safety information is never hidden: shown on every signed-in screen when it applies.
export function safetyBanner(pet, plan) {
  if (plan.vetHold) return `<div class="apphead__alert">${verdictBanner('caution', `Confirm ${esc(pet.name)}'s calories with your vet`, `${esc(pet.name)} is still growing and is ${pet.bcs >= 7 ? 'carrying extra weight' : 'above the top of the growth chart'}. The calories and portions here are approximate. Please check them with your vet, and do not start a weight-loss diet for a growing pet without their advice.`)}</div>`;
  const vet = plan.needsVet || pet.health?.length || (pet.species === 'dog' && plan.stage === 'growth' && pet.bcs >= 6);
  return vet ? `<div class="apphead__alert">${verdictBanner('caution', 'Best to check in with your vet', 'Your answers suggest a vet should guide the diet (a medical condition, pregnancy or nursing, very thin, or weight loss in a growing pet). You can still browse, but treat the numbers as general guidance.')}</div>` : '';
}

export const logWeightButton = (variant = 'primary', due = false) => button({ label: 'Log weight', variant: `${variant} btn--small${due ? ' btn--cta' : ''}`, iconName: 'plus', attrs: 'data-quick-weight' });
export const dueBadge = (w) => (w.dueInDays <= 0 ? badge('Due', 'caution', 'alert') : '');
