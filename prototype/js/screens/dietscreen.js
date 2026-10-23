// DIET (signed in): target calories, what they eat, treats, supplements, and a way to find food.
import { getPet } from '../store.js';
import { bindQuickWeight } from '../quickweight.js';
import { expNote, button } from '../ui.js';
import { dietHtml, loadDietView, mountDiet, openAddItem } from '../diet.js';
import { bindPetSwitcher } from '../components/petswitcher.js';
import { appHeader, safetyBanner } from '../components/appheader.js';
import { noPetView } from './dashboard.js';

export async function render() {
  const pet = getPet(); if (!pet) return noPetView();
  const s = await loadDietView(pet); const plan = s.plan;
  return {
    title: `${pet.name}: diet`,
    html: `<div class="page page--app page--stack">${appHeader(pet, s, { title: 'Diet', facts: false })}<div class="stack">${dietHtml(pet, s)}${button({ label: 'Next: find food that fits', href: '/foods', variant: 'secondary', iconName: 'arrow', block: true })}</div>${safetyBanner(pet, plan)}<div class="app-note">${expNote()}</div></div>`,
    mount(root, rerender) {
      bindQuickWeight(root, rerender); bindPetSwitcher(root, rerender); mountDiet(root, pet, rerender);
      if (new URLSearchParams(location.search).get('add') === '1') { history.replaceState(null, '', '/pet/diet'); openAddItem(pet, 'food', null, rerender); }
    },
  };
}
