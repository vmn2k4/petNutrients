// node supabase/golden/run_energy.mjs   -> checks prototype/js/domain.js against data/golden/energy.json
// node supabase/golden/run_energy.mjs --sql   -> prints one SQL statement per case; run it with psql to check public.energy_plan
import { readFileSync } from 'node:fs';
import { energyPlan } from '../functions/calc/domain.js';

const { cases } = JSON.parse(readFileSync(new URL('./energy.json', import.meta.url)));
const birthFor = (m) => new Date(Date.now() - m * 30.5 * 86400000).toISOString().slice(0, 10);

if (process.argv.includes('--sql')) {
  const v = (x) => (x === null || x === undefined ? 'null' : typeof x === 'string' ? `'${x}'` : x);
  cases.forEach((c, i) => { const p = c.input; console.log(`select ${i} as n, public.energy_plan('${p.species}', ${p.weightKg}, ${p.bcs}, ${p.neutered}, ${v(p.exerciseMin)}, current_date - ${Math.round(p.ageMonths * 30.5)}, '${p.sizeCat}', ${v(p.activity)}) as r;`); });
} else {
  let bad = 0;
  for (const c of cases) {
    const p = c.input; const e = energyPlan({ species: p.species, weightKg: p.weightKg, bcs: p.bcs, neutered: p.neutered, exerciseMin: p.exerciseMin ?? undefined, activity: p.activity ?? 'normal', birth: birthFor(p.ageMonths), sizeCat: p.sizeCat });
    const ok = e.stage === c.expect.stage && e.factor === c.expect.factor && Math.round(e.kcal) === c.expect.kcal;
    if (!ok) { bad++; console.log('FAIL', c.name, { stage: e.stage, factor: e.factor, kcal: Math.round(e.kcal) }, c.expect); }
  }
  console.log(`${cases.length - bad}/${cases.length} domain.js cases pass`); process.exit(bad ? 1 : 0);
}
