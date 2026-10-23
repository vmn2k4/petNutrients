// HOME (signed in): log weight, watch growth, see the log. One next step, nothing else competing.
import { getPet, isSignedIn, updatePet } from '../store.js';
import { calcMany } from '../calc.js';
import { round } from '../format.js';
import { bindQuickWeight } from '../quickweight.js';
import { toast } from '../sheet.js';
import { button, emptyState, expNote, esc } from '../ui.js';
import { bindFields } from '../components/petfields.js';
import { bindPetSwitcher } from '../components/petswitcher.js';
import { growthCardHtml, growthMoreHtml, mountGrowthCard } from '../components/growthcard.js';
import { weightLogHtml } from '../components/weightlog.js';
import { nextStepHtml } from '../components/nextstep.js';
import { appHeader, safetyBanner, logWeightButton, dueBadge } from '../components/appheader.js';

export function noPetView() {
  return {
    title: 'Home',
    html: `<div class="page page--narrow">${emptyState({ img: 'cut-pair', title: 'Who are we feeding today?', text: 'Add your dog or cat to see their growth chart, daily calories and foods that fit.', action: button({ label: 'Start onboarding a pet', href: '/new', iconName: 'arrow' }) })}</div>`,
  };
}

export async function render() {
  const pet = getPet(); if (!isSignedIn() || !pet) return noPetView();
  const [s, v] = await calcMany([['petSummary', pet], ['growthPageView', pet]]); const plan = s.plan; const w = s.weigh;
  const weightBlock = `<div class="apphead__weight"><strong>${round(pet.weightKg, 1)} kg</strong>${dueBadge(w)}${logWeightButton('primary', w.dueInDays <= 0)}</div>`;
  return {
    title: `${pet.name}: home`,
    html: `<div class="page page--app">${appHeader(pet, s, { action: weightBlock })}
      <div class="app-grid"><div class="stack app-grid__main">${growthCardHtml(pet, v)}${growthMoreHtml(pet, v)}</div>
      <aside class="stack app-grid__side">${nextStepHtml(pet, s)}${weightLogHtml(pet, s)}</aside></div>
      ${safetyBanner(pet, plan)}<div class="app-note">${expNote()}</div></div>`,
    mount(root, rerender) {
      bindQuickWeight(root, rerender); bindFields(root, rerender); bindPetSwitcher(root, rerender);
      mountGrowthCard(root, pet, v, rerender);
      root.querySelector('[data-skip-weigh]')?.addEventListener('click', () => { updatePet({ skips: [...(pet.skips || []), new Date().toISOString().slice(0, 10)] }); toast('Skipped. Your streak is safe.'); rerender(); });
      if (new URLSearchParams(location.search).get('new') === '1') { history.replaceState(null, '', '/'); toast(`${pet.name}'s plan is ready`); }
    },
  };
}
