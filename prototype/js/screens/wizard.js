import { stepper, choiceGroup, field, selectField, comboField, mountCombos, sizeBlock, bindBreedSize, button, notice, icon, esc, pageBand } from '../ui.js';
import { DOG_BREEDS } from '../reference.js';
import { SIZE_CATEGORIES, breedSize, lbToKg, round, weightCheck } from '../domain.js';
import { savePet, getPet, isSignedIn, peekQuickPet, setQuickPet } from '../store.js';
import { profileGate } from '../account.js';

// Three quick steps to a first result. Body shape, neutering, activity and allergies are asked afterwards
// on the dashboard ("Make the plan more accurate"), once the owner has already seen something useful.
const STEPS = 3;
let step = 0;
let d = null; // draft answers

const isoYearsAgo = (y) => { const t = new Date(); t.setFullYear(t.getFullYear() - y); return t.toISOString().slice(0, 10); };
// Quick details typed on the foods page (before signing up) pre-fill the wizard, so nobody types them twice.
const reset = () => { const q = peekQuickPet(); d = { species: q?.species || 'dog', name: '', breed: q?.breed || '', sizeCat: q?.sizeCat || 'IV', birth: q?.birth || '', unit: 'kg', weight: q ? String(q.weightKg) : '' }; step = 0; };

const titles = ['Who are we feeding?', 'How old and how big?', 'One last thing: weight'];
const leads = ['Three quick questions, then their food matches.', 'Puppies, kittens and seniors need different things.', 'This sets their daily portions. Almost there!'];

function view() {
  const body = [
    () => `${choiceGroup({ name: 'species', legend: 'Dog or cat?', value: d.species, tall: true, options: [{ value: 'dog', label: 'Dog', icon: 'paw' }, { value: 'cat', label: 'Cat', icon: 'paw' }] })}
           ${field({ id: 'name', label: 'Name', value: d.name, attrs: 'autocomplete="off" required', hint: 'So the plan feels like theirs.' })}
           <p class="small muted" style="margin:0">Already saved a plan? <button class="linkbtn" type="button" data-login>Log in</button></p>`,
    () => `${d.species === 'dog'
      ? `${comboField({ id: 'breed', label: 'Breed', options: DOG_BREEDS.map((b) => b.name), value: d.breed, placeholder: 'Start typing, like Labrador', hint: 'Mixed breed or not sure? Leave it blank, that is fine.' })}
         ${sizeBlock({ id: 'sizeCat', label: 'Expected adult size (if no breed)', value: d.sizeCat, options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })), hint: 'Your best guess at their grown-up weight.' })}`
      : notice('Good news: one growth curve fits all cat breeds, so no breed needed.')}
      ${field({ id: 'birth', label: 'Date of birth (or your best estimate)', type: 'date', value: d.birth, attrs: `min="${isoYearsAgo(30)}" max="${isoYearsAgo(0)}" required`, hint: 'We work out the age from it, so it stays right as they grow.' })}`,
    () => `<div class="input-row">${field({ id: 'weight', label: 'Current weight', type: 'number', value: d.weight, attrs: 'step="0.1" min="0.1" inputmode="decimal" required' })}${selectField({ id: 'unit', label: 'Unit', value: d.unit, options: [{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }] })}</div>
           ${notice('Next, you can add body shape, activity and allergies for an even better match. All optional.')}`,
  ][step]();
  const last = step === STEPS - 1;
  return `${pageBand(titles[step], '', `<div style="margin-top:var(--space-5);max-width:24rem">${stepper(STEPS, step)}</div>`)}<div class="page wizard">
    <div class="wizard__photo wizard__art" aria-hidden="true"><span class="doodle" style="left:12%;top:8%;font-size:2.6rem;transform:rotate(-14deg)">${icon('bone')}</span><span class="doodle" style="right:10%;top:20%;font-size:2.2rem;transform:rotate(12deg)">${icon('paw')}</span><img src="/assets/${d.species === 'cat' ? 'cut-kitten' : 'cut-puppy'}-480.webp" alt=""></div>
    <div class="wizard__main">
    <a class="btn btn--ghost" href="/" style="margin: 0 0 var(--space-5) calc(var(--space-4) * -1)">${icon('back')}<span>Cancel</span></a>
    <form id="wiz" class="stack" novalidate>${body}${last ? ackHtml() : ''}<div id="wiz-err" class="error-text" role="alert"></div>
      <div class="row row--between" style="margin-top:var(--space-6)">
        ${step > 0 ? button({ label: 'Back', variant: 'ghost', attrs: 'data-back' }) : '<span></span>'}
        ${button({ label: last ? 'See their matches' : 'Continue', type: 'submit', iconName: last ? 'check' : 'arrow' })}
      </div></form></div></div>`;
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

function validate() {
  if (step === 0 && !d.name.trim()) return 'What do you call them? Add a name to continue.';
  if (step === 1) { if (!d.birth) return 'Add a date of birth. A rough estimate is fine.'; if (d.birth > isoYearsAgo(0)) return 'Date of birth cannot be in the future.'; if (d.birth < isoYearsAgo(30)) return 'That looks too long ago. Please check the date.'; }
  if (step === 2) { const w = Number(d.weight); if (!(w > 0)) return 'Add their weight so we can size portions.'; const kgw = d.unit === 'lb' ? lbToKg(w) : w; const wc = weightCheck({ species: d.species, name: d.name, breed: d.breed, sizeCat: breedSize(d.breed)?.size || d.sizeCat, birth: d.birth }, kgw); if (!wc.ok) return wc.message; }
  if (step === STEPS - 1 && !acked()) { const box = document.getElementById('ack'); if (!box?.checked) return 'Please tick the box to confirm you will check with your vet.'; try { localStorage.setItem(ACK_KEY, '1'); } catch { /* storage blocked */ } }
  return '';
}

function finish() {
  const kg = d.unit === 'lb' ? lbToKg(Number(d.weight)) : Number(d.weight);
  const quickAllergies = peekQuickPet()?.allergies || [];
  setQuickPet(null);
  savePet({
    species: d.species, name: d.name.trim(), breed: d.breed, sizeCat: breedSize(d.breed)?.size || d.sizeCat, birth: d.birth,
    // sensible defaults until the owner answers; the dashboard says so and invites them to refine
    sex: 'unknown', neutered: true, weightKg: round(kg, 2), bcs: 5, activity: 'normal', allergies: quickAllergies, health: [],
    answered: { bcs: false, neutered: false, activity: false, allergies: quickAllergies.length > 0 },
  });
  location.assign('/pet?new=1');
}

export function render() {
  if (!isSignedIn()) return profileGate();   // no account, no profile
  if (getPet() && !d) return { title: 'Your pet', html: '', mount() { location.replace('/pet'); } };
  if (!d) reset();
  return {
    title: 'Dog & Cat Food Finder – Match by Breed, Age & Weight',
    html: view(),
    mount(root, rerender) {
      mountCombos(root);
      if (d.species === 'dog' && step === 1) bindBreedSize(root, { breedId: 'breed', sizeId: 'sizeCat', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
      const form = root.querySelector('#wiz');
      form.addEventListener('change', () => collect(form));
      form.addEventListener('submit', (e) => {
        e.preventDefault(); collect(form);
        const err = validate();
        if (err) { root.querySelector('#wiz-err').textContent = err; return; }
        if (step === STEPS - 1) { finish(); d = null; return; }
        step += 1; rerender(); window.scrollTo({ top: 0 });
      });
      root.querySelector('[data-back]')?.addEventListener('click', () => { collect(form); step -= 1; rerender(); });
    },
  };
}
export const startNew = () => { reset(); };
