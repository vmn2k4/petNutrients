// SIGN UP / LOG IN: email + password. Sign up creates the account, log in returns to it.
// Any element with data-signup or data-login opens the sheet (data-then="/path" says where to go afterwards).
// initAccountUi() wires that once for the whole app.
import { openSheet, toast } from './sheet.js';
import { signUpWithPassword, logInWithPassword, requestPasswordReset, setNewPassword, takeRecovery, takeAuthNotice } from './store.js';
import { esc, button, icon, card, pageBand } from './ui.js';

let open = false; // a flag rather than a DOM check: quick double taps arrive before the first sheet is in the page
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PENDING_REMINDERS = 'pnm.pendingReminders';

// What an account gives, in the owner's words. Shown on sign up and on the profile gate.
export const BENEFITS = [
  ['Daily calories and portions', 'worked out for your pet, not an average pet'],
  ['A growth chart that follows them', 'weigh-ins build their percentile line over time'],
  ['Every food checked against their needs', 'we flag allergens and what does not fit'],
  ['Saved for good', 'foods, weigh-ins and reviews open on any phone or computer'],
];
export const benefitsList = () => `<ul class="benefits">${BENEFITS.map(([t, d]) => `<li>${icon('check')}<span><strong>${esc(t)}</strong><small class="muted"> ${esc(d)}</small></span></li>`).join('')}</ul>`;

// The page shown instead of the pet wizard to anyone who is not signed in. It sells the account, and keeps the free paths open.
export function profileGate() {
  return {
    title: 'Create your free account',
    description: 'Create a free account to build a profile for your dog or cat and get a personal plan.',
    html: `${pageBand("Build your pet's plan")}<div class="page page--narrow">${card(`<h2>Create a free account to start</h2>
      <p class="muted" style="margin:var(--space-2) 0 var(--space-4)">Your profile lives in your account, so it is safe and ready on any device.</p>${benefitsList()}
      <div class="row" style="margin-top:var(--space-5)">${button({ label: 'Create free account', variant: 'primary', iconName: 'arrow', attrs: 'data-signup data-then="/new"' })}${button({ label: 'Log in', variant: 'secondary', attrs: 'data-login data-then="/pet"' })}</div>
      <p class="hint" style="margin:var(--space-4) 0 0">Not ready? You can <a href="/foods">browse foods</a>, <a href="/scan">scan a label</a> and <a href="/guides">read the guides</a> without an account.</p>`)}</div>`,
    mount() {},
  };
}

export function openAuthSheet(mode = 'signup', { then = null } = {}) {
  if (open) return;
  open = true;
  let email = ''; let reminders = false;
  const titleFor = (m) => ({ signup: 'Create your free account', forgot: 'Reset your password', reset: 'Choose a new password' }[m] || 'Log in');

  openSheet({
    title: titleFor(mode),
    body: '<div id="auth"></div>',
    onClose: () => { open = false; },
    onMount: (body, close) => {
      const root = body.querySelector('#auth');
      const say = (msg, kind = '') => { const el = root.querySelector('#auth-msg'); if (el) { el.className = kind === 'info' ? 'hint' : 'error-text'; el.innerHTML = msg; } };
      const switchTo = (m) => { mode = m; const h = document.getElementById('sheet-title'); if (h) h.textContent = titleFor(m); draw(); };

      function drawForgot() {
        root.innerHTML = `<form id="f-forgot" class="stack" novalidate>
          <p class="muted" style="margin:0">Enter your email and we will send a link to choose a new password.</p>
          <div class="field"><label for="a-email">Email</label><input class="input" id="a-email" type="email" inputmode="email" autocomplete="email" required value="${esc(email)}" placeholder="you@example.com"></div>
          <div id="auth-msg" role="alert" aria-live="polite"></div>
          <div class="row row--between">${button({ label: 'Back to log in', variant: 'ghost', attrs: 'data-switch="login" type="button"' })}${button({ label: 'Send link', type: 'submit', iconName: 'arrow' })}</div>
        </form>`;
        const f = root.querySelector('#f-forgot'); const input = root.querySelector('#a-email');
        root.querySelector('[data-switch]').addEventListener('click', () => { email = input.value.trim(); switchTo('login'); });
        f.addEventListener('submit', async (e) => {
          e.preventDefault(); email = input.value.trim();
          if (!EMAIL.test(email)) { say('That does not look like an email address.'); input.focus(); return; }
          const submit = f.querySelector('[type=submit]'); submit.disabled = true; say('Sending…', 'info');
          const r = await requestPasswordReset(email); submit.disabled = false;
          say(r.ok ? 'If that email has an account, a reset link is on its way. It can take a minute, so check spam too.' : esc(r.message), r.ok ? 'info' : '');
        });
        input.focus();
      }
      function drawReset() {
        root.innerHTML = `<form id="f-reset" class="stack" novalidate>
          <p class="muted" style="margin:0">Choose a new password for your account.</p>
          <div class="field"><label for="a-pass">New password</label><input class="input" id="a-pass" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"></div>
          <div id="auth-msg" role="alert" aria-live="polite"></div>
          <div class="row row--between">${button({ label: 'Not now', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save password', type: 'submit', iconName: 'check' })}</div>
        </form>`;
        const f = root.querySelector('#f-reset'); const pass = root.querySelector('#a-pass');
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (pass.value.length < 8) { say('Choose a password with at least 8 characters.'); pass.focus(); return; }
          const submit = f.querySelector('[type=submit]'); submit.disabled = true; say('Saving…', 'info');
          const r = await setNewPassword(pass.value); submit.disabled = false;
          if (!r.ok) { say(esc(r.message)); return; }
          close(); toast('Password updated. You are logged in.');
        });
        pass.focus();
      }
      function draw() {
        if (mode === 'forgot') return drawForgot();
        if (mode === 'reset') return drawReset();
        const signup = mode === 'signup';
        root.innerHTML = `<form id="f-email" class="stack" novalidate>
          ${signup ? `${benefitsList()}<p class="hint" style="margin:0">Free. Takes about a minute.</p>` : '<p class="muted" style="margin:0">Log in with your email and password.</p>'}
          <div class="field"><label for="a-email">Email</label><input class="input" id="a-email" name="email" type="email" inputmode="email" autocomplete="${signup ? 'email' : 'username'}" required value="${esc(email)}" placeholder="you@example.com"></div>
          <div class="field"><label for="a-pass">Password</label><input class="input" id="a-pass" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required placeholder="${signup ? 'At least 8 characters' : 'Your password'}"></div>
          ${signup ? `<label class="switch"><input type="checkbox" id="a-rem" ${reminders ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Email me when a weigh-in is due, at most once a week (optional)</span></label>` : ''}
          ${signup ? '' : '<p class="small" style="margin:0"><button class="linkbtn" type="button" data-switch="forgot">Forgot your password?</button></p>'}
          <div id="auth-msg" role="alert" aria-live="polite"></div>
          <div class="row row--between">${button({ label: 'Not now', variant: 'ghost', attrs: 'data-close' })}${button({ label: signup ? 'Create account' : 'Log in', type: 'submit', iconName: 'arrow' })}</div>
          <p class="hint" style="margin:0">We only use your email to sign you in${signup ? ' and, if you choose, send reminders' : ''}. <a href="/privacy">Privacy</a></p>
          <p class="small" style="margin:0">${signup ? 'Already have an account? <button class="linkbtn" type="button" data-switch="login">Log in</button>' : 'New here? <button class="linkbtn" type="button" data-switch="signup">Create a free account</button>'}</p>
        </form>`;
        const f = root.querySelector('#f-email'); const input = root.querySelector('#a-email'); const pass = root.querySelector('#a-pass');
        root.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => { email = input.value.trim(); switchTo(b.dataset.switch); }));
        f.addEventListener('submit', async (e) => {
          e.preventDefault(); email = input.value.trim(); reminders = !!root.querySelector('#a-rem')?.checked;
          if (!EMAIL.test(email)) { say('That does not look like an email address.'); input.focus(); return; }
          if (signup && pass.value.length < 8) { say('Choose a password with at least 8 characters.'); pass.focus(); return; }
          if (!pass.value) { say('Enter your password.'); pass.focus(); return; }
          const submit = f.querySelector('[type=submit]'); submit.disabled = true; say(signup ? 'Creating…' : 'Logging in…', 'info');
          const r = await (signup ? signUpWithPassword : logInWithPassword)(email, pass.value);
          submit.disabled = false;
          if (!r.ok) { say(esc(r.message), r.kind === 'confirm' ? 'info' : ''); return; }
          try { if (reminders) sessionStorage.setItem(PENDING_REMINDERS, '1'); } catch { /* ignore */ }
          close(); toast(signup ? 'Welcome! Your account is ready.' : 'Welcome back.');
          setTimeout(() => location.assign(then || (signup ? '/new' : '/pet')), 250);
        });
        input.focus();
      }
      draw();
    },
  });
}

// One document-level listener for the whole app.
export function initAccountUi() {
  if (initAccountUi.done) return; initAccountUi.done = true;
  if (takeRecovery()) setTimeout(() => openAuthSheet('reset'), 300);
  const note = takeAuthNotice(); if (note) setTimeout(() => toast(note), 600);
  // The email link was opened in another tab: this tab notices the new session and refreshes.
  window.addEventListener('storage', (e) => { if (e.key === 'pnm.auth' && e.newValue && open) { sessionStorage.setItem('pnm.notice', 'You are signed in.'); location.reload(); } });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-signup], [data-login]'); if (!t) return;
    e.preventDefault();
    openAuthSheet(t.hasAttribute('data-signup') ? 'signup' : 'login', { then: t.dataset.then || null });
  });
}
