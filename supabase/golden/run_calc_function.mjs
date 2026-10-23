// Runs the golden cases through the edge function's own handler, so the shared JSON vectors prove the deployed code path.
// node supabase/golden/run_calc_function.mjs
import { readFileSync } from 'node:fs';
import { handle } from '../functions/calc/handler.js';

const { cases } = JSON.parse(readFileSync(new URL('./energy.json', import.meta.url)));
const birthFor = (m) => new Date(Date.now() - m * 30.5 * 86400000).toISOString().slice(0, 10);
let bad = 0;
for (const c of cases) {
  const p = c.input;
  const { result: e } = await handle({ fn: 'energyPlan', args: [{ species: p.species, weightKg: p.weightKg, bcs: p.bcs, neutered: p.neutered, exerciseMin: p.exerciseMin ?? undefined, activity: p.activity ?? 'normal', birth: birthFor(p.ageMonths), sizeCat: p.sizeCat }] });
  if (!(e.stage === c.expect.stage && e.factor === c.expect.factor && Math.round(e.kcal) === c.expect.kcal)) { bad++; console.log('FAIL', c.name, e.stage, e.factor, Math.round(e.kcal), c.expect); }
}
const { results } = await handle({ calls: [{ id: 'a', fn: 'ingredientWarnings', args: [{ ingredients: ['chicken meal', 'xylitol'] }, { species: 'dog', allergies: [] }] }, { id: 'b', fn: 'nope' }] });
if (!results[0].result || !results[1].error) { bad++; console.log('FAIL batch', JSON.stringify(results)); }
console.log(`${cases.length + 1 - bad}/${cases.length + 1} checks pass through calc`);
process.exit(bad ? 1 : 0);
