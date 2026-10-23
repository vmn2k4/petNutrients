// Exports the reference tables the web app bundles (growth curves, breeds, AAFCO targets, USDA ingredients) as JSON assets for the
// Flutter app, so both apps read the same numbers. Run: node apps/mobile/tool/export_reference.mjs
import { writeFileSync } from 'node:fs';
import * as ref from '../../../prototype/js/reference-data.js';
import { INGREDIENTS } from '../../../prototype/js/ingredients-data.js';
import { GUIDES, GUIDE_DISCLAIMER } from '../../../prototype/js/guides-data.js';
import { TOXIC_ITEMS } from '../../../prototype/js/mock-data.js';

// Salt et al. 2017 curves start at 12 weeks (month 3); rows under 3 months are not from Salt and are dropped, as the web app does.
const dogGrowth = Object.fromEntries(Object.entries(ref.DOG_GROWTH).map(([k, rows]) => [k, rows.filter((r) => r.m >= 3)]));
writeFileSync(new URL('../assets/reference/reference.json', import.meta.url), JSON.stringify({
  dogBreeds: ref.DOG_BREEDS,
}));
writeFileSync(new URL('../assets/reference/ingredients.json', import.meta.url), JSON.stringify(INGREDIENTS));
writeFileSync(new URL('../assets/content/guides.json', import.meta.url), JSON.stringify({ disclaimer: GUIDE_DISCLAIMER, guides: GUIDES }));
writeFileSync(new URL('../assets/content/toxic.json', import.meta.url), JSON.stringify(TOXIC_ITEMS));
console.log('exported', Object.keys(dogGrowth).length, 'dog size groups,', ref.DOG_BREEDS.length, 'breeds,', INGREDIENTS.length, 'ingredients');
