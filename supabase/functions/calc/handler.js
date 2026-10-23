// The one place the pet-nutrition calculations run. Web and Flutter send { fn, args } (or { calls: [{ id, fn, args }] }) and get the result back as JSON.
// The calculation code (domain.js, foods.js) is written once, here. Functions that rank the catalogue read it through catalog.js.
import * as domain from './domain.js';
import * as foods from './foods.js';
import { getCatalog } from './catalog.js';
import { INGREDIENTS } from './ingredients-data.js';

const fns = Object.fromEntries(Object.entries(domain).filter(([, v]) => typeof v === 'function'));
const consts = Object.fromEntries(Object.entries(domain).filter(([, v]) => typeof v !== 'function'));
// Homemade mix with the bundled USDA ingredient table, so no client sends the table: rows are [{ id, amount }].
fns.mixAnalysis = (pet, rows, opts = {}) => domain.analyseMix(rows, INGREDIENTS, domain.nutrientTargets(pet), opts);
// Find food: pure on the pet and the goal ...
fns.goalView = foods.goalView;
// ... and over the catalogue (loaded once and remembered).
const withCatalog = (f) => async (...args) => f(await getCatalog(), ...args);
fns.rankFoods = withCatalog(foods.rankFoods);
fns.targetsView = withCatalog(foods.targetsView);
fns.foodDetail = withCatalog(foods.foodDetail);
fns.treatsView = withCatalog(foods.treatsView);
fns.treatDetail = withCatalog(foods.treatDetail);
fns.supplementsView = withCatalog(foods.supplementsView);
fns.homePicks = withCatalog(foods.homePicks);
fns.foodCards = withCatalog(foods.foodCards);
fns.scanView = withCatalog(foods.scanView);

// A date string like "2026-10-22T10:00:00Z" becomes a Date for the functions that take `today`/`now` objects.
const revive = (a) => (typeof a === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(a) && a.length > 10 ? new Date(a) : a);

async function one(fn, args = []) {
  const f = fns[fn];
  if (!f) throw new Error(`Unknown function: ${fn}`);
  return f(...args.map(revive));
}

export async function handle(body) {
  if (body?.constants) return { constants: consts };
  if (Array.isArray(body?.calls)) {
    if (body.calls.length > 500) throw new Error('Too many calls in one request (max 500).');
    return { results: await Promise.all(body.calls.map(async (c) => { try { return { id: c.id, result: await one(c.fn, c.args) }; } catch (e) { return { id: c.id, error: String(e.message || e) }; } })) };
  }
  if (typeof body?.fn === 'string') return { result: await one(body.fn, body.args) };
  throw new Error('Send { fn, args }, { calls: [...] } or { constants: true }.');
}
