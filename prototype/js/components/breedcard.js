// BREED CARD: what the breed changes (growth curve, large-breed rules) and what it does not. Folded away on Profile.
import { DOG_BREEDS, BREED_INFO } from '../reference.js';
import { card, badge, esc, disclosure } from '../ui.js';
import { round } from '../format.js';

const exerciseHint = (pet) => {
  const hrs = BREED_INFO[pet.breed]?.ex; if (hrs == null) return null;
  const fit = hrs * 60;
  return { hrs, fit, text: `${pet.breed}s typically get about ${hrs} hour${hrs === 1 ? '' : 's'} of exercise a day.` };
};

export function breedCardHtml(pet, plan) {
  if (pet.species !== 'dog') return '';
  const b = pet.breed && DOG_BREEDS.find((x) => x.name === pet.breed);
  if (!b) {
    return card(`<h2>Breed</h2><p class="muted" style="margin:0">Mixed breed or not sure: we use the adult size group you chose. Add a breed if you know it and we will use its growth curve and typical weight.</p>`, { flat: true });
  }
  const info = BREED_INFO[pet.breed] || {}; const kg = pet.weightKg; const adult = plan.stage === 'adult';
  const where = kg < b.min ? 'below' : kg > b.max ? 'above' : 'within';
  const status = adult ? `${esc(pet.name)} is ${round(kg, 1)} kg, ${where === 'within' ? 'within' : where} that range.` : `${esc(pet.name)} is still growing, so this is the weight to expect as an adult.`;
  const ex = exerciseHint(pet);
  return disclosure(`About the ${esc(pet.breed)}`, `
    <dl class="facts"><div><dt>Usual adult weight</dt><dd>${round(b.min, 1)} to ${round(b.max, 1)} kg</dd><dd class="muted small">${status}</dd></div>
    ${ex ? `<div><dt>Typical exercise</dt><dd>About ${ex.hrs} hour${ex.hrs === 1 ? '' : 's'} a day</dd></div>` : ''}
    ${info.dis?.length ? `<div><dt>More common in this breed</dt><dd class="chips" style="margin-top:var(--space-1)">${info.dis.map((d) => badge(d)).join('')}</dd><dd class="muted small">From a veterinary predisposition list, for conditions where food or weight can matter. Not a diagnosis. Ask your vet.</dd></div>` : ''}</dl>
    <p class="hint" style="margin-top:var(--space-4)">How we use the breed: it sets the growth curve and the large-breed puppy rules. Daily calories come from weight, age, neutering and activity, because breed alone does not predict energy needs reliably.</p>`);
}