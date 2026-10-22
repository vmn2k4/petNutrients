import { getFood, listReviews, addReview, getSaved, toggleSaved, isSignedIn } from '../store.js';
import { foodFit, NUTRIENTS, gramsPerDay, costPerDay, TOXIC_TERMS } from '../domain.js';
import { card, badge, stars, meter, verdictBanner, button, icon, esc, notice, ratingInput, field, stat, pageBand, emptyState, expNote } from '../ui.js';
import { makeCtx } from './foods.js';

const TITLES = { good: 'A great match', caution: 'Worth a closer look', bad: 'Not the best match' };
let bowlView = true; // default: this pet's daily bowl; false = per 1000 kcal
const IMPROVED = ['Coat', 'Energy', 'Stool', 'Weight', 'Digestion', 'Allergy signs'];

const reviewItem = (r) => `<article class="card card--flat"><div class="row row--between">${stars(r.stars)}<span class="small muted">${esc(r.pet)} · fed ${esc(r.when)}</span></div>
  <p style="margin:var(--space-3) 0">${esc(r.text)}</p><div class="chips">${badge(r.liked, 'info')}${(r.improved || []).map((i) => badge(`Improved: ${i}`, 'good')).join('')}${badge(r.rebuy ? 'Would rebuy' : 'Would not rebuy', r.rebuy ? 'good' : 'caution')}${badge(r.subscribe ? 'Would subscribe' : 'No subscription', '')}</div>
  ${!r.subscribe && r.why ? `<p class="small muted" style="margin:var(--space-3) 0 0">Why not: ${esc(r.why)}</p>` : ''}</article>`;

export function render({ id }) {
  const food = getFood(id);
  if (!food) return { title: 'Not found', html: `${pageBand('Hmm, that food is missing', 'It may have been renamed or removed.')}<div class="page page--narrow">${emptyState({ img: 'cut-kitten', title: 'We sniffed everywhere, no luck', text: 'Try browsing the list instead.', action: button({ label: 'Back to foods', href: '/foods' }) })}</div>` };
  const { pet, plan, targets } = makeCtx();
  const fit = pet ? foodFit(food, pet, plan, targets) : null;
  const revs = listReviews(food.id);
  const g = plan && !plan.hideKcal && gramsPerDay(food, plan.kcal); const c = plan && !plan.hideKcal && costPerDay(food, plan.kcal);
  const showBowl = !!(g && pet && bowlView); const scale = showBowl ? plan.kcal / 1000 : 1;
  const flagged = (ing) => TOXIC_TERMS.some((t) => ing.toLowerCase().includes(t.term)) || (pet?.allergies || []).some((a) => ing.toLowerCase().includes(a));
  return {
    title: `${food.brand} ${food.name} Review: Calories, AAFCO & Cost per Day`,
    html: `${pageBand(food.name, `${esc(food.brand)}${food.reviews ? `, ${stars(food.rating)} ${food.rating} from ${food.reviews} owners` : ', no owner reviews yet'}`, `<div class="chips" style="margin-top:var(--space-4)">${badge(food.format, 'info')}${badge(food.species)}${badge(`Source: ${food.source}`, '')}</div>`, food.species === 'cat' ? 'cut-cat' : 'cut-beagle')}<div class="page">${expNote()}<a class="btn btn--ghost" href="/foods" style="margin: 0 0 var(--space-5) calc(var(--space-4) * -1)">${icon('back')}<span>All foods</span></a>
      <div class="split split--sidebar">
        <div class="stack">
          ${fit ? verdictBanner(fit.verdict, `${TITLES[fit.verdict]} for ${esc(pet.name)}`, fit.warn.length ? fit.warn.map((w) => esc(w.text)).join('<br>') : 'It meets every nutrient target we can check for their life stage. Nice pick.') : notice(isSignedIn() ? `<a href="/new">Create a pet profile</a> to see whether this food fits.` : `<button class="linkbtn" type="button" data-signup data-then="/new">Create a free account</button> to see whether this food fits your pet, or <a href="/foods">add your pet's details</a> on the foods page.`)}
          ${card(`<div class="row row--between"><h2 style="margin:0">What is in each bowl</h2>${g ? `<div class="chips" role="group" aria-label="Show nutrients">${button({ label: 'Daily bowl', variant: bowlView ? 'primary' : 'secondary', attrs: 'data-view="bowl" type="button"' })}${button({ label: 'Per 1,000 kcal', variant: bowlView ? 'secondary' : 'primary', attrs: 'data-view="kcal" type="button"' })}</div>` : ''}</div>
            <p class="hint">${showBowl ? `${esc(pet.name)}'s daily bowl: ${Math.round(g)} g a day (${Math.round(plan.kcal)} kcal). Wet and dry foods compare fairly because each bowl gives the same calories. Ticks mark the AAFCO minimum and maximum for their life stage.` : 'Shown per 1000 calories, so wet and dry foods compare fairly. Ticks mark the AAFCO minimum and maximum for their life stage.'}</p><div class="stack">${(fit ? fit.checks : NUTRIENTS.slice(0, 4).map((n) => ({ label: n.label, value: n.get(food), target: {}, state: '' }))).map((k) => meter({ label: k.label, value: k.value == null ? null : k.value * scale, unit: 'g', min: k.target?.min == null ? undefined : k.target.min * scale, max: k.target?.max == null ? undefined : k.target.max * scale, state: k.state === 'unknown' ? '' : k.state })).join('')}</div>
            <p class="hint">Labels list minimums and maximums, not exact amounts. Calcium and phosphorus help build bones, but many labels skip them, so you may see "not reported".</p>`)}
          ${card(`<h2>Ingredients</h2><div class="chips">${food.ingredients.length ? food.ingredients.map((i) => badge(i, flagged(i) ? 'bad' : '', flagged(i) ? 'alert' : '')).join('') : '<span class="muted">Not listed in our data. Check the bag.</span>'}</div>${food.partialIngredients ? '<p class="hint" style="margin-top:var(--space-3)">Only the main ingredients are listed here. Check the full list on the bag.</p>' : ''}${food.credit ? `<p class="hint" style="margin-top:var(--space-2)">Data: ${esc(food.credit)}.</p>` : ''}`)}
          ${card(`<h2>What other owners say</h2><div class="grid grid--3" style="margin-bottom:var(--space-5)">${food.reviews ? `${stat(`${food.rebuy}%`, 'would buy again')}${stat(`${food.subscribe}%`, 'would subscribe')}${stat(food.reviews, 'reviews')}` : ''}</div>
            <p class="small muted">Owner ratings are shown on their own. They never change our nutrition or safety checks.</p><div class="stack">${revs.length ? revs.map(reviewItem).join('') : '<p class="muted">No reviews yet. Be the first to post one below.</p>'}</div>`)}
          ${isSignedIn() ? card(`<h2>Tried it? Help other owners</h2><form id="rv" class="stack">${ratingInput('stars')}
            <div class="field"><label for="liked">Did ${pet ? esc(pet.name) : 'your pet'} like it?</label><select class="select" id="liked" name="liked"><option>Loved it</option><option>Liked it</option><option>Picky at first</option><option>Did not like it</option></select></div>
            <fieldset class="field"><legend class="legend">What improved?</legend><div class="choices">${IMPROVED.map((i) => `<label class="choice"><input type="checkbox" name="improved" value="${i}"><span>${i}</span></label>`).join('')}</div></fieldset>
            <div class="grid grid--2"><fieldset class="field"><legend class="legend">Buy again?</legend><div class="choices"><label class="choice"><input type="radio" name="rebuy" value="yes" checked><span>Yes</span></label><label class="choice"><input type="radio" name="rebuy" value="no"><span>No</span></label></div></fieldset>
            <fieldset class="field"><legend class="legend">Subscribe?</legend><div class="choices"><label class="choice"><input type="radio" name="subscribe" value="yes"><span>Yes</span></label><label class="choice"><input type="radio" name="subscribe" value="no" checked><span>No</span></label></div></fieldset></div>
            <div class="field" id="why-wrap"><label for="why">Why not subscribe?</label><select class="select" id="why" name="why"><option value="">Choose a reason</option><option>Too expensive</option><option>Prefer to buy in store</option><option>Pet might not like it long-term</option><option>Want to try other foods</option><option>Delivery concerns</option></select></div>
            <div class="field"><label for="text">Anything you want other owners to know? (optional)</label><textarea class="textarea" id="text" name="text"></textarea></div>
            ${button({ label: 'Post review', type: 'submit', iconName: 'check' })}</form>`) : card(`<h2>Tried it? Help other owners</h2><p class="muted" style="margin:0 0 var(--space-4)">Reviews come from real owners, so you need a free account to write one.</p><div class="row">${button({ label: 'Create free account', variant: 'primary', attrs: 'data-signup' })}${button({ label: 'Log in', variant: 'secondary', attrs: 'data-login' })}</div>`)}
        </div>
        <aside class="stack">
          ${card(`<h2>${pet ? `For ${esc(pet.name)}` : 'How much to feed'}</h2>${g ? `<div class="grid grid--2">${stat(`${Math.round(g)} g`, 'per day', `${Math.round(plan.kcal)} kcal`)}${stat(c ? `$${c.toFixed(2)}` : 'n/a', 'per day', 'sample price')}</div>` : '<p class="muted">Add a pet profile for amounts and cost.</p>'}
            ${food.kcalPerKg ? `<p class="small" style="margin:var(--space-3) 0 0"><strong>${Math.round(food.kcalPerKg / 10)} kcal per 100 g</strong>${g && plan ? `<span class="muted"> · ${esc(pet.name)} needs about ${Math.round(plan.kcal)} kcal a day, so about ${Math.round(g)} g of this food</span>` : ''}</p>` : ''}
            <p class="hint">Energy: ${food.kcalPerKg} kcal/kg · Protein ${food.protein}% · Fat ${food.fat}% · Fibre ${food.fibre}% · Moisture ${food.moisture}%</p>
            ${button({ label: getSaved().includes(food.id) ? 'Saved' : 'Save food', variant: 'secondary', iconName: 'heart', attrs: 'id="save"', block: true })}`)}
          ${button({ label: 'Compare with a food you have', href: '/scan', variant: 'ghost', iconName: 'scan' })}
          ${notice('Nutrition numbers come from the maker\'s label for another country, so check them against your bag. Ingredient lists may be partial.', 'caution')}
        </aside>
      </div></div>`,
    mount(root, rerender) {
      const form = root.querySelector('#rv'); const why = root.querySelector('#why-wrap');   // the review form only exists for signed-in owners
      if (form) {
      const sync = () => { why.hidden = form.subscribe.value === 'yes'; }; sync();
      form.addEventListener('change', sync);
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const f = new FormData(form);
        addReview({ foodId: food.id, pet: pet ? `${pet.species === 'dog' ? 'Dog' : 'Cat'}, ${pet.name}` : 'Anonymous', stars: Number(f.get('stars')), liked: f.get('liked'), improved: f.getAll('improved'), rebuy: f.get('rebuy') === 'yes', subscribe: f.get('subscribe') === 'yes', why: f.get('why') || '', text: f.get('text') || 'No comment.', when: 'recently' });
        rerender();
      });
      }
      root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { bowlView = b.dataset.view === 'bowl'; rerender(); }));
      root.querySelector('#save')?.addEventListener('click', (e) => { if (!isSignedIn()) { e.currentTarget.setAttribute('data-signup', ''); return; } toggleSaved(food.id); rerender(); });
    },
  };
}
