import { RECIPE_LIBRARY, TOXIC_ITEMS } from '../mock-data.js';
import { analyseRecipe, nutrientTargets } from '../domain.js';
import { getPet } from '../store.js';
import { GUIDES } from '../guides-data.js';
import { guideCard } from './guides.js';
import { card, button, notice, verdictBadge, pageHead, iconBubble, meter, selectField, esc, icon, emptyState, expNote } from '../ui.js';

export function hub() {
  const items = [['chart', 'Growth chart and goal planner', 'Puppy or kitten? See their percentile, set a goal weight, get daily calories.', '/pet/growth'], ['flask', 'Home recipe checker', 'Cooking at home? Add ingredients and see what is missing or too much.', '/recipe'], ['alert', 'Can my pet eat this?', 'Grapes, chocolate, cheese? Quick answers before you share a snack.', '/toxic']];
  return { title: 'Free pet nutrition tools', html: `${pageHead('Tools')}<div class="page"><p class="lede">Free tools to check labels, plan puppy or kitten growth, test homemade recipes against AAFCO targets, and look up whether a snack is safe for dogs or cats. Start with a <a href="/new">pet profile</a> for personalised calories, or jump straight into a checker below.</p><h2 class="item-title" style="margin-bottom:var(--space-4)">Tools</h2><div class="grid grid--2">${items.map(([i, h, p, href]) => card(`<div class="stack">${iconBubble(i)}<div><h3 class="card__title">${h}</h3><p class="muted" style="margin:0">${p}</p></div></div>`, { href })).join('')}</div>
    <div class="row row--between" style="margin:var(--space-7) 0 var(--space-4)"><h2 class="item-title" style="margin:0">Guides</h2>${button({ label: 'All guides', href: '/guides', variant: 'secondary', iconName: 'arrow' })}</div><div class="grid grid--2">${GUIDES.slice(0, 4).map((g) => guideCard(g)).join('')}</div></div>` };
}

let rows = [{ id: 'chicken-thigh', grams: 300 }, { id: 'rice', grams: 150 }, { id: 'carrot', grams: 50 }];

function recipeOut() {
  const pet = getPet(); const species = pet?.species || 'dog';
  const base = pet || { species, birth: new Date(Date.now() - 4 * 365 * 86400000).toISOString().slice(0, 10), weightKg: 20, bcs: 5, sizeCat: 'IV' };
  const targets = nutrientTargets(base);
  const a = analyseRecipe(rows, RECIPE_LIBRARY, targets);
  if (!a.rows.length) return notice('Add an ingredient and amount to get started.');
  const bad = a.rows.filter((r) => r.state === 'bad');
  return `<div class="stack">${card(`<div class="row row--between"><h2 style="margin:0">Per 1000 kcal</h2>${bad.length ? verdictBadge('bad', `${bad.length} gap${bad.length > 1 ? 's' : ''} found`) : verdictBadge('good', 'No gaps on these 4 nutrients')}</div><p class="muted small">${Math.round(a.tot.grams)} g total · ${Math.round(a.tot.kcal)} kcal. ${pet ? `Checked against ${esc(pet.name)}'s profile.` : 'Checked against an adult dog. Add a profile to personalise.'}</p>
    <div class="stack">${a.rows.map((r) => meter({ label: r.label, value: r.value, unit: 'g', min: r.target?.min, max: r.target?.max, state: r.state })).join('')}</div>`)}
    ${notice(`This checks only protein, fat, calcium and phosphorus. A complete home diet also needs vitamins, trace minerals, essential fatty acids${species === 'cat' ? ' and taurine (essential for cats)' : ''}. Ask a veterinary nutritionist to review any recipe you feed long term.`, 'caution')}</div>`;
}

export function recipe() {
  return {
    title: 'Home-cooked pet food recipe checker',
    html: `${pageHead('Home recipe checker')}<div class="page page--narrow">${expNote()}
      <p class="lede">Home-cooked meals for pets can miss calcium, phosphorus or calories. Add your ingredients and amounts; we compare protein, fat, calcium and phosphorus per 1000 kcal with AAFCO nutrient profiles. Sample ingredient values in this prototype are approximate. Real apps should pull USDA FoodData Central or equivalent. General guidance, not a complete diet formulation — work with a vet nutritionist for long-term home cooking.</p>
      <div class="stack-lg">${card(`<form id="rf" class="stack"><div id="rows" class="stack"></div>${button({ label: 'Add ingredient', variant: 'secondary', iconName: 'plus', attrs: 'id="add"' })}</form><p class="hint">Sample ingredient values are approximate. The real app reads USDA and Canadian Nutrient File data.</p>`)}<div id="rout"></div></div></div>`,
    mount(root) {
      const draw = () => {
        root.querySelector('#rows').innerHTML = rows.map((r, i) => `<div class="input-row" style="grid-template-columns:1fr 7rem auto;align-items:end"><div class="field"><label for="ing${i}">Ingredient</label><select class="select" id="ing${i}" data-i="${i}" data-f="id">${RECIPE_LIBRARY.map((x) => `<option value="${x.id}" ${x.id === r.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label for="g${i}">Grams</label><input class="input" id="g${i}" type="number" min="0" inputmode="decimal" value="${r.grams}" data-i="${i}" data-f="grams"></div><button class="btn btn--ghost" type="button" aria-label="Remove ingredient ${i + 1}" data-rm="${i}">${icon('trash')}</button></div>`).join('');
        root.querySelector('#rout').innerHTML = recipeOut();
      };
      root.addEventListener('input', (e) => { const t = e.target; if (t.dataset?.f) { rows[+t.dataset.i][t.dataset.f] = t.dataset.f === 'grams' ? Number(t.value) : t.value; root.querySelector('#rout').innerHTML = recipeOut(); } });
      root.addEventListener('click', (e) => { const rm = e.target.closest('[data-rm]'); if (rm) { rows.splice(+rm.dataset.rm, 1); draw(); } if (e.target.closest('#add')) { rows.push({ id: RECIPE_LIBRARY[0].id, grams: 100 }); draw(); } });
      draw();
    },
  };
}

export function toxic() {
  const draw = (q, sp) => {
    const items = TOXIC_ITEMS.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
    const text = { good: 'Generally safe', caution: 'Go easy', bad: 'Dangerous, avoid' };
    return items.length ? items.map((i) => card(`<div class="row row--between"><h2 class="item-title" style="margin:0">${esc(i.name)}</h2>${verdictBadge(i[sp], text[i[sp]])}</div><p class="muted" style="margin:var(--space-2) 0">${esc(i.note)}</p><p style="margin:var(--space-2) 0 0"><a href="/can-${sp}s-eat/${i.slug}">Read the full answer for ${sp}s</a></p>`)).join('') : emptyState({ img: 'cut-kitten', compact: true, title: 'Not in our list yet', text: 'When unsure, call your vet or an animal poison hotline.' });
  };
  return {
    title: 'Can My Dog or Cat Eat This? Toxic Food Checker (Free)',
    html: `${pageHead('Can my pet eat this?')}<div class="page page--narrow">${expNote()}
      <p class="lede">Pets steal snacks. Before you share grapes, chocolate, cheese or chicken, check whether it is safe, risky or toxic for dogs and cats. We only list foods we can back with published sources such as the ASPCA Animal Poison Control people-foods list. This is general guidance, not veterinary advice — if your pet already ate something dangerous, call your vet or a poison hotline now.</p>
      <div class="stack-lg"><form class="row" onsubmit="return false" style="align-items:end"><div class="field" style="flex:1;min-width:12rem"><label for="q">Food</label><input class="input" id="q" type="search" placeholder="e.g. grapes"></div>${selectField({ id: 'sp', label: 'Pet', options: [{ value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' }], value: getPet()?.species || 'dog' })}</form>
      <div id="tl" class="stack" aria-live="polite"></div>${notice('Sample entries for the prototype. The real list uses the BioVet veterinary dataset (CC BY 4.0) and ASPCA facts. If your pet ate something dangerous, call your vet or a pet poison line now.', 'caution')}</div></div>`,
    mount(root) {
      const q = root.querySelector('#q'); const sp = root.querySelector('#sp'); const tl = root.querySelector('#tl');
      const go = () => { tl.innerHTML = draw(q.value, sp.value); };
      q.addEventListener('input', go); sp.addEventListener('change', go); go();
    },
  };
}
