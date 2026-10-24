// ACCOUNT: who you are (guest or saved), log out, reminders, units, and delete my data. Everything is optional.
import { getAccount, getPet, getProfile, signOut, deleteMyData, setEmailReminders, isSignedIn } from '../store.js';
import { card, button, badge, pageBand, esc } from '../ui.js';
import { openSheet, toast } from '../sheet.js';
import { benefitsList } from '../account.js';

const readUnit = () => { try { return localStorage.getItem('pnm.unit') === 'lb' ? 'lb' : 'kg'; } catch { return 'kg'; } };

export function render() {
  if (!isSignedIn()) {
    return {
      title: 'Your account', description: 'Create a free account or log in to Pet Diet & Weight Tracker.',
      html: `${pageBand('Your account')}<div class="page page--narrow">${card(`<h2>Create a free account</h2><p class="muted" style="margin:var(--space-2) 0 var(--space-4)">Build a profile for your pet and keep it safe on every device.</p>${benefitsList()}
        <div class="row" style="margin-top:var(--space-5)">${button({ label: 'Create free account', variant: 'primary', iconName: 'arrow', attrs: 'data-signup data-then="/new"' })}${button({ label: 'Log in', variant: 'secondary', attrs: 'data-login data-then="/pet"' })}</div>`)}</div>`,
      mount() {},
    };
  }
  const acct = getAccount(); const pet = getPet(); const prof = getProfile();
  const who = acct.saved
    ? card(`<div class="row row--between"><h2 style="margin:0">Signed in</h2>${badge('Saved', 'good', 'check')}</div>
        <p style="margin:var(--space-3) 0 var(--space-4)">Signed in as <strong>${esc(acct.email)}</strong>. Your pets and weigh-ins open on any device you log in on.</p>
        ${button({ label: 'Log out', variant: 'secondary', attrs: 'id="logout"' })}`)
    : card(`<div class="row row--between"><h2 style="margin:0">Guest account</h2>${badge('Not saved yet', 'caution', 'alert')}</div>
        <p style="margin:var(--space-3) 0 var(--space-4)">${pet ? `${esc(pet.name)}'s plan is only on this device right now. ` : ''}Create a free account to keep it safe and open it anywhere.</p>
        <div class="row">${button({ label: pet ? `Save ${pet.name}'s plan` : 'Save my plan', variant: 'primary', iconName: 'check', attrs: 'data-signup' })}${button({ label: 'Log in', variant: 'secondary', attrs: 'data-login' })}</div>`);

  const reminders = card(`<h2>Reminders</h2>
    ${acct.saved
      ? `<label class="switch"><input type="checkbox" id="rem" ${prof?.email_reminders ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Email me when a weigh-in is due, at most once a week</span></label>
         <p class="hint" style="margin:var(--space-2) 0 0">You can turn this off any time. Skipping a weigh-in never breaks your streak.</p>`
      : '<p class="muted" style="margin:0">Save your plan first, then you can choose to get a weekly weigh-in reminder by email.</p>'}`);

  const units = card(`<h2>Units</h2><div class="choices" role="group" aria-label="Weight unit">
    <label class="choice"><input type="radio" name="unit" value="kg" ${readUnit() === 'kg' ? 'checked' : ''}><span>kg</span></label>
    <label class="choice"><input type="radio" name="unit" value="lb" ${readUnit() === 'lb' ? 'checked' : ''}><span>lb</span></label></div>
    <p class="hint" style="margin:var(--space-2) 0 0">Used when you log a weight.</p>`);

  const data = card(`<h2>Your data</h2><p class="muted" style="margin:0 0 var(--space-4)">You can delete your pets, weigh-ins, saved foods, reviews and account whenever you like. This cannot be undone.</p>
    <div class="row">${button({ label: 'Delete my data', variant: 'secondary', iconName: 'trash', attrs: 'id="del"' })}<a class="btn btn--ghost" href="/privacy"><span>Privacy policy</span></a></div>`);

  return {
    title: 'Your account',
    description: 'Save your plan, log in and manage your Pet Diet & Weight Tracker account.',
    html: `${pageBand('Your account')}<div class="page page--narrow"><div class="stack">${who}${reminders}${units}${data}</div></div>`,
    mount(root, rerender) {
      root.querySelector('#logout')?.addEventListener('click', async (e) => { e.currentTarget.disabled = true; await signOut(); toast('Logged out.'); location.assign('/'); });
      root.querySelector('#rem')?.addEventListener('change', (e) => { setEmailReminders(e.target.checked); toast(e.target.checked ? 'Weekly reminders are on.' : 'Reminders are off.'); });
      root.querySelectorAll('[name=unit]').forEach((r) => r.addEventListener('change', () => { try { localStorage.setItem('pnm.unit', r.value); } catch { /* storage blocked */ } toast(`Weights shown in ${r.value}.`); }));
      root.querySelector('#del')?.addEventListener('click', () => {
        openSheet({
          title: 'Delete everything?',
          body: `<div class="stack"><p style="margin:0">This permanently deletes ${pet ? esc(pet.name) + "'s" : 'your'} profile, weigh-ins, saved foods and reviews${acct.saved ? ', and your account' : ''}. You cannot get them back.</p>
            <div id="del-msg" class="error-text" role="alert"></div>
            <div class="row row--between">${button({ label: 'Keep my data', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Yes, delete it', variant: 'primary', iconName: 'trash', attrs: 'id="del-yes"' })}</div></div>`,
          onMount: (body, close) => {
            body.querySelector('#del-yes').addEventListener('click', async (e) => {
              e.currentTarget.disabled = true; const r = await deleteMyData();
              if (!r.ok) { body.querySelector('#del-msg').textContent = r.message; e.currentTarget.disabled = false; return; }
              close(); toast('Your data was deleted.'); setTimeout(() => location.assign('/'), 300);
            });
          },
        });
      });
    },
  };
}
