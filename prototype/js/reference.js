// DATA LAYER (reference data): loads breeds, growth curves and AAFCO targets live from Supabase schema `ref`,
// and falls back to the bundled snapshot (reference-data.js, generated from /data) if the network or API fails.
// Exports keep the exact shapes the screens and domain.js already use.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import * as snapshot from './reference-data.js';

const get = async (table, query = '') => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Accept-Profile': 'ref' },
  });
  if (!r.ok) throw new Error(`${table}: ${r.status}`);
  return r.json();
};

const AAFCO_KEYS = ['Crude Protein', 'Crude Fat', 'Calcium', 'Phosphorus', 'Taurine', 'Sodium', 'Zinc', 'Vitamin D', 'Vitamin A', 'Iron'];
// numbers back to the label strings domain.js parses ("6.25 (4.5 for large-breed puppies)", "1:1", "ND")
const cell = (n, ratio, nd, lbp) => (n == null ? (ratio || (nd ? 'ND' : '')) : lbp != null ? `${n} (${lbp} for large-breed puppies)` : String(n));

async function loadLive() {
  const [growth, breeds, profiles, conds] = await Promise.all([
    get('growth_curves', 'select=species,size_cat,month,p02,p25,p50,p75,p98,n_visits&order=month'),
    get('breeds', 'select=breed_key,display_name,size_cat,adult_kg_min,adult_kg_max,exercise_hours&species=eq.dog&adult_kg_min=not.is.null&order=display_name'),
    get('nutrient_profiles', 'select=species,nutrient,unit,growth_min,adult_min,max_value,max_large_breed_puppy,ratio_growth,ratio_adult,ratio_max,not_determined&standard=eq.AAFCO-2014'),
    get('breed_conditions', 'select=breed_key,condition&order=condition'),
  ]);
  const DOG_GROWTH = {}; const CAT_GROWTH = [];
  for (const g of growth) {
    if (g.species === 'dog') (DOG_GROWTH[g.size_cat] ||= []).push({ m: g.month, p02: g.p02, p25: g.p25, p50: g.p50, p75: g.p75, p98: g.p98 });
    else CAT_GROWTH.push({ m: g.month, n: g.n_visits, p02: g.p02, p25: g.p25, p50: g.p50, p75: g.p75, p98: g.p98 });
  }
  const DOG_BREEDS = breeds.map((b) => ({ name: b.display_name, size: b.size_cat, min: b.adult_kg_min, max: b.adult_kg_max }));
  const AAFCO = {};
  for (const p of profiles) {
    if (!AAFCO_KEYS.includes(p.nutrient)) continue;
    (AAFCO[p.species] ||= {})[p.nutrient] = {
      unit: p.unit,
      growth: cell(p.growth_min, p.ratio_growth, p.not_determined),
      adult: cell(p.adult_min, p.ratio_adult, p.not_determined),
      max: cell(p.max_value, p.ratio_max, false, p.max_large_breed_puppy),
    };
  }
  const byKey = new Map(breeds.map((b) => [b.breed_key, b]));
  const BREED_INFO = {};
  const dis = {};
  for (const c of conds) { const b = byKey.get(c.breed_key); if (b && (dis[b.display_name] ||= []).length < 6) dis[b.display_name].push(c.condition); }
  for (const b of breeds) { const d = dis[b.display_name] || []; if (b.exercise_hours != null || d.length) BREED_INFO[b.display_name] = { ex: b.exercise_hours, dis: d }; }
  return { DOG_GROWTH, CAT_GROWTH, DOG_BREEDS, AAFCO, BREED_INFO, source: 'live' };
}

let data;
try {
  if (!SUPABASE_URL) throw new Error('offline mode');
  data = await loadLive();
} catch (e) {
  console.warn('Reference data: using bundled snapshot.', e.message);
  data = { ...snapshot, source: 'snapshot' };
}
// Salt et al. 2017 charts start at 12 weeks (3 months). Our dog rows under 3 months are not from Salt and include impossible values
// (a 29.5 kg newborn), so they are dropped from both the live data and the bundled snapshot.
for (const k of Object.keys(data.DOG_GROWTH)) data.DOG_GROWTH[k] = data.DOG_GROWTH[k].filter((r) => r.m >= 3);
export const { DOG_GROWTH, CAT_GROWTH, DOG_BREEDS, AAFCO, BREED_INFO } = data;
export const REFERENCE_SOURCE = data.source;
