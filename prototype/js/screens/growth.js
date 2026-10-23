// PUBLIC GROWTH CHART: the free tool anyone can use without an account. Enter the basics, see the chart and percentile, pick a
// realistic target, then (optionally) see daily calories. Nothing is saved: details stay in this tab (quick details) and pre-fill
// onboarding if the visitor decides to sign up. The explainer text below is what search engines read.
import { disclosure, button, card, field, choiceGroup, selectField, comboField, mountCombos, sizeBlock, bindBreedSize, notice, icon, esc, expNote } from '../ui.js';
import { crumbsHtml, breadcrumbLd } from '../seo.js';
import { DOG_BREEDS } from '../reference.js';
import { SIZE_CATEGORIES, breedSize, lbToKg, round, weightCheck, energyPlan, kgToLb } from '../domain.js';
import { peekQuickPet as getQuickPet, setQuickPet, isSignedIn } from '../store.js';
import { growthCardHtml, mountGrowthCard } from '../components/growthcard.js';

const iso = (yearsAgo) => { const t = new Date(); t.setFullYear(t.getFullYear() - yearsAgo); return t.toISOString().slice(0, 10); };
let showKcal = false;

// A pet-shaped object from the quick details, with the defaults the rest of the app uses until more is known.
const toPet = (q) => ({ species: q.species, name: q.species === 'cat' ? 'Your cat' : 'Your dog', breed: q.breed || '', sizeCat: breedSize(q.breed)?.size || q.sizeCat || 'IV', birth: q.birth, sex: 'unknown', neutered: true, weightKg: q.weightKg, bcs: 5, activity: 'normal', allergies: q.allergies || [], health: [], logs: [{ on: new Date().toISOString().slice(0, 10), kg: q.weightKg, bcs: 5 }] });

function formHtml(q) {
  const sp = q?.species || 'dog';
  return card(`<form id="g-form" class="stack" novalidate>
    ${choiceGroup({ name: 'species', legend: 'Dog or cat?', value: sp, options: [{ value: 'dog', label: 'Dog', icon: 'paw' }, { value: 'cat', label: 'Cat', icon: 'paw' }] })}
    ${sp === 'dog' ? `${comboField({ id: 'breed', label: 'Breed', options: DOG_BREEDS.map((b) => b.name), value: q?.breed || '', placeholder: 'Start typing, like Labrador', hint: 'Mixed breed or not sure? Leave it blank.' })}${sizeBlock({ id: 'sizeCat', label: 'Expected adult size (if no breed)', value: q?.sizeCat || 'IV', options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })) })}` : ''}
    <div class="grid grid--2">${field({ id: 'birth', label: 'Date of birth (or estimate)', type: 'date', value: q?.birth || '', attrs: `min="${iso(30)}" max="${iso(0)}" required` })}
    <div class="input-row">${field({ id: 'weight', label: 'Weight', type: 'number', value: q ? String(round(q.weightKg, 1)) : '', attrs: 'step="0.1" min="0.1" inputmode="decimal" required' })}${selectField({ id: 'unit', label: 'Unit', value: 'kg', options: [{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }] })}</div></div>
    <div id="g-err" class="error-text" role="alert"></div>
    ${button({ label: q ? 'Update the chart' : 'Show the growth chart', variant: q ? 'secondary' : 'primary', type: 'submit', iconName: 'chart' })}</form>`);
}

function nudgesHtml(pet) {
  const plan = energyPlan(pet);
  const kcal = plan.hideKcal ? `<p class="muted" style="margin:0">Please ask your vet how much to feed.</p>`
    : showKcal ? `<div class="kcal-reveal"><strong class="kcal-hero">${Math.round(plan.kcal)}</strong> <span class="muted">kcal a day</span><p class="hint" style="margin:var(--space-2) 0 0">Approximate, from age and weight. Please confirm with your vet.</p></div>`
      : button({ label: 'Show daily calories', variant: 'secondary', iconName: 'arrow', attrs: 'data-kcal' });
  return `<div class="grid grid--2 nudges">
    ${card(`<h2>How much to feed?</h2>${kcal}`)}
    ${isSignedIn()
      ? card(`<h2>Track a pet of your own</h2><div class="row">${button({ label: 'Add a pet', variant: 'primary btn--cta', iconName: 'arrow', href: '/new?add=1' })}${button({ label: 'Find foods for this', variant: 'ghost', href: '/foods' })}</div>`)
      : card(`<h2>Keep track, free</h2><p class="muted">Save it, log weight, set targets. Free.</p><div class="row">${button({ label: 'Create free account', variant: 'primary btn--cta', iconName: 'arrow', attrs: 'data-signup data-then="/new"' })}${button({ label: 'Find foods for this', variant: 'ghost', href: '/foods' })}</div>`)}
  </div>`;
}

const ARTICLE = `<div class="stack-lg">
  <p class="lede">Wondering <strong>how big your puppy will get</strong>, or whether they are growing at a healthy pace? A <strong>puppy growth chart</strong> (and a matching <strong>kitten weight chart</strong>) plots weight against age using percentile bands from veterinary data. Most healthy pets sit between the 2nd and 98th percentile. What matters most is a steady track along one band, not a single weigh-in.</p>
  <p class="lede">Our free <strong>puppy weight calculator</strong> goes one step further: pick a time frame from 1 week to 3 months, set a target weight, and we suggest daily calories and whether that weekly pace is safe. For growing pets, the best goal is usually to keep following their own percentile line. We do not recommend weight-loss plans for puppies or kittens without your vet.</p>
  ${card(`<h2 style="margin-top:0">How it works</h2><ol class="help"><li>Enter age, weight and breed or size group.</li><li>See the percentile on a size-group growth curve.</li><li>Pick a goal date and target weight on the chart.</li><li>See kcal per day and a safe-pace check.</li></ol>
    <p class="muted small" style="margin:var(--space-4) 0 0">Dog curves use Salt et al. 2017 (PLoS ONE, CC BY 4.0, Banfield data), grouped by adult size. Kitten curves use a veterinary kitten-weight dataset. Breed results are estimates based on size group. General guidance, not veterinary advice.</p>`)}
  <div class="row">${button({ label: 'Read the full guide', href: '/guides/puppy-growth-chart', variant: 'ghost', iconName: 'book' })}</div>
</div>`;

export function render() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Growth chart', path: '/growth' }];
  const q = getQuickPet(); const pet = q ? toPet(q) : null;
  return {
    title: 'Puppy & Kitten Growth Chart + Adult Weight Calculator',
    description: "Track your puppy's or kitten's weight by week and see if they're on curve. Estimates adult size for purebred and mixed-breed puppies. Free.",
    html: `<div class="page page--app page--stack"><header class="apphead"><h1>Growth chart</h1></header>
      ${crumbsHtml(crumbs)}<script type="application/ld+json">${JSON.stringify(breadcrumbLd(crumbs))}</script>
      <div class="stack">${pet ? `${growthCardHtml(pet, { actions: false })}${disclosure('Change details', formHtml(q))}${nudgesHtml(pet)}` : formHtml(q)}
      </div>
      <div class="app-note">${expNote()}</div>
      <section class="article" aria-label="About the growth chart">${ARTICLE}</section></div>`,
    mount(root, rerender) {
      mountCombos(root);
      const form = root.querySelector('#g-form');
      const species = () => form.querySelector('[name=species]:checked')?.value || 'dog';
      if (species() === 'dog') bindBreedSize(root, { breedId: 'breed', sizeId: 'sizeCat', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
      // Switching dog/cat changes which fields apply, so the form is redrawn with what has been typed so far.
      form.querySelectorAll('[name=species]').forEach((r) => r.addEventListener('change', () => { const f = new FormData(form); setQuickPet({ ...(getQuickPet() || {}), species: f.get('species'), birth: f.get('birth') || '', weightKg: Number(f.get('weight')) || 0, breed: '' }); showKcal = false; rerender(); }));
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const f = new FormData(form); const err = root.querySelector('#g-err');
        const w = Number(f.get('weight')); const birth = f.get('birth'); const sp = f.get('species');
        if (!birth) { err.textContent = 'Add a date of birth. A rough estimate is fine.'; return; }
        if (birth > iso(0) || birth < iso(30)) { err.textContent = 'Please check the date of birth.'; return; }
        if (!(w > 0)) { err.textContent = 'Add their weight.'; return; }
        const kg = f.get('unit') === 'lb' ? lbToKg(w) : w; const breed = (f.get('breed') || '').toString().trim();
        if (sp === 'dog' && breed && !DOG_BREEDS.some((b) => b.name === breed)) { err.textContent = 'Pick a breed from the list, or leave it empty.'; return; }
        const q2 = { species: sp, breed: sp === 'dog' ? breed : '', sizeCat: f.get('sizeCat') || 'IV', birth, weightKg: round(kg, 2), allergies: getQuickPet()?.allergies || [] };
        const wc = weightCheck(toPet(q2), q2.weightKg); if (!wc.ok) { err.textContent = wc.message; return; }
        showKcal = false; setQuickPet(q2); rerender();
        setTimeout(() => document.querySelector('.gchart')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      });
      const qp = getQuickPet(); if (qp) mountGrowthCard(root, toPet(qp), rerender, { save: false });
      root.querySelector('[data-kcal]')?.addEventListener('click', () => { showKcal = true; rerender(); });
    },
  };
}
