import { button, icon, stars, esc } from '../ui.js';
import { listFoods, getPet, getAccount, isSignedIn, listRecentReviews, getRegion } from '../store.js';
import { GUIDES } from '../guides-data.js';
import { guideCard } from './guides.js';
import { calc, calcMany } from '../calc.js';

const wave = (cls = '') => `<svg class="wave ${cls}" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,45 C180,95 360,0 540,38 C720,76 900,100 1080,52 C1260,6 1380,30 1440,48 L1440,90 L0,90 Z"/></svg>`;
const divider = (title) => `<div class="sec-head reveal"><h2>${title}</h2><div class="sec-head__rule" aria-hidden="true"><span></span>${icon('paw')}<span></span></div></div>`;
const doodle = (name, style) => `<span class="doodle" style="${style}" aria-hidden="true">${icon(name)}</span>`;

const blob = (cls, ico, a, b) => `<div class="blob blob--${cls} reveal"><svg class="blob__shape" viewBox="0 0 200 200" aria-hidden="true"><path d="M44,28 C84,-6 152,2 178,52 C204,100 186,158 138,182 C90,206 28,184 12,134 C-2,92 12,52 44,28 Z"/></svg><div class="blob__body">${icon(ico)}<span>${a}<br>${b}</span></div></div>`;

// `c` is calc's card for this food and pet (fit, cost a day, protein per 1000 kcal); `ctx` is the pet.
function foodCard(f, c, ctx, big = false) {
  const fit = c && c.fit ? c.fit.verdict : null;
  const cost = c && c.fit ? c.cost : null;
  const p = c ? c.protein : null;
  return `<a class="pcard ${big ? 'pcard--big' : ''} reveal" href="/food/${f.id}"><div class="pcard__img"><img src="${f.img}" width="600" height="600" alt="" loading="lazy"></div><div class="pcard__body"><span class="small muted">${esc(f.brand)}, ${f.species}</span><h3>${esc(f.name)}</h3><div class="row" style="gap:var(--space-2)">${f.reviews ? `${stars(f.rating)}<span class="small muted">${f.rating}</span>` : '<span class="small muted">No reviews yet</span>'}</div>${big ? `<p class="small muted" style="margin:var(--space-2) 0 0">${p ? `${p.toFixed(0)} g protein per 1000 kcal` : ''}${cost ? `, about $${cost.toFixed(2)} a day for ${esc(ctx.pet.name)}` : ''}</p>` : ''}<div class="pcard__foot"><strong>${p ? `${p.toFixed(0)}<small> g protein / 1000 kcal</small>` : ''}</strong>${fit ? `<span class="badge badge--${fit}">${fit === 'good' ? 'Great fit' : fit === 'caution' ? 'Worth a look' : 'Not a fit'}</span>` : '<span class="btn btn--primary btn--small">View</span>'}</div></div></a>`;
}

export async function render() {
  const pet = getPet();
  const ctx = pet ? { pet } : null;
  // Logged out: browse foods freely, an account is for building a profile. Signed in: open the plan, or start one.
  const out = !isSignedIn();
  const cta = out ? { label: 'Find their food', href: '/foods' } : pet ? { label: `Open ${pet.name}'s plan`, href: '/pet' } : { label: 'Create a profile', href: '/new' };
  const region = getRegion();
  const foods = listFoods().filter((f) => region === 'all' || (f.markets || []).includes(region)); // foods sold where the owner shops
  // Picks come from the catalogue, never from fixed ids (calc chooses them). With a pet: foods that fit them. Without: a few to explore.
  const byId = new Map(foods.map((f) => [f.id, f]));
  const week = (await calc('homePicks', pet || null, region, 2)).map((c) => ({ f: byId.get(c.id), c })).filter((x) => x.f);
  const reviews = listRecentReviews(3);
  const weekTitle = pet ? `Good fits for ${esc(pet.name)}` : 'Foods to explore';
  const featuredFoods = [...foods].filter((f) => f.reviews > 0).sort((a, b) => b.reviews - a.reviews || b.rating - a.rating).slice(0, 4); // only once owners have reviewed
  const featuredCards = featuredFoods.length ? await calc('foodCards', pet || null, featuredFoods.map((f) => f.id), region) : [];
  const featured = featuredFoods.map((f) => ({ f, c: featuredCards.find((c) => c.id === f.id) || null }));
  const cats = [
    ['Dogs', '/assets/cut-beagle-480.webp', 'yellow', '/foods?species=dog'],
    ['Cats', '/assets/cut-cat-480.webp', 'green', '/foods?species=cat'],
    ['Puppies', '/assets/cut-puppy-480.webp', 'orange', '/foods?species=dog&stage=growth'],
    ['Kittens', '/assets/cut-kitten-480.webp', 'soft', '/foods?species=cat&stage=growth'],
  ];
  return {
    title: 'Pet Diet Tracker: Dog & Cat Food Nutrition, Calories & Weight',
    description: 'Free pet diet tracker for dogs and cats: daily calorie and nutrient targets, food nutrition per 1000 kcal vs AAFCO, growth chart and weight tracking, cost per day.',
    html: `<div class="home">
      <section class="hero-y">
        ${doodle('bone', 'left:46%;top:12%;transform:rotate(35deg);font-size:4rem')}${doodle('paw', 'left:8%;top:9%;font-size:3rem')}${doodle('fish', 'left:40%;bottom:24%;transform:rotate(-20deg);font-size:3rem')}${doodle('bowl', 'right:3%;top:30%;transform:rotate(12deg);font-size:5rem')}
        <div class="wrap hero-y__grid">
          <div class="reveal">
            <h1>Pet diet and food nutrition tracker for your dog or cat.</h1>
            <p class="hero-y__sub">Get daily calories and nutrient targets, match foods to their age, size and needs, and track weight and growth. Free to use.</p>
            <div class="hero-actions"><div class="hero-actions__row">${button({ label: out ? 'See their growth chart' : cta.label, href: out ? '/growth' : cta.href, variant: 'dark', iconName: out ? 'chart' : 'arrow' })}${button({ label: 'Find food', href: '/foods', variant: 'white', iconName: 'bowl' })}</div>${getAccount().saved ? '' : `<div class="hero-actions__row">${button({ label: 'Log in', variant: 'outline', attrs: 'data-login' })}${button({ label: 'Sign up', variant: 'outline', attrs: 'data-signup data-then="/new"' })}</div>`}</div>
          </div>
          <div class="hero-y__art reveal" style="--d:120ms"><img src="/assets/cut-pair-480.webp" srcset="/assets/cut-pair-480.webp 480w, /assets/cut-pair.webp 836w" sizes="(max-width: 760px) 90vw, 760px" width="760" height="760" alt="A labrador puppy and a ginger kitten sitting together" fetchpriority="high"></div>
        </div>
        ${wave('wave--bottom')}
      </section>

      <section class="wrap blobs">
        ${blob('green', 'bowl', 'Foods that fit,', 'in seconds')}${blob('yellow', 'chart', 'See how they', 'are growing')}${blob('orange', 'shield', 'Checked against', 'AAFCO targets')}
      </section>

      ${week.length ? `<section class="wrap sec">
        ${divider(weekTitle)}
        <div class="grid grid--2">${week.map((w) => foodCard(w.f, w.c, ctx, true)).join('')}</div>
      </section>` : `<section class="wrap sec"><div class="center reveal">${button({ label: 'Browse all foods', href: '/foods', variant: 'dark', iconName: 'arrow' })}</div></section>`}

      <section class="wrap sec">
        ${divider('Who are we feeding?')}
        <div class="cats">${cats.map(([n, src, tone, href], i) => `<a class="cat reveal" style="--d:${i * 70}ms" href="${href}"><span class="cat__img cat__img--${tone}"><img src="${src}" width="400" height="400" alt="" loading="lazy"></span><span>${n}</span></a>`).join('')}</div>
      </section>

      <section class="band-g">
        ${wave('wave--top wave--on-green')}
        ${doodle('bone', 'left:5%;top:22%;transform:rotate(-30deg);font-size:5rem')}${doodle('fish', 'right:8%;top:20%;transform:rotate(15deg);font-size:4rem')}${doodle('bowl', 'left:14%;bottom:20%;font-size:3.5rem')}${doodle('heart', 'right:16%;bottom:24%;font-size:3rem')}${doodle('paw', 'left:48%;top:16%;font-size:2.5rem')}
        <div class="wrap band-g__body reveal"><h2>Will they love it? Is it good for them?</h2><p>See how a food fits your pet, with the numbers checked, before you buy.</p>${button({ label: 'Find food', href: '/foods', iconName: 'bowl' })}</div>
        ${wave('wave--bottom wave--bg')}
      </section>

      ${featured.length ? `<section class="wrap sec">
        ${divider('Popular with owners')}
        <div class="grid grid--auto grid--4">${featured.map((w) => foodCard(w.f, w.c, ctx)).join('')}</div>
        <div class="center reveal" style="margin-top:var(--space-6)">${button({ label: 'Browse all foods', href: '/foods', variant: 'dark', iconName: 'arrow' })}</div>
      </section>` : ''}

      <section class="wrap promos">
        <article class="promo promo--yellow reveal"><div><h3>How big will they get?</h3><p>See your puppy or kitten on a growth chart, pick a goal, and get daily calories to reach it.</p>${out ? button({ label: 'Create a free account', variant: 'dark', attrs: 'data-signup data-then="/new"' }) : button({ label: cta.label, href: cta.href, variant: 'dark' })}</div><img src="/assets/cut-pair-480.webp" width="600" height="600" alt="" loading="lazy"></article>
        <article class="promo promo--green reveal" style="--d:100ms"><div><h3>Cooking for them?</h3><p>Add your ingredients and we will show what the bowl is missing.</p>${button({ label: 'Check a recipe', href: '/recipe', variant: 'white' })}</div><img src="/assets/cut-cat-480.webp" width="600" height="600" alt="" loading="lazy"></article>
      </section>

      <section class="wrap sec">
        ${divider('Little lessons, happier pets')}
        <div class="grid grid--3">${GUIDES.slice(0, 3).map((g, i) => guideCard(g, i * 80)).join('')}</div>
        <div class="center reveal" style="margin-top:var(--space-6)">${button({ label: 'Read all guides', href: '/guides', variant: 'dark', iconName: 'arrow' })}</div>
      </section>

      ${reviews.length ? `<section class="wrap sec">
        ${divider('From owners like you')}
        <div class="grid grid--3">${reviews.map((r, i) => `<figure class="quote reveal" style="--d:${i * 80}ms">${stars(r.stars)}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.pet)}, fed ${esc(r.when)}</figcaption></figure>`).join('')}</div>
      </section>` : ''}
    </div>`,
  };
}
