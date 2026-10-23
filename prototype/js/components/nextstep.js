// NEXT STEP: one suggestion on Home, never a menu. The first item that applies wins.
import { card, button, esc } from '../ui.js';

export function nextStepHtml(pet, s) {
  const hasDiet = s.hasDiet;
  let t = null;
  if (!hasDiet && !pet.dietSkipped) t = { title: `Add what ${esc(pet.name)} eats`, text: '', btn: button({ label: 'Add their food', href: '/pet/diet?add=1', variant: 'secondary', iconName: 'plus' }) };
  else t = { title: 'Find a food that fits', text: '', btn: button({ label: 'Find food', href: '/foods', variant: 'secondary', iconName: 'arrow' }) };
  return card(`<div class="nextstep"><div><h2>${t.title}</h2>${t.text ? `<p class="muted">${t.text}</p>` : ''}</div>${t.btn}</div>`, { cls: 'card--tight' });
}
