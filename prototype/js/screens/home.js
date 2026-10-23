// HOME (signed out): what the site does in one screen, with the growth chart as the way in. Signed-in owners get dashboard.js instead.
import { button, icon, stars, esc } from '../ui.js';
import { listFoods, listRecentReviews, getRegion } from '../store.js';
import { NUTRIENTS } from '../domain.js';
import { GUIDES } from '../guides-data.js';
import { guideCard } from './guides.js';

// A food card for browsing without a pet profile (no fit verdict).
function foodCard(f, ctx, big = false) {
  const fit = ctx ? foodFit(f, ctx.pet, ctx.plan, ctx.targets).verdict : null;
  const cost = ctx ? costPerDay(f, ctx.plan.kcal) : null;
  const p = NUTRIENTS[0].get(f);
  return `<a class="pcard ${big ? 'pcard--big' : ''} reveal" href="/food/${f.id}"><div class="pcard__img"><img src="${f.img}" width="600" height="600" alt="" loading="lazy"></div><div class="pcard__body"><span class="small muted">${esc(f.brand)}, ${f.species}</span><h3>${esc(f.name)}</h3><div class="row" style="gap:var(--space-2)">${f.reviews ? `${stars(f.rating)}<span class="small muted">${f.rating}</span>` : '<span class="small muted">No reviews yet</span>'}</div>${big ? `<p class="small muted" style="margin:var(--space-2) 0 0">${p ? `${p.toFixed(0)} g protein per 1000 kcal` : ''}${cost ? `, about $${cost.toFixed(2)} a day for ${esc(ctx.pet.name)}` : ''}</p>` : ''}<div class="pcard__foot"><strong>${p ? `${p.toFixed(0)}<small> g protein / 1000 kcal</small>` : ''}</strong>${fit ? `<span class="badge badge--${fit}">${fit === 'good' ? 'Great fit' : fit === 'caution' ? 'Worth a look' : 'Not a fit'}</span>` : '<span class="btn btn--secondary btn--small">View</span>'}</div></div></a>`;
}

const tool = (href, ic, title, text) => `<a class="tool reveal" href="${href}">${icon(ic)}<h3>${title}</h3><p>${text}</p></a>`;

export function render() {
  const region = getRegion();
  const foods = listFoods().filter((f) => f.species === 'dog' && (region === 'all' || (f.markets || []).includes(region)));
  const explore = foods.slice(0, 3);
  const featured = foods.filter((f) => f.reviews > 0).sort((a, b) => b.reviews - a.reviews || b.rating - a.rating).slice(0, 3);
  const reviews = listRecentReviews(3);
  return {
    title: 'Free Dog & Cat Growth Chart, Calories and Food Finder',
    html: `<div class="wrap land">
      <section class="land-hero">
        <div class="reveal"><h1>Is your dog growing well?</h1>
          <p>See their growth chart in 30 seconds, find out how much to feed, and get foods that fit. Free for dogs and cats.</p>
          <div class="land-hero__cta">${button({ label: 'See their growth chart', href: '/growth', iconName: 'chart' })}${button({ label: 'Find food', href: '/foods', variant: 'secondary' })}</div></div>
        <div class="land-hero__art reveal" style="--d:120ms"><img src="/assets/cut-pair-480.webp" srcset="/assets/cut-pair-480.webp 480w, /assets/cut-pair.webp 836w" sizes="(max-width: 760px) 90vw, 420px" width="760" height="760" alt="A labrador puppy and a ginger kitten sitting together" fetchpriority="high"></div>
      </section>
      <section><h2>How it works</h2><ol class="steps">
        <li class="reveal"><h3>Chart their growth</h3><p>Enter age, weight and breed. We plot them on a veterinary growth curve.</p></li>
        <li class="reveal" style="--d:80ms"><h3>See what to feed</h3><p>Pick a realistic target and get daily calories to reach it.</p></li>
        <li class="reveal" style="--d:160ms"><h3>Find the food</h3><p>Foods matched to their size, age and calories, sold where you live.</p></li></ol></section>
      <section><h2>Free tools</h2><div class="tools3">
        ${tool('/growth', 'chart', 'Growth chart', 'Percentile, target weight and daily calories for puppies, kittens and adults.')}
        ${tool('/foods', 'bowl', 'Find food', 'Filter by nutrients on the label and see how each food fits your pet.')}</div></section>
      <section><h2>Keep track, free</h2><p style="max-width:40rem;color:var(--color-fg-muted)">A free account saves your pets, weight log and diet, so you can set targets and watch the chart fill in. Add more than one pet.</p>
        <div class="land-hero__cta">${button({ label: 'Create free account', iconName: 'arrow', attrs: 'data-signup data-then="/new"' })}${button({ label: 'Log in', variant: 'secondary', attrs: 'data-login' })}</div></section>
      ${featured.length ? `<section><h2>Popular with owners</h2><div class="grid grid--3">${featured.map((f) => foodCard(f, null)).join('')}</div></section>` : explore.length ? `<section><h2>Foods to explore</h2><div class="grid grid--3">${explore.map((f) => foodCard(f, null)).join('')}</div><p style="margin-top:var(--space-5)">${button({ label: 'Browse all foods', href: '/foods', variant: 'ghost', iconName: 'arrow' })}</p></section>` : ''}
      ${reviews.length ? `<section><h2>From owners like you</h2><div class="grid grid--3">${reviews.map((r) => `<figure class="quote">${stars(r.stars)}<blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.pet)}, fed ${esc(r.when)}</figcaption></figure>`).join('')}</div></section>` : ''}
      <section><h2>Little lessons, happier pets</h2><div class="grid grid--3">${GUIDES.slice(0, 3).map((g, i) => guideCard(g, i * 80)).join('')}</div>
        <p style="margin-top:var(--space-5)">${button({ label: 'All guides', href: '/guides', variant: 'ghost', iconName: 'arrow' })} ${button({ label: 'Tools', href: '/tools', variant: 'ghost', iconName: 'flask' })}</p></section>
    </div>`,
  };
}
