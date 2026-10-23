// PET SWITCHER: one chip per pet plus "Add pet". Shown at the top of Home, Diet and Profile; picking a chip makes that pet the active one.
import { getPets, getPet, setActivePet } from '../store.js';
import { icon, esc } from '../ui.js';

export function petSwitcherHtml() {
  const pets = getPets(); const cur = getPet(); if (!pets.length) return '';
  return `<nav class="pswitch" aria-label="Your pets">${pets.map((p) => `<button class="pchip" type="button" data-pet="${p.id}" aria-pressed="${p === cur}">${icon('paw')}<span>${esc(p.name)}</span></button>`).join('')}<a class="pchip pchip--add" href="/new?add=1">${icon('plus')}<span>Add pet</span></a></nav>`;
}

export function bindPetSwitcher(root, rerender) {
  root.__petDone = rerender;
  if (root.__petBound) return; root.__petBound = true;
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-pet]'); if (b && b.getAttribute('aria-pressed') !== 'true') { setActivePet(b.dataset.pet); root.__petDone?.(); } });
}
