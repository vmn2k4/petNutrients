// DATA LAYER (reference data): loads breeds, growth curves and AAFCO targets live from Supabase schema `ref`,
// and falls back to the bundled snapshot (reference-data.js, generated from /data) if the network or API fails.
// Exports keep the exact shapes the screens already use.
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
// numbers back to the label strings the calc function parses ("6.25 (4.5 for large-breed puppies)", "1:1", "ND")
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

// Lookups in the reference tables, for pickers and labels (what a breed is called, which size group it is). The numbers that
// depend on them (growth, calories, limits) come from calc.
export const breedSize = (name) => { const b = name && DOG_BREEDS.find((x) => x.name.toLowerCase() === String(name).trim().toLowerCase()); return b ? { name: b.name, size: b.size, min: b.min, max: b.max } : null; };
export const SIZE_CATEGORIES = [
  { id: 'I', label: 'Toy (under 6.5 kg)' },
  { id: 'II', label: 'Small (6.5 to 9 kg)' },
  { id: 'III', label: 'Small-medium (9 to 15 kg)' },
  { id: 'IV', label: 'Medium (15 to 30 kg)' },
  { id: 'V', label: 'Large (30 to 40 kg)' },
  { id: 'VI', label: 'Giant (over 40 kg)' },
];

// The allergens offered in pickers. calc matches them against ingredient lists (with synonyms).
export const ALLERGENS = ['chicken', 'beef', 'lamb', 'fish', 'egg', 'dairy', 'wheat', 'corn', 'soy', 'pea'];

// Labels for the diet pickers.
export const DIET_ROLES = { main: 'Main food', topper: 'Wet food or topper', treat: 'Treats', supplement: 'Supplement', other: 'Other' };
export const DIET_UNITS = { g: 'g', cup: 'cup', can: 'can', piece: 'piece', scoop: 'scoop', tsp: 'teaspoon', tbsp: 'tablespoon', capsule: 'capsule', tablet: 'tablet', ml: 'ml' };
export const SUPPLEMENTS = ['Collagen', 'Turmeric (curcumin)', 'Glucosamine and chondroitin', 'Fish oil (omega-3)', 'Probiotic', 'Digestive enzymes', 'Joint support blend', 'Multivitamin', 'Calcium supplement', 'Vitamin E'];

// Words for the goal and nutrient pickers.
export const GOALS = [
  { id: 'lose', label: 'Lose weight', hint: 'Gradual, safe loss', icon: 'scales' },
  { id: 'maintain', label: 'Keep weight steady', hint: 'Stay as they are', icon: 'heart' },
  { id: 'gain', label: 'Gain weight', hint: 'Healthy gain', icon: 'chart' },
  { id: 'grow', label: 'Grow healthy', hint: 'Stay on a steady curve', icon: 'paw' },
];
export const NUTRIENT_HELP = {
  protein: 'Builds and keeps muscle.',
  fat: 'Energy and a healthy coat.',
  fibre: 'Helps them feel full and keeps digestion regular.',
  calcium: 'Strong bones and teeth.',
  phosphorus: 'Works with calcium for bones.',
  moisture: 'Water in the food. Wet food is mostly water.',
  kcal: 'Calories in 100 g of food. Dry food is about 350 to 400, wet food about 80 to 130.',
  price: 'Estimated cost to feed your pet each day.',
};
