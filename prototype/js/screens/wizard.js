import { stepper, choiceGroup, field, selectField, comboField, mountCombos, sizeBlock, bindBreedSize, button, notice, icon, esc, pageBand } from '../ui.js';
import { DOG_BREEDS } from '../reference.js';
import { SIZE_CATEGORIES, breedSize } from '../reference.js';
import { lbToKg, round } from '../format.js';
import { calc } from '../calc.js';
import { savePet, getPet, updatePet, isSignedIn, peekQuickPet, setQuickPet, hasRegion, getRegion, setRegion, REGIONS, getPets } from '../store.js';
import { FIELDS } from '../components/petfields.js';
import { profileGate } from '../account.js';

// Onboarding: who, age and breed, weight, then an optional step (neutering, activity, allergies; skip keeps sensible defaults),
// then the diet, which can also be skipped. The optional questions come from components/petfields.js, so they are asked the same way on Profile.
const STEPS = 4; const OPTIONAL = ['neutered', 'activity', 'allergies'];
let step = 0;
let d = null; // draft answers
let saved = null; // set once the pet is saved: the last (diet) step then shows

const isoYearsAgo = (y) => { const t = new Date(); t.setFullYear(t.getFullYear() - y); return t.toISOString().slice(0, 10); };
// Quick details typed on the foods page (before signing up) pre-fill the wizard, so nobody types them twice.
const reset = () => { const q = peekQuickPet(); d = { region: getRegion(), species: q?.species || 'dog', name: '', breed: q?.breed || '', sizeCat: q?.sizeCat || 'IV', birth: q?.birth || '', unit: 'kg', weight: q ? String(q.weightKg) : '' }; step = 0; };

const titles = ['Who are we feeding?', 'How old and how big?', 'How much do they weigh?', 'A little more (optional)', 'What do they eat now?'];

function view() {
  const body = [
    () => `${choiceGroup({ name: 'species', legend: 'Dog or cat?', value: d.species, tall: true, options: [{ value: 'dog', label: 'Dog', icon: 'paw' }, { value: 'cat', label: 'Cat', icon: 'paw' }] })}
           ${field({ id: 'name', label: 'Name', value: d.name, attrs: 'autocomplete="off" required', hint: 'So the plan feels like theirs.' })}
           ${hasRegion() || getPets().length ? '' : choiceGroup({ name: 'region', legend: 'Where do you buy pet food?', value: d.region, options: REGIONS.map(([value, label]) => ({ value, label })) })}
           <p class="small muted" style="margin:0">Already saved a plan? <button class="linkbtn" type="button" data-login>Log in</button></p>`,
    () => `${d.species === 'dog'
      ? `${comboField({ id: 'breed', label: 'Breed', options: DOG_BREEDS.map((b) => b.name), value: d.breed, placeholder: 'Start typing, like Labrador', hint: 'Mixed breed or not sure? Leave it blank, that is fine.' })}
         ${sizeBlock({ id: 'sizeCat', label: 'Expected adult size (if no breed)', value: d.sizeCat, options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })), hint: 'Your best guess at their grown-up weight.' })}`
      : notice('Good news: one growth curve fits all cat breeds, so no breed needed.')}
      ${field({ id: 'birth', label: 'Date of birth (or your best estimate)', type: 'date', value: d.birth, attrs: `min="${isoYearsAgo(30)}" max="${isoYearsAgo(0)}" required`, hint: 'We work out the age from it, so it stays right as they grow.' })}`,
    () => `<div class="input-row">${field({ id: 'weight', label: 'Current weight', type: 'number', value: d.weight, attrs: 'step="0.1" min="0.1" inputmode="decimal" required' })}${selectField({ id: 'unit', label: 'Unit', value: d.unit, options: [{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }] })}</div>
           ${notice('Next, a few optional questions make the plan more accurate.')}`,
    () => `<p class="muted" style="margin:0">Skip any of this. We use sensible defaults and you can change it later on Profile.</p>${OPTIONAL.map((k) => FIELDS[k].body(draftPet(), draftSummary)).join('')}`,
    () => `<p class="lead" style="margin:0">Add what ${esc(saved?.name || 'they')} eats and we compare it with the daily calories they need. You can also skip this and add it any time from the Diet tab.</p>`,
  ][step]();
  const diet = step === STEPS;
  const nav = diet
    ? `<div class="row row--between" style="margin-top:var(--space-6)">${button({ label: 'Skip for now', variant: 'ghost', attrs: 'data-skip-diet' })}${button({ label: 'Add what they eat', type: 'submit', iconName: 'plus' })}</div>`
    : `<div class="row row--between" style="margin-top:var(--space-6)">${step > 0 ? button({ label: 'Back', variant: 'ghost', attrs: 'data-back' }) : '<span></span>'}<span class="row">${step === 3 ? button({ label: 'Skip', variant: 'ghost', attrs: 'data-skip-optional' }) : ''}${button({ label: step === 3 ? 'Save and continue' : 'Continue', type: 'submit', iconName: 'arrow' })}</span></div>`;
  return `${pageBand(titles[step], '', `<div style="margin-top:var(--space-5);max-width:24rem">${stepper(STEPS + 1, step)}</div>`)}<div class="page wizard">
    <div class="wizard__photo wizard__art" aria-hidden="true"><span class="doodle" style="left:12%;top:8%;font-size:2.6rem;transform:rotate(-14deg)">${icon('bone')}</span><span class="doodle" style="right:10%;top:20%;font-size:2.2rem;transform:rotate(12deg)">${icon('paw')}</span><img src="/assets/${d.species === 'cat' ? 'cut-kitten' : 'cut-puppy'}-480.webp" alt=""></div>
    <div class="wizard__main">
    ${diet ? '' : `<a class="btn btn--ghost" href="/" style="margin: 0 0 var(--space-5) calc(var(--space-4) * -1)">${icon('back')}<span>Cancel</span></a>`}
    <form id="wiz" class="stack" novalidate>${body}${step === 2 ? ackHtml() : ''}<div id="wiz-err" class="error-text" role="alert"></div>${nav}</form></div></div>`;
}

// One-time acknowledgement that results are experimental (remembered on this device).
const ACK_KEY = 'pnm.ack';
const acked = () => { try { return localStorage.getItem(ACK_KEY) === '1'; } catch { return false; } };
const ackHtml = () => acked()
  ? '<p class="expnote">Reminder: results are experimental estimates, not veterinary advice. <a href="/disclaimer">Disclaimer</a></p>'
  : '<label class="ack"><input type="checkbox" id="ack" name="ack"><span>I understand these results are experimental estimates, not veterinary advice, and I will check with my vet before changing what my pet eats. <a href="/disclaimer">Read the disclaimer</a>.</span></label>';

function collect(form) {
  const f = new FormData(form);
  for (const [k, v] of f.entries()) d[k] = v;
  if (step === 1) d.breed = (f.get('breed') || '').toString().trim();
}

let draftSummary = null; // calc's summary of the draft pet, loaded when the optional step opens (it holds the activity answers)
async function validate() {
  if (step === 0 && !d.name.trim()) return 'What do you call them? Add a name to continue.';
  if (step === 1) { if (!d.birth) return 'Add a date of birth. A rough estimate is fine.'; if (d.birth > isoYearsAgo(0)) return 'Date of birth cannot be in the future.'; if (d.birth < isoYearsAgo(30)) return 'That looks too long ago. Please check the date.'; }
  if (step === 2) { const w = Number(d.weight); if (!(w > 0)) return 'Add their weight so we can size portions.'; const kgw = d.unit === 'lb' ? lbToKg(w) : w; const wc = await calc('weightCheck', { species: d.species, name: d.name, breed: d.breed, sizeCat: breedSize(d.breed)?.size || d.sizeCat, birth: d.birth }, kgw); if (!wc.ok) return wc.message; }
  if (step === 2 && !acked()) { const box = document.getElementById('ack'); if (!box?.checked) return 'Please tick the box to confirm you will check with your vet.'; try { localStorage.setItem(ACK_KEY, '1'); } catch { /* storage blocked */ } }
  return '';
}

// What the optional step needs in order to read the shared fields: a pet-shaped draft.
const draftPet = () => ({ species: d.species, name: d.name, breed: d.breed, sizeCat: d.sizeCat, birth: d.birth, weightKg: Number(d.weight) || 10, neutered: d.neutered ?? true, activity: d.activity || 'normal', exerciseMin: d.exerciseMin, bcs: 5, allergies: d.allergies || [], answered: {} });

// Read the optional answers with the same field definitions Profile uses.
function readOptional(form) {
  const f = new FormData(form); const dp = draftPet(); let patch = { answered: {} };
  for (const k of OPTIONAL) { const r = FIELDS[k].read(f, dp, draftSummary); patch = { ...patch, ...r, answered: { ...patch.answered, ...r.answered } }; }
  return patch;
}

function finish(extra = {}) {
  const kg = d.unit === 'lb' ? lbToKg(Number(d.weight)) : Number(d.weight);
  const quickAllergies = peekQuickPet()?.allergies || [];
  setQuickPet(null);
  if (d.region && !hasRegion() && !getPets().length) setRegion(d.region);
  saved = savePet({
    species: d.species, name: d.name.trim(), breed: d.breed, sizeCat: breedSize(d.breed)?.size || d.sizeCat, birth: d.birth,
    // sensible defaults until the owner answers; Profile says so and invites them to refine
    sex: 'unknown', neutered: true, weightKg: round(kg, 2), bcs: 5, activity: 'normal', allergies: quickAllergies, health: [],
    ...extra, answered: { bcs: false, neutered: false, activity: false, allergies: quickAllergies.length > 0, ...(extra.answered || {}) },
  });
}

export async function render() {
  if (!isSignedIn()) return profileGate();   // no account, no profile
  const adding = new URLSearchParams(location.search).get('add') === '1';
  if (getPet() && !d && !adding && !saved) return { title: 'Your pet', html: '', mount() { location.replace('/'); } };
  if (!d) reset();
  if (step === 3) draftSummary = await calc('petSummary', draftPet());
  return {
    title: 'Add your pet',
    html: view(),
    mount(root, rerender) {
      mountCombos(root);
      if (d.species === 'dog' && step === 1) bindBreedSize(root, { breedId: 'breed', sizeId: 'sizeCat', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
      const form = root.querySelector('#wiz');
      const done = (to) => { d = null; saved = null; location.assign(to); };
      form.addEventListener('change', () => collect(form));
      root.querySelector('[data-skip-diet]')?.addEventListener('click', () => { updatePet({ dietSkipped: true }); done('/?new=1'); });
      root.querySelector('[data-skip-optional]')?.addEventListener('click', () => { finish(); step = STEPS; rerender(); window.scrollTo({ top: 0 }); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (step === STEPS) { done('/pet/diet?add=1'); return; }
        if (step < 3) collect(form);
        const err = step < 3 ? await validate() : '';
        if (err) { root.querySelector('#wiz-err').textContent = err; return; }
        if (step === 3) { finish(readOptional(form)); step = STEPS; rerender(); window.scrollTo({ top: 0 }); return; }
        step += 1; rerender(); window.scrollTo({ top: 0 });
      });
      root.querySelector('[data-back]')?.addEventListener('click', () => { collect(form); step -= 1; rerender(); });
    },
  };
}
export const startNew = () => { reset(); };
