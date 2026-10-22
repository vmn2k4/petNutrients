// node supabase/golden/run_mix.mjs  -> checks analyseMix() and dietKcal() with hand-worked numbers (USDA values per 100 g)
import { analyseMix, dietKcal, dietItemKcal, unitKcalOfFood, nutrientTargets } from '../../prototype/js/domain.js';
import { INGREDIENTS } from '../../prototype/js/ingredients-data.js';

const targets = nutrientTargets({ species: 'dog', birth: '2020-01-01', weightKg: 20, bcs: 5, sizeCat: 'IV' });
let bad = 0; const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
const check = (name, ok, got) => { if (!ok) { bad++; console.log('FAIL', name, got); } };

// 40% chicken breast (106.03 kcal), 20% canned pumpkin (34), 20% water (0): 42.412 + 6.8 = 49.212 kcal in 80 g listed -> 61.515 per 100 g
const a = analyseMix([{ id: 'chicken-breast-raw', amount: 40 }, { id: 'pumpkin-canned', amount: 20 }, { id: 'water', amount: 20 }], INGREDIENTS, targets, { mode: 'pct', batchG: 100 });
check('percent mix kcal per 100 g', near(a.kcalPer100g, 61.515), a.kcalPer100g); check('percent total', a.pctSum === 80, a.pctSum);
check('moisture counts water', near(a.moisturePct, (0.4 * 74.78 + 0.2 * 89.97 + 0.2 * 100) / 0.8, 0.1), a.moisturePct);
check('calcium is a gap', a.rows.find((r) => r.label === 'Calcium').state === 'bad', a.rows);

// grams: 300 g thigh (144.07) + 150 g white rice (130) + 50 g boiled carrot (35) = 432.21 + 195 + 17.5 = 644.71 kcal in 500 g
const b = analyseMix([{ id: 'chicken-thigh-raw', amount: 300 }, { id: 'rice-white-cooked', amount: 150 }, { id: 'carrot-cooked', amount: 50 }], INGREDIENTS, targets);
check('gram mix total kcal', near(b.kcal, 644.71, 0.1), b.kcal); check('gram mix per kg', near(b.kcalPerKg, 1289.42, 0.5), b.kcalPerKg);
// water only has no calories, so no checks
const c = analyseMix([{ id: 'water', amount: 500 }], INGREDIENTS, targets); check('water only', c.kcal === 0 && c.rows.length === 0, c);
// an ingredient with no calcium figure makes calcium "not verified", never zero
const lib = [{ id: 'x', name: 'x', kcal: 100, protein_g: 10, fat_g: 5, calcium_mg: null, phosphorus_mg: 100, water_g: 70 }];
const d = analyseMix([{ id: 'x', amount: 100 }], lib, targets); check('missing calcium is unknown', d.rows.find((r) => r.label === 'Calcium').state === 'unknown' && d.rows.find((r) => r.label === 'Calcium').value === null, d.rows);
// the diet total counts a homemade mix by its own kcal per kg: 911 g x 2 a day at 739 kcal/kg = 1346.5
const e = dietKcal([{ id: 1, foodId: null, unit: 'g', amount: 911, timesPerDay: 2, kcalPerKg: 739 }, { id: 2, foodId: null, unit: 'g', amount: 50, timesPerDay: 1 }], () => null);
check('diet counts a mix', e.kcal === 1346 && e.known === 1 && e.unknown === 1, e);

// Calories follow the measure the pet is fed in. Typed calories per cup: 2 cups x 2 a day at 190 kcal per cup = 760.
const cup = dietItemKcal({ unit: 'cup', amount: 2, timesPerDay: 2, kcalPerUnit: 190, role: 'main' }, null);
check('manual kcal per cup', cup && Math.round(cup.perDay) === 760 && Math.round(cup.perMeal) === 380 && cup.source === 'yours', cup);
// per 100 g typed as kcal per kg: 100 g twice a day at 1,500 kcal/kg = 300
const gm = dietItemKcal({ unit: 'g', amount: 100, timesPerDay: 2, kcalPerKg: 1500, role: 'main' }, null); check('manual kcal per 100 g', gm && Math.round(gm.perDay) === 300, gm);
// a catalogue food: label kcal per cup, else grams per cup x kcal per kg, a can only when the label says can, a treat by its kcal per treat
check('label kcal per cup', unitKcalOfFood('cup', { kcalPerCup: 388 }) === 388);
check('kcal per cup from grams per cup', Math.round(unitKcalOfFood('cup', { kcalPerKg: 3600, gramsPerCup: 110 })) === 396, unitKcalOfFood('cup', { kcalPerKg: 3600, gramsPerCup: 110 }));
check('can needs a can label', unitKcalOfFood('can', { kcalPerUnit: 180, kcalUnit: 'can' }) === 180 && unitKcalOfFood('can', { kcalPerUnit: 180, kcalUnit: 'cup' }) == null);
check('kcal per treat', unitKcalOfFood('piece', { kcalPerTreat: 2 }) === 2);
// no calories in this measure: not counted, never guessed from grams
check('cups without calories are not counted', dietItemKcal({ unit: 'cup', amount: 1, timesPerDay: 1, role: 'main' }, { kcalPerKg: 3600 }) == null);
// the diet total uses each item's own measure and leaves supplements out
const mixed = dietKcal([{ unit: 'cup', amount: 2, timesPerDay: 2, kcalPerUnit: 190, role: 'main', foodName: 'a' }, { unit: 'g', amount: 100, timesPerDay: 2, kcalPerKg: 1500, role: 'main', foodName: 'b' }, { unit: 'scoop', amount: 1, timesPerDay: 1, role: 'supplement', foodName: 'c' }, { unit: 'cup', amount: 1, timesPerDay: 1, role: 'main', foodName: 'd' }], () => null);
check('mixed diet total', mixed.kcal === 1060 && mixed.known === 2 && mixed.unknown === 1 && mixed.supplements === 1 && mixed.uncounted[0] === 'd', mixed);
console.log(`${bad ? 'FAILED' : 'all'} mix builder checks ${bad ? bad + ' failed' : 'pass'}`); process.exit(bad ? 1 : 0);
