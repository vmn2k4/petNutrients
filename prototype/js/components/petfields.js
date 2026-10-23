// PET FIELDS: one description of every question we ask about a pet (and the region setting), used everywhere:
// the profile list, the "make the plan more accurate" prompt on Home, and onboarding. Each field says how to show its
// value, how to ask for it in a bottom sheet, and how to turn the answer into a saved change. No screen repeats this.
import { field, choiceGroup, selectField, comboField, mountCombos, sizeBlock, bindBreedSize, button, esc } from '../ui.js';
import { openSheet, toast } from '../sheet.js';
import { getPet, updatePet, getRegion, setRegion, REGIONS } from '../store.js';
import { ALLERGENS, SIZE_CATEGORIES, breedSize } from '../reference.js';
import { fmtDay, round } from '../format.js';
import { calc } from '../calc.js';
import { DOG_BREEDS, BREED_INFO } from '../reference.js';
import { BCS_OPTIONS } from '../mock-data.js';

const today = () => new Date().toISOString().slice(0, 10);
const HEALTH = [{ value: 'medical', label: 'Medical condition' }, { value: 'joints', label: 'Joint or knee problems' }, { value: 'pregnant', label: 'Pregnant or nursing' }];
const bcsList = (pet) => (pet.species === 'dog' ? BCS_OPTIONS.map((o) => ({ value: o.score, label: `${o.score}. ${o.label}` })) : [{ value: 5, label: 'Healthy weight' }, { value: 6, label: 'A bit heavy' }, { value: 3, label: 'Thin' }]);
const listOf = (a) => (a && a.length ? a.join(', ') : 'None');
const exerciseHint = (pet) => { const hrs = BREED_INFO[pet.breed]?.ex; return hrs == null ? '' : `${pet.breed}s typically get about ${hrs} hour${hrs === 1 ? '' : 's'} of exercise a day.`; };
const answered = (pet, k) => ({ answered: { ...(pet.answered || {}), [k]: true } });

// key -> { row (label in lists), chip (short name in prompts), title, why, show(pet, s), body(pet, s), read(form, pet, s) -> patch | { error } }
// `s` is the pet's summary from calc; the activity answers (their labels and what each one saves) come from it.
export const FIELDS = {
  name: { row: 'Name', title: 'Name', show: (p) => p.name, body: (p) => field({ id: 'p-name', label: 'Name', value: p.name, attrs: 'autocomplete="off" required' }),
    read: (f) => { const name = (f.get('p-name') || '').toString().trim(); return name ? { name } : { error: 'Please give your pet a name.' }; } },
  birth: { row: 'Date of birth', title: 'Date of birth', show: (p) => fmtDay(p.birth), body: (p) => field({ id: 'p-birth', label: 'Date of birth (or an estimate)', type: 'date', value: p.birth, attrs: `max="${today()}" required` }),
    read: (f) => {
      const birth = (f.get('p-birth') || '').toString(); const bd = new Date(birth);
      if (!birth || Number.isNaN(bd.getTime()) || birth > today()) return { error: 'Please enter a date of birth that is not in the future.' };
      if ((Date.now() - bd.getTime()) / (365.25 * 864e5) > 30) return { error: 'That date of birth looks too long ago. Is it right?' };
      return { birth };
    } },
  breed: { row: 'Breed', title: 'Breed', dogOnly: true, show: (p) => p.breed || 'Mixed breed',
    body: (p) => `${comboField({ id: 'p-breed', label: 'Breed', options: DOG_BREEDS.map((b) => b.name), value: p.breed || '', placeholder: 'Leave empty for mixed breed', hint: 'We use it for the growth curve and usual adult weight.' })}${sizeBlock({ id: 'p-size', label: 'Adult size (used when breed is blank)', value: p.sizeCat || 'IV', options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })) })}`,
    mount: (body) => bindBreedSize(body, { breedId: 'p-breed', sizeId: 'p-size', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id }),
    read: (f, p) => { const breed = (f.get('p-breed') || '').toString().trim(); return breed && !DOG_BREEDS.some((b) => b.name === breed) ? { error: 'Pick a breed from the list, or leave it empty for a mixed breed.' } : { breed, sizeCat: f.get('p-size') || p.sizeCat }; } },
  neutered: { row: 'Spayed or neutered', chip: 'Spayed or neutered', title: 'Spayed or neutered?', why: 'Spayed and neutered pets usually need fewer calories.', show: (p) => (p.neutered ? 'Yes' : 'No'),
    body: (p) => choiceGroup({ name: 'neutered', legend: 'Spayed or neutered?', value: p.neutered ? 'yes' : 'no', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unsure', label: 'Not sure' }] }),
    read: (f, p) => ({ neutered: f.get('neutered') !== 'no', ...answered(p, 'neutered') }) },
  activity: { row: 'Walking or play a day', chip: 'Activity', title: 'How active are they?', why: 'A rough guess is fine. Busy pets burn more energy, so we adjust their daily kcal.', show: (p, s) => s.activity.label, hint: exerciseHint,
    body: (p, s) => { const o = s.activity.options; return choiceGroup({ name: 'activity', legend: 'Walking or active play a day', value: o[Math.min(['low', 'normal', 'active', 'very'].indexOf(s.activity.band), o.length - 1)].value, options: o }); },
    read: (f, p, s) => ({ ...(f.get('activity') ? (s.activity.options.find((o) => String(o.value) === String(f.get('activity'))) || s.activity.options[1]).patch : {}), ...answered(p, 'activity') }) },
  bcs: { row: 'Body shape', chip: 'Body shape', title: 'How does the body look?', why: 'Helps us find their ideal weight and the right calories.', show: (p) => (bcsList(p).find((o) => o.value === Math.round(p.bcs)) || {}).label || 'Not set',
    body: (p) => (p.species === 'dog'
      ? `<fieldset class="field"><legend class="legend">Feel the ribs, look from above</legend><div class="choices" style="grid-template-columns:1fr">${BCS_OPTIONS.map((o) => `<label class="choice choice--list"><input type="radio" name="bcs" value="${o.score}" ${p.bcs === o.score ? 'checked' : ''}><span><strong>${o.score}. ${o.label}</strong><small class="muted">${esc(o.text)}</small></span></label>`).join('')}</div></fieldset>`
      : choiceGroup({ name: 'bcs', legend: 'How does your cat look?', value: p.bcs, options: bcsList(p) })),
    read: (f, p) => ({ bcs: Math.round(Number(f.get('bcs') || p.bcs)), ...answered(p, 'bcs') }) },
  allergies: { row: 'Ingredients to avoid', chip: 'Allergies', title: 'Any ingredients to avoid?', why: 'We flag or hide foods that contain them.', show: (p) => listOf(p.allergies),
    body: (p) => choiceGroup({ name: 'allergies', legend: 'Pick any that apply', type: 'checkbox', value: p.allergies || [], options: ALLERGENS.map((a) => ({ value: a, label: a })) }),
    read: (f, p) => ({ allergies: f.getAll('allergies'), ...answered(p, 'allergies') }) },
  health: { row: 'Health notes', title: 'Anything we should know?', show: (p) => ((p.health || []).length ? p.health.map((h) => (HEALTH.find((x) => x.value === h) || {}).label || h).join(', ') : 'None'),
    body: (p) => choiceGroup({ name: 'health', legend: 'Anything we should know?', type: 'checkbox', value: p.health || [], options: HEALTH }),
    read: (f) => ({ health: f.getAll('health') }) },
};

// Region belongs to the account, not the pet: it decides which foods are shown.
export const REGION_FIELD = { row: 'Where you shop', title: 'Where do you buy pet food?', why: 'We show foods sold there, so every result is one you can find.', show: () => (REGIONS.find(([id]) => id === getRegion()) || [])[1] || '',
  body: () => choiceGroup({ name: 'region', legend: 'Region', value: getRegion(), options: REGIONS.map(([value, label]) => ({ value, label })) }) };

export const PROFILE_ORDER = ['name', 'birth', 'breed', 'neutered', 'activity', 'bcs', 'allergies', 'health'];

// The list of rows (weight is handled by the quick-weight sheet). Tapping a row opens its sheet; see mountFieldRows.
export function fieldRowsHtml(pet, s) {
  const row = (k, label, value, extra = '') => `<button class="plist__row" type="button" ${extra || `data-field="${k}"`}><span class="plist__k">${label}</span><span class="plist__v">${esc(String(value))}</span></button>`;
  const rows = [
    row('name', FIELDS.name.row, FIELDS.name.show(pet)), row('birth', FIELDS.birth.row, FIELDS.birth.show(pet)),
    ...(pet.species === 'dog' ? [row('breed', FIELDS.breed.row, FIELDS.breed.show(pet))] : []),
    row('weight', 'Weight', `${round(pet.weightKg, 1)} kg`, 'data-quick-weight'),
    ...PROFILE_ORDER.slice(3).map((k) => row(k, FIELDS[k].row, FIELDS[k].show(pet, s))),
  ];
  return `<section class="plist" aria-label="Pet details">${rows.join('')}</section>`;
}

export const regionRowHtml = () => `<section class="plist" aria-label="Region"><button class="plist__row" type="button" data-field="region"><span class="plist__k">${REGION_FIELD.row}</span><span class="plist__v">${esc(REGION_FIELD.show())}</span></button></section>`;

// Open one field in a bottom sheet. `ask` shows the short "why" line and a "Not now" button (used from prompts).
export async function openField(key, rerender, { ask = false } = {}) {
  const pet = getPet(); const s = pet ? await calc('petSummary', pet) : null; const F = key === 'region' ? REGION_FIELD : FIELDS[key]; if (!F || (!pet && key !== 'region')) return;
  const why = F.why ? `<p class="muted" style="margin:0">${F.why}${F.hint && pet && F.hint(pet) ? ` ${esc(F.hint(pet))}` : ''}</p>` : '';
  openSheet({
    title: F.title,
    body: `<form class="stack" novalidate>${why}${F.body(pet, s)}<div class="error-text" role="alert" data-err></div><div class="row row--between">${ask ? button({ label: 'Not now', variant: 'ghost', attrs: 'data-close' }) : '<span></span>'}${button({ label: 'Save', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount(body, close) {
      mountCombos(body); F.mount?.(body);
      body.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault(); const f = new FormData(e.target);
        if (key === 'region') { setRegion(f.get('region')); close(); toast('Saved'); rerender?.(); return; }
        const patch = F.read(f, pet, s); if (patch.error) { body.querySelector('[data-err]').textContent = patch.error; return; }
        updatePet(patch); close(); toast(ask ? 'Plan updated' : 'Saved'); rerender?.();
      });
    },
  });
}

// One delegated handler per screen root for every [data-field] button.
export function bindFields(root, rerender) {
  root.__fieldsDone = rerender;
  if (root.__fieldsBound) return; root.__fieldsBound = true;
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-field]'); if (b) openField(b.dataset.field, () => root.__fieldsDone?.(), { ask: b.hasAttribute('data-ask') }); });
}
