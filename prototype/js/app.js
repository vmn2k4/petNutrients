// APP SHELL: History API path router + navigation. Screens live in js/screens and return { title, html, mount, description? }.
import { icon } from './ui.js';
import { getPet, getAccount, isSignedIn, signOut } from './store.js';
import { runCounters } from './motion.js';
import { initAccountUi } from './account.js';
import { applySeo, pathOf, SITE } from './seo.js';

// Logged-out visitors get the public tools (growth chart, foods, scan, guides). Signed-in owners get their app:
// Home, Diet, Scan (raised centre on phones), Find food, Profile. Guides and Tools stay public pages for search, linked from the footer.
const NAV_OUT = [
  { href: '/', label: 'Home', icon: 'home', match: /^\/$/ },
  { href: '/growth', label: 'Growth chart', icon: 'chart', match: /^\/growth/ },
  { href: '/foods', label: 'Find food', icon: 'bowl', match: /^\/foods/ },
  { href: '/guides', label: 'Guides', icon: 'book', match: /^\/(guides|tools|recipe|toxic|can-)/ },
];
const NAV_IN = [
  { href: '/', label: 'Home', icon: 'home', match: /^\/$/ },
  { href: '/pet/diet', label: 'Diet', icon: 'leaf', match: /^\/pet\/diet/ },
  { href: '/foods', label: 'Find food', icon: 'bowl', match: /^\/foods/ },
  { href: '/pet/profile', label: 'Profile', icon: 'paw', match: /^\/(pet\/profile|account)/ },
];

// Screens are loaded on demand so each page only downloads the code it needs.
const load = { home: () => import('./screens/home.js'), dashboard: () => import('./screens/dashboard.js'), dietScreen: () => import('./screens/dietscreen.js'), profile: () => import('./screens/profile.js'), wizard: () => import('./screens/wizard.js'), account: () => import('./screens/account.js'), growth: () => import('./screens/growth.js'), guides: () => import('./screens/guides.js'), foods: () => import('./screens/foods.js'), food: () => import('./screens/food.js'), scan: () => import('./screens/scan.js'), tools: () => import('./screens/tools.js'), toxicPage: () => import('./screens/toxic-page.js'), legal: () => import('./screens/legal.js') };
const ROUTES = [
  [/^\/$/, async () => (isSignedIn() ? (await load.dashboard()).render() : (await load.home()).render())],
  [/^\/new$/, async () => (await load.wizard()).render()],
  [/^\/account$/, async () => (await load.account()).render()],
  [/^\/pet\/diet$/, async () => (await load.dietScreen()).render()],
  [/^\/pet\/profile$/, async () => (await load.profile()).render()],
  [/^\/pet(\/growth)?$/, async () => (await load.dashboard()).render()],
  [/^\/growth$/, async () => (await load.growth()).render()],
  [/^\/guides$/, async () => (await load.guides()).list()],
  [/^\/guides\/([\w-]+)$/, async (m) => (await load.guides()).article({ slug: m[1] })],
  [/^\/foods$/, async () => (await load.foods()).render()],
  [/^\/food\/(\w+)$/, async (m) => (await load.food()).render({ id: m[1] })],
  [/^\/scan$/, async () => ({ title: 'Label scanner: coming soon', html: '<div class="page page--narrow"><h1>Label scanner is coming soon</h1><p class="muted">Until then, find foods and compare their numbers on the Find food page.</p><p><a class="btn btn--primary" href="/foods">Find food</a></p></div>' })],
  [/^\/tools$/, async () => (await load.tools()).hub()],
  [/^\/recipe$/, async () => (await load.tools()).recipe()],
  [/^\/toxic$/, async () => (await load.tools()).toxic()],
  [/^\/can-dogs-eat\/([\w-]+)$/, async (m) => (await load.toxicPage()).render({ species: 'dog', slug: m[1] })],
  [/^\/privacy$/, async () => (await load.legal()).privacy()],
  [/^\/terms$/, async () => (await load.legal()).terms()],
  [/^\/disclaimer$/, async () => (await load.legal()).disclaimer()],
  [/^\/can-cats-eat\/([\w-]+)$/, async (m) => (await load.toxicPage()).render({ species: 'cat', slug: m[1] })],
];

const app = document.getElementById('app');
const navHtml = (items, tab) => items.map((n) => `<a class="${tab ? `tab${n.primary ? ' tab--scan' : ''}` : 'navlink'}" href="${n.href}" title="${n.label}" data-match="${n.match.source}">${icon(n.icon)}<span>${n.label}</span></a>`).join('');
initAccountUi();
let navFor = null;
function syncNav() {
  const signedIn = isSignedIn(); if (navFor === signedIn) return; navFor = signedIn;
  const items = signedIn ? NAV_IN : NAV_OUT;
  document.getElementById('topnav').innerHTML = navHtml(items, false);
  document.getElementById('tabbar').innerHTML = navHtml(items, true);
  const g = document.querySelector('.drawer__group[aria-label="Menu"]');
  if (g) g.innerHTML = `<h2>Menu</h2>${items.map((n) => `<a class="drawer__link" href="${n.href}" data-match="${n.match.source}">${icon(n.icon)}<span>${n.label}</span></a>`).join('')}`;
}

// Small-screen menu (hamburger): every page, grouped, plus the legal links the bottom tab bar has no room for.
const DRAWER = [
  { title: 'Menu', items: [] },
  { title: 'Explore', items: [['/guides', 'Learn', 'book', '^\\/guides'], ['/growth', 'Puppy growth chart', 'chart', '^\\/growth'], ['/recipe', 'Homemade recipe checker', 'flask', '^\\/recipe'], ['/toxic', 'Can my pet eat this?', 'shield', '^\\/(toxic|can-)'], ['/tools', 'All tools', 'more', '^\\/tools$']] },
    { title: 'About', items: [['/disclaimer', 'Medical & data disclaimer', 'info', '^\\/disclaimer'], ['/privacy', 'Privacy policy', 'shield', '^\\/privacy'], ['/terms', 'Terms and conditions', 'article', '^\\/terms']] },
];
const drawer = document.getElementById('drawer'); const menuBtn = document.getElementById('menu-btn');
drawer.innerHTML = `<div class="drawer__backdrop" data-close></div><div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Site menu">
  <div class="drawer__head"><span class="brand"><i class="ph-fill ph-paw-print icon" aria-hidden="true"></i><span>Pet Nutrition Matcher</span></span><button class="drawer__close" type="button" data-close aria-label="Close menu"><i class="ph ph-x icon" aria-hidden="true"></i></button></div>
  <a class="btn btn--primary btn--block drawer__cta" href="/new">Find their food</a>
  <a class="btn btn--secondary btn--block drawer__login" href="/account" data-login>Log in</a><p class="small muted drawer__who" hidden></p>
  ${DRAWER.map((g) => `<nav class="drawer__group" aria-label="${g.title}"><h2>${g.title}</h2>${g.items.map(([href, label, ic, re]) => `<a class="drawer__link" href="${href}" data-match="${re}">${icon(ic)}<span>${label.replace('&', '&amp;')}</span></a>`).join('')}</nav>`).join('')}</div>`;
syncNav();
function setDrawer(open) {
  drawer.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('no-scroll', open);
  if (open) drawer.querySelector('.drawer__close').focus(); else menuBtn.focus({ preventScroll: true });
}
menuBtn.addEventListener('click', () => setDrawer(drawer.hidden));
drawer.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target.closest('a')) setDrawer(false); });
document.addEventListener('keydown', (e) => {
  if (drawer.hidden) return;
  if (e.key === 'Escape') { setDrawer(false); return; }
  if (e.key === 'Tab') { const f = [...drawer.querySelectorAll('a[href],button')]; const first = f[0]; const last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
});
window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches && !drawer.hidden) setDrawer(false); });

const footer = document.getElementById('footer');
footer.innerHTML = `<svg class="footer__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,50 C180,0 360,90 540,52 C720,14 900,0 1080,40 C1260,84 1380,60 1440,42 L1440,90 L0,90 Z"/></svg><div class="footer__links"><a href="/foods">Dog and cat food finder</a><a href="/guides">Nutrition guides</a><a href="/growth">Puppy growth chart</a><a href="/recipe">Homemade recipe checker</a><a href="/toxic">Can my pet eat this?</a></div><div class="footer__links footer__legal"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms and Conditions</a><a href="/disclaimer">Medical &amp; Data Disclaimer</a></div>
  <p style="margin:0 0 var(--space-2);max-width:60ch">Made with love for dogs, cats and the people who feed them. Free to use, for pet owners everywhere.</p>
  <p style="margin:0;max-width:60ch">General guidance, not veterinary advice. Always ask your vet about health concerns. Growth data: Salt et al. 2017 (CC BY 4.0). Toxicity data: ASPCA Animal Poison Control and BioVet (CC BY 4.0). Product data: Open Pet Food Facts (ODbL). Nutrient profiles: AAFCO. Breed conditions: canine diet datasets on figshare (CC BY 4.0). Breed exercise: Kaggle dog breeds dataset (CC0).</p>`;

const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
function observeReveals() { document.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('is-in'))); }

function syncCta() {
  syncNav();
  const out = !isSignedIn(); const pet = getPet();
  const a = document.querySelector('.topbar__cta'); if (!a) return;
  // Logged out: the main button signs up (a profile needs an account). Signed in: open the plan, or start one.
  const cta = out ? { text: 'Sign up free', href: '/new' } : { text: 'Add your pet', href: '/new' };
  a.textContent = cta.text; a.setAttribute('href', cta.href); a.style.display = pet ? 'none' : ''; // with a pet, the tabs are the way around
  if (out) { a.setAttribute('data-signup', ''); a.setAttribute('data-then', '/new'); } else { a.removeAttribute('data-signup'); a.removeAttribute('data-then'); }
  const d = document.querySelector('.drawer__cta');
  if (d) { d.textContent = cta.text; d.setAttribute('href', cta.href); if (out) { d.setAttribute('data-signup', ''); d.setAttribute('data-then', '/new'); } else { d.removeAttribute('data-signup'); d.removeAttribute('data-then'); } }
  // Log in for visitors; a link to the account page once signed in
  const acct = getAccount(); const lb = document.getElementById('login-btn'); const dl = document.querySelector('.drawer__login'); const who = document.querySelector('.drawer__who');
  if (lb) { lb.textContent = acct.saved ? 'Sign out' : 'Log in'; lb.setAttribute('href', acct.saved ? '#' : '/account'); if (acct.saved) { lb.removeAttribute('data-login'); lb.setAttribute('data-signout', ''); } else { lb.setAttribute('data-login', ''); lb.removeAttribute('data-signout'); } }
  if (dl) { dl.textContent = acct.saved ? 'Sign out' : 'Log in'; dl.setAttribute('href', acct.saved ? '#' : '/account'); if (acct.saved) { dl.removeAttribute('data-login'); dl.setAttribute('data-signout', ''); } else { dl.setAttribute('data-login', ''); dl.removeAttribute('data-signout'); } }
  if (who) { who.hidden = !acct.saved; who.textContent = acct.saved ? `Signed in as ${acct.email}` : ''; }
}

function setCurrent(path) {
  document.querySelectorAll('[data-match]').forEach((a) => {
    if (new RegExp(a.dataset.match).test(path)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

async function resolve(path) {
  try {
    for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) return await fn(m); }
  } catch (e) {
    console.error('Screen failed to load:', e);
    return { title: 'Something went wrong', html: '<div class="page page--narrow"><h1>Something went wrong</h1><p class="muted">This page did not load. Your data is safe.</p><p><button class="btn btn--primary" type="button" onclick="location.reload()">Try again</button> <a class="btn btn--ghost" href="/">Go home</a></p></div>' };
  }
  return { title: 'Page not found', html: '<div class="page"><h1>Page not found</h1><p class="muted">That page may have moved. Try the home page or search from Learn.</p><p><a class="btn btn--dark" href="/">Go home</a></p></div>', description: 'The page you asked for was not found on Pet Nutrition Matcher.' };
}

let showSeq = 0;
async function show(animate = false) {
  if (isSignedIn() && /^\/pet(\/growth)?$/.test(pathOf())) history.replaceState({}, '', '/' + location.search); // Home is the pet's dashboard
  const path = pathOf();
  const seq = ++showSeq;
  const view = await resolve(path);
  if (seq !== showSeq) return; // a newer navigation started while this screen was loading
  function rerender() { const y = window.scrollY; show(); window.scrollTo({ top: y }); }
  // First load of a prerendered page: the HTML is already on screen, so only attach behaviour.
  // Skipped when a pet is saved, because then the page shows personalised content.
  const hydrate = !animate && app.dataset.prerendered === path && !isSignedIn();
  delete app.dataset.prerendered;
  const paint = () => {
    if (!hydrate) app.innerHTML = view.html;
    // Explanatory copy and the experimental-estimate note go at the end of the page, so content starts at the top.
    app.querySelectorAll('.page .lede').forEach((n) => { const page = n.closest('.page'); n.style.marginTop = 'var(--space-5)'; page.append(n); });
    app.querySelectorAll('.page > .expnote').forEach((n) => { const page = n.parentElement; if (page.lastElementChild !== n) { n.style.marginTop = 'var(--space-5)'; page.append(n); } });
    const bt = document.getElementById('bar-title'); const h1 = app.querySelector('.pband h1'); bt.textContent = h1 ? h1.textContent : ''; document.body.classList.toggle('has-bar-title', !!h1);
    view.mount?.(app, rerender);
    observeReveals(); syncCta(); runCounters(app);
    if (!hydrate && (animate || !window.__keepScroll)) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (animate && document.startViewTransition && !reduce && !document.hidden) {
    const vt = document.startViewTransition(paint);
    vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone.catch(() => {});
  } else paint();
  applySeo(path, view);
  setCurrent(path);
}

function navigate(url, { replace = false, animate = true } = {}) {
  const u = new URL(url, location.origin);
  if (u.origin !== location.origin) { location.href = url; return; }
  const next = u.pathname + u.search;
  if (replace) history.replaceState({}, '', next); else history.pushState({}, '', next);
  document.body.classList.remove('filters-open');
  app.focus({ preventScroll: true });
  show(animate);
}

// Sign out from the top bar or the phone menu: end the session, then go to the public Home.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-signout]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); b.setAttribute('aria-disabled', 'true');
  await signOut(); location.assign('/');
}, true);

// Intercept same-origin left-clicks on <a href="/..."> so SPA navigation keeps working.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target && a.target !== '_self') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  let u; try { u = new URL(href, location.origin); } catch { return; }
  if (u.origin !== location.origin) return;
  e.preventDefault();
  navigate(u.pathname + u.search + u.hash);
});

window.addEventListener('popstate', () => { document.body.classList.remove('filters-open'); app.focus({ preventScroll: true }); show(true); });

// Migrate old hash bookmarks (#/foods) to real paths once.
if (location.hash && location.hash.startsWith('/')) {
  const p = location.hash.slice(1);
  history.replaceState({}, '', p || '/');
}

show();
export { navigate, SITE };
