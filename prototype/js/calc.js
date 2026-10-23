// CALC CLIENT: every calculation (growth, calories, goals, food fit, diet) runs in the `calc` Supabase Edge Function, the same one the app uses.
// Screens ask for what they need, in one request, then draw it. Results are kept by request, so asking again is free.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const url = () => { try { return localStorage.getItem('calcUrl') || ''; } catch { return ''; } };
const endpoint = () => url() || `${SUPABASE_URL}/functions/v1/calc`;
const cache = new Map();
const key = (fn, args) => JSON.stringify([fn, args]);

async function send(calls) {
  const r = await fetch(endpoint(), { method: 'POST', headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ calls: calls.map((c, i) => ({ id: i, fn: c[0], args: c.slice(1) })) }) });
  if (!r.ok) throw new Error(`Calculation service: ${r.status}`);
  const { results } = await r.json();
  return results.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}

// Several calculations in one request: calcMany([['petSummary', pet], ['growthCardView', pet]]) -> [summary, card]
export async function calcMany(calls) {
  const keys = calls.map((c) => key(c[0], c.slice(1)));
  const need = []; const seen = new Set();
  calls.forEach((c, i) => { if (!cache.has(keys[i]) && !seen.has(keys[i])) { seen.add(keys[i]); need.push(i); } });
  if (need.length) {
    const results = await send(need.map((i) => calls[i]));
    need.forEach((i, n) => cache.set(keys[i], results[n]));
    if (cache.size > 400) [...cache.keys()].slice(0, 100).forEach((k) => cache.delete(k));
  }
  return keys.map((k) => cache.get(k));
}

export const calc = async (fn, ...args) => (await calcMany([[fn, ...args]]))[0];
// The answer if it is already here (a repeat of an earlier call), else undefined.
export const peek = (fn, ...args) => cache.get(key(fn, args));

// One call that is never remembered: for changes that depend on the moment (planning a diet change, a goal), so a repeat is worked out again.
export const run = async (fn, ...args) => (await send([[fn, ...args]]))[0];
