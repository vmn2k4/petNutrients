// node supabase/golden/run_food_safety.mjs   -> checks foodFit() ingredient safety against food_safety.json
import { readFileSync } from 'node:fs';
import { foodFit, energyPlan, nutrientTargets } from '../../prototype/js/domain.js';

const { cases } = JSON.parse(readFileSync(new URL('./food_safety.json', import.meta.url)));
const birth = new Date(Date.now() - 4 * 365.25 * 86400000).toISOString().slice(0, 10);
let bad = 0;
for (const c of cases) {
  const pet = { species: c.species, weightKg: c.species === 'dog' ? 15 : 4, bcs: 5, neutered: true, birth, allergies: c.allergies, sizeCat: 'IV', activity: 'normal' };
  const food = { species: c.species, ingredients: [c.ingredient], lifeStage: 'adult', protein: c.species === 'dog' ? 26 : 34, fat: 15, moisture: 10, kcalPerKg: 3700, calcium: 1.3, phosphorus: 1.0 };
  const got = foodFit(food, pet, energyPlan(pet), nutrientTargets(pet)).verdict;
  if (got !== c.verdict) { bad++; console.log('FAIL', c.species, c.ingredient, c.allergies, 'got', got, 'want', c.verdict); }
}
console.log(`${cases.length - bad}/${cases.length} food safety cases pass`); process.exit(bad ? 1 : 0);
