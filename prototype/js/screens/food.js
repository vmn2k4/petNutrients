import { getFood, listReviews, addReview, getSaved, toggleSaved, isSignedIn } from '../store.js';
import { estimateKcal, brandGuide, foodFit, NUTRIENTS, gramsPerDay, costPerDay, TOXIC_TERMS, allergenHits } from '../domain.js';
import { KCAL_NOTE, foodPic, card, badge, stars, meter, verdictBanner, button, icon, esc, notice, ratingInput, field, stat, pageBand, emptyState, expNote } from '../ui.js';
import { makeCtx } from './foods.js';
import { openAddItem } from '../diet.js';

const TITLES = { good: 'Meets the nutrient targets', caution: 'Worth a closer look', bad: 'Not the best match' };
let bowlView = true; // default: this pet's daily bowl; false = per 1000 kcal
const IMPROVED = ['Coat', 'Energy', 'Stool', 'Weight', 'Digestion', 'Allergy signs'];

const reviewItem = (r) => `<article class="card card--flat"><div class="row row--between">${stars(r.stars)}<span class="small muted">${esc(r.pet)} · fed ${esc(r.when)}</span></div>
  <p style="margin:var(--space-3) 0">${esc(r.text)}</p><div class="chips">${badge(r.liked, 'info')}${(r.improved || []).map((i) => badge(`Improved: ${i}`, 'good')).join('')}${badge(r.rebuy ? 'Would rebuy' : 'Would not rebuy', r.rebuy ? 'good' : 'caution')}${badge(r.subscribe ? 'Would subscribe' : 'No subscription', '')}</div>
  ${!r.subscribe && r.why ? `<p class="small muted" style="margin:var(--space-3) 0 0">Why not: ${esc(r.why)}</p>` : ''}</article>`;

export function render({ id }) {
  const food0 = getFood(id); const est = food0 && !(food0.kcalPerKg > 0) ? estimateKcal(food0) : null;
  // no calories from the maker: work them out from the label analysis and say so on the page
  const food = est ? { ...food0, kcalPerKg: est.kcalPerKg, kcalEstimated: true, estAssumed: est.assumed, estMargin: est.margin } : food0;
  if (!food) return { title: 'Not found', html: `${pageBand('Hmm, that food is missing', 'It may have been renamed or removed.')}<div class="page page--narrow">${emptyState({ img: 'cut-kitten', title: 'We sniffed everywhere, no luck', text: 'Try browsing the list instead.', action: button({ label: 'Back to foods', href: '/foods' }) })}</div>` };
  const { pet, plan, targets } = makeCtx();
  const fit = pet ? foodFit(food, pet, plan, targets) : null;
  const revs = listReviews(food.id);
  const g = plan && !plan.hideKcal && gramsPerDay(food, plan.kcal); const c = plan && !plan.hideKcal && costPerDay(food, plan.kcal);
  const showBowl = !!(g && pet && bowlView); const scale = showBowl ? plan.kcal / 1000 : 1;
  const flagged = (ing) => TOXIC_TERMS.some((t) => (!t.species || t.species === food.species) && ing.toLowerCase().includes(t.term)) || (!!pet && allergenHits({ ingredients: [ing] }, pet).length > 0);
  return {
    title: `${food.brand} ${food.name} Review: Calories, AAFCO & Cost per Day`,
    html: `${pageBand(food.name, `${esc(food.brand)}${food.reviews ? `, ${stars(food.rating)} ${food.rating} from ${food.reviews} owners` : ', no owner reviews yet'}`, `<div class="chips" style="margin-top:var(--space-4)">${badge(food.format, 'info')}${badge(food.species)}${badge(`Source: ${food.source}`, '')}</div>`, food.species === 'cat' ? 'cut-cat' : 'cut-beagle')}<div class="page">${expNote(' Food data can be wrong or out of date: check the label on the bag.')}<a class="btn btn--ghost" href="/foods" style="margin: 0 0 var(--space-5) calc(var(--space-4) * -1)">${icon('back')}<span>All foods</span></a>
      <div class="split split--sidebar">
        <div class="stack">
          ${fit ? verdictBanner(fit.verdict, `${TITLES[fit.verdict]} for ${esc(pet.name)}`, fit.warn.length ? fit.warn.map((w) => esc(w.text)).join('<br>') : 'It meets the protein, fat, calcium and phosphorus targets for their life stage. We do not check vitamins or whether the food is complete and balanced, so read the bag too.') : notice(isSignedIn() ? `<a href="/new">Create a pet profile</a> to see whether this food fits.` : `<button class="linkbtn" type="button" data-signup data-then="/new">Create a free account</button> to see whether this food fits your pet, or <a href="/foods">add your pet's details</a> on the foods page.`)}
          ${card(`<div class="row row--between"><h2 style="margin:0">What is in each bowl</h2>${g ? `<div class="chips" role="group" aria-label="Show nutrients">${button({ label: 'Daily bowl', variant: bowlView ? 'primary' : 'secondary', attrs: 'data-view="bowl" type="button"' })}${button({ label: 'Per 1,000 kcal', variant: bowlView ? 'secondary' : 'primary', attrs: 'data-view="kcal" type="button"' })}</div>` : ''}</div>
            <p class="hint">${showBowl ? `${esc(pet.name)}'s daily bowl: ${Math.round(g)} g a day (${Math.round(plan.kcal)} kcal). Wet and dry foods compare fairly because each bowl gives the same calories. Ticks mark the AAFCO minimum and maximum for their life stage.` : 'Shown per 1000 calories, so wet and dry foods compare fairly. Ticks mark the AAFCO minimum and maximum for their life stage.'}</p><div class="stack">${(fit ? fit.checks : NUTRIENTS.slice(0, 4).map((n) => ({ label: n.label, value: n.get(food), target: {}, state: '' }))).map((k) => meter({ label: k.label, value: k.value == null ? null : k.value * scale, unit: 'g', min: k.target?.min == null ? undefined : k.target.min * scale, max: k.target?.max == null ? undefined : k.target.max * scale, state: k.state === 'unknown' ? '' : k.state })).join('')}</div>
            <p class="hint">Labels list minimums and maximums, not exact amounts. Calcium and phosphorus help build bones, but many labels skip them, so you may see "not reported".</p>`)}
          ${card(`<h2>Ingredients</h2><div class="chips">${food.ingredients.length ? food.ingredients.map((i) => badge(i, flagged(i) ? 'bad' : '', flagged(i) ? 'alert' : '')).join('') : '<span class="muted">Not listed in our data. Check the bag.</span>'}</div><p class="hint" style="margin-top:var(--space-3)">Ingredient lists are copied from the maker's website or label and are not always complete or marked correctly. Allergy and safety flags only match the words listed here, and a vague term such as "natural flavor" can hide something. Always read the ingredient list on the bag before you feed it.</p>${food.partialIngredients ? '<p class="hint" style="margin-top:var(--space-3)">Only the main ingredients are listed here. Check the full list on the bag.</p>' : ''}${food.credit ? `<p class="hint" style="margin-top:var(--space-2)">Data: ${esc(food.credit)}.</p>` : ''}`)}
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
          <div class="fc__img fc__img--detail">${foodPic(food)}</div>
          ${card(`<h2>${pet ? `For ${esc(pet.name)}` : 'How much to feed'}</h2>${g ? `<div class="grid grid--2">${stat(`${Math.round(g)} g`, 'per day', `${Math.round(plan.kcal)} kcal`)}${stat(c ? `$${c.toFixed(2)}` : 'n/a', 'per day', 'sample price')}</div>` : '<p class="muted">Add a pet profile for amounts and cost.</p>'}
            ${food.kcalPerKg ? `<p class="small" style="margin:var(--space-3) 0 0"><strong>${Math.round(food.kcalPerKg / 10)} kcal per 100 g</strong>${g && plan ? `<span class="muted"> · ${esc(pet.name)} needs about ${Math.round(plan.kcal)} kcal a day, so about ${Math.round(g)} g of this food</span>` : ''}</p>` : ''}
            ${g ? `<p class="hint">${KCAL_NOTE}</p>` : ''}
            ${food.kcalEstimated ? `<p class="small" style="margin:var(--space-3) 0 0;color:var(--color-caution)">${icon('alert')} The maker does not state calories for this food, so ${Math.round(food.kcalPerKg / 10)} kcal per 100 g is our estimate from its protein, fat, moisture${food.estAssumed.length ? ` and typical ${food.estAssumed.join(' and ')}` : ''} (about ${food.estMargin}% either way). Check the bag.</p>` : ''}
            ${food.kcalPerKg ? '' : '<p class="small muted" style="margin:var(--space-3) 0 0">Calories are not reported for this food, so we cannot work out a daily amount.</p>'}
            <p class="hint">Energy: ${food.kcalPerKg ? `${food.kcalPerKg} kcal/kg` : 'not reported'}${food.kcalPerCup ? ` · ${food.kcalPerCup} kcal per cup` : ''}${food.kcalPerUnit ? ` · ${food.kcalPerUnit} kcal per ${esc(food.kcalUnit || 'unit')}` : ''} · Protein ${food.protein ?? 'not reported'}% · Fat ${food.fat ?? 'not reported'}% · Fibre ${food.fibre ?? 'not reported'}% · Moisture ${food.moisture ?? 'not reported'}%</p>
            ${(() => { const bg = pet ? brandGuide(food, pet.weightKg) : null; const rows = food.guide || [];
              if (!rows.length) return '<p class="small muted" style="margin:var(--space-3) 0 0">We have not found a feeding table from the maker for this food. Check the bag.</p>';
              const gtxt = (r) => (r.grams_per_day_min != null ? `${Math.round(r.grams_per_day_min)}${r.grams_per_day_max !== r.grams_per_day_min ? ` to ${Math.round(r.grams_per_day_max)}` : ''} g` : `${r.amount_min === r.amount_max ? r.amount_min : `${r.amount_min} to ${r.amount_max}`} ${esc(r.unit)}${r.amount_max > 1 && r.unit !== 'g' ? 's' : ''}`);
              return `<h3 style="margin:var(--space-3) 0 var(--space-1)">What the maker recommends</h3>${bg && !bg.covers ? `<p class="small muted" style="margin:0 0 var(--space-2)">${esc(pet.name)} weighs ${Math.round(pet.weightKg * 10) / 10} kg, ${bg.side === 'above' ? 'above' : 'below'} the maker's table, so we do not show an amount. Check the bag.</p>` : bg ? `<p class="small" style="margin:0 0 var(--space-2)">For ${esc(pet.name)} (${Math.round(pet.weightKg * 10) / 10} kg): <strong>${gtxt(bg.row)} a day</strong>${bg.exact ? '' : ' <span class="muted">(about the closest weight on their table)</span>'}${g && bg.grams ? `<span class="muted"> · our calorie-based amount is ${Math.round(g)} g</span>` : ''}</p>` : ''}
                <table class="small" style="width:100%"><thead><tr><th align="left">Weight</th><th align="left">Per day</th></tr></thead><tbody>${rows.map((r) => `<tr${bg && bg.covers && bg.row === r ? ' style="font-weight:600"' : ''}><td>${esc(r.weight_label)}</td><td>${gtxt(r)}</td></tr>`).join('')}</tbody></table>
                <p class="hint">From the maker's label${rows[0].source_url ? ` (<a href="${esc(rows[0].source_url)}" target="_blank" rel="noopener noreferrer">page</a>)` : ''}. A starting point: adjust by body condition and check with your vet.</p>`; })()}
            ${food.buyUrl ? button({ label: `${food.buyType === 'search' ? 'Search for it at' : 'Buy at'} ${food.buyRetailer || 'a retailer'}`, href: food.buyUrl, variant: 'primary', iconName: 'cart', block: true, attrs: 'target="_blank" rel="noopener noreferrer sponsored"' }) : ''}
            ${isSignedIn() && pet ? button({ label: 'Add to diet', variant: 'primary', iconName: 'plus', attrs: 'id="adddiet"', block: true }) : button({ label: 'Add to diet', variant: 'primary', iconName: 'plus', attrs: `data-signup data-then="/food/${food.id}"`, block: true })}
            ${button({ label: getSaved().includes(food.id) ? 'Saved' : 'Save food', variant: 'secondary', iconName: 'heart', attrs: 'id="save"', block: true })}`)}
          
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
      root.querySelector('#adddiet')?.addEventListener('click', () => { if (isSignedIn() && pet) openAddItem(pet, 'food', food, () => {}); });
      root.querySelector('#save')?.addEventListener('click', (e) => { if (!isSignedIn()) { e.currentTarget.setAttribute('data-signup', ''); return; } toggleSaved(food.id); rerender(); });
    },
  };
}
