// Checks the Find food functions over the live catalogue (read-only, public data): node supabase/golden/run_foods.mjs
import { readFileSync } from 'node:fs';
import { configure } from '../functions/calc/catalog.js';
import { handle } from '../functions/calc/handler.js';

const cfg = readFileSync(new URL('../../prototype/js/config.js', import.meta.url), 'utf8');
configure({ url: cfg.match(/SUPABASE_URL = '([^']+)'/)[1], key: cfg.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1] });
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const pet = { id: 't', name: 'Testy', species: 'dog', breed: 'Labrador Retriever', sizeCat: 'V', neutered: true, bcs: 7, activity: 'normal', birth: day(2000), weightKg: 34, allergies: ['chicken'], health: [], logs: [{ on: day(2), kg: 34 }], skips: [], diet: [] };
let bad = 0; const check = (n, ok, x = '') => { if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', n, x); };
const call = async (fn, ...args) => { const r = await handle({ fn, args }); return r.result; };

const gv = await call('goalView', pet, null);
check('goalView', gv.options.includes('lose') && gv.kcal > 300 && gv.preset === 'lose', `${gv.start.type}, ${Math.round(gv.kcal)} kcal`);
const r = await call('rankFoods', { pet, goal: gv.start, species: 'dog', region: 'all', hideAllergy: true, sort: 'fit', limit: 5, priority: ['protein'] });
check('rankFoods', r.total > 20 && r.items.length === 5 && r.items[0].fit.verdict, `${r.total} foods, first ${r.items[0].id} ${r.items[0].fit.verdict}`);
const r2 = await call('rankFoods', { pet: null, species: 'cat', region: 'all', sort: 'fit', limit: 3 });
check('rankFoods without a pet', r2.items.length === 3 && r2.items[0].fit === null, `${r2.total} cat foods`);
const tv = await call('targetsView', 'dog');
check('targetsView', tv.bounds.kcal.protein && tv.presets.lose.length >= 2, `protein ${tv.bounds.kcal.protein.lo} to ${tv.bounds.kcal.protein.hi}`);
const d = await call('foodDetail', pet, r.items[0].id, 'US');
check('foodDetail', d && d.fit && d.nutrients.length === 4, `${Math.round(d.kcalPerKg)} kcal/kg`);
const t = await call('treatsView', { pet, sort: 'budget', limit: 3 });
check('treatsView', t.total > 0 && t.items.length > 0, `${t.total} treats`);
const s = await call('supplementsView', { pet, limit: 3 });
check('supplementsView', s.total >= 0, `${s.total} supplements`);
const h = await call('homePicks', pet, 'all', 2);
check('homePicks', h.length > 0 && h[0].fit.verdict === 'good', `${h.length} picks`);
process.exit(bad ? 1 : 0);
