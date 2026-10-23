// PROFILE (signed in): the pet's details as a tappable list, the region, reminders, and the account. Each row opens one sheet.
import { getPet, getPets, getAccount, getProfile, removePet, setEmailReminders, signOut } from '../store.js';
import { calc } from '../calc.js';
import { bindQuickWeight } from '../quickweight.js';
import { toast } from '../sheet.js';
import { card, button, icon, esc, expNote } from '../ui.js';
import { bindFields, fieldRowsHtml, regionRowHtml } from '../components/petfields.js';
import { bindPetSwitcher } from '../components/petswitcher.js';
import { appHeader } from '../components/appheader.js';
import { planAccuracyHtml } from '../components/planaccuracy.js';
import { breedCardHtml } from '../components/breedcard.js';
import { noPetView } from './dashboard.js';

export async function render() {
  const pet = getPet();
  const acct = getAccount(); const prof = getProfile();
  const account = card(`<h2>Account</h2><p class="muted small" style="margin:0 0 var(--space-4)">${esc(acct.email || '')}</p>
    ${regionRowHtml()}
    <label class="switch" style="margin-top:var(--space-4)"><input type="checkbox" id="rem" ${prof?.email_reminders ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Email me when a weigh-in is due, at most once a week</span></label>
    <div class="row" style="margin-top:var(--space-5)">${button({ label: 'Sign out', variant: 'secondary', iconName: 'back', attrs: 'id="logout"' })}<a class="btn btn--ghost" href="/account"><span>Units and my data</span></a></div>`);
  const wire = (root, rerender) => {
    bindFields(root, rerender);
    root.querySelector('#rem')?.addEventListener('change', (e) => { setEmailReminders(e.target.checked); toast(e.target.checked ? 'Weekly reminders are on.' : 'Reminders are off.'); });
    root.querySelector('#logout')?.addEventListener('click', async (e) => { e.currentTarget.disabled = true; await signOut(); location.assign('/'); });
  };
  if (!pet) return { title: 'Profile', html: `<div class="page page--app page--stack"><header class="apphead"><div class="apphead__row"><div><h1>Profile</h1></div></div></header><div class="stack">${card('<h2>No pet yet</h2><a class="btn btn--primary" href="/new">Start onboarding a pet</a>')}${account}</div></div>`, mount: wire };
  const s = await calc('petSummary', pet); const plan = s.plan;
  return {
    title: `${pet.name}: profile`,
    html: `<div class="page page--app page--stack">${appHeader(pet, s, { title: 'Profile', facts: false })}
      <div class="stack">${planAccuracyHtml(pet, s)}<div><h2 class="plist__title">${esc(pet.name)}</h2>${fieldRowsHtml(pet, s)}</div>
      ${breedCardHtml(pet, plan)}
      ${account}
      <button class="btn btn--ghost" id="reset" type="button">${icon('trash')}<span>Remove ${esc(pet.name)}${getPets().length > 1 ? '' : ' and start over'}</span></button></div>
      <div class="app-note">${expNote()}</div></div>`,
    mount(root, rerender) {
      bindQuickWeight(root, rerender); bindPetSwitcher(root, rerender); wire(root, rerender);
      root.querySelector('#reset')?.addEventListener('click', () => { if (confirm(`Remove ${pet.name}? Their weights and diet are deleted.`)) { removePet(); location.assign(getPets().length ? '/' : '/new'); } });
    },
  };
}
