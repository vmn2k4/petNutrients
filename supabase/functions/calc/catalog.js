// CATALOGUE: the food, treat and supplement rows the ranking runs over, read from the public `catalog` schema and remembered for a few
// minutes (a warm function keeps it). Ids and field names match what the web app and domain.js use (id with underscores, camelCase).
let cfg = { url: '', key: '' };
export const configure = (c) => { cfg = { ...cfg, ...c }; };

const COLS = 'id,brand,name,species,format,form_detail,life_stage,kcal_per_kg,kcal_per_cup,kcal_per_unit,kcal_unit,grams_per_cup,protein_g_100g,fat_g_100g,fibre_g_100g,moisture_g_100g,ash_g_100g,calcium_g_100g,phosphorus_g_100g,ingredients,probiotics,glucosamine_chondroitin,collagen_added,omega3_source,markets,price_per_kg_cad_min';
const TREAT_COLS = `${COLS},treat_type,kcal_per_treat,kcal_per_treat_unit,grams_per_treat,treat_feeding_bands`;
const SUPP_COLS = 'id,brand,name,species,species_all,supplement_type,serving_size,dosing_text,dosing_bands,label_claim_text,vet_only,qa_flags,markets';

async function get(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${cfg.url}/rest/v1/${path}`, { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Accept-Profile': 'catalog', Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
    if (!r.ok) throw new Error(`catalog ${path.split('?')[0]}: ${r.status}`);
    const rows = await r.json(); out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const id = (p) => p.id.replace(/-/g, '_');
const food = (p) => ({
  id: id(p), brand: p.brand, name: p.name, species: p.species, format: p.format || 'other', lifeStage: p.life_stage, protein: p.protein_g_100g, fat: p.fat_g_100g, fibre: p.fibre_g_100g,
  moisture: p.moisture_g_100g, ash: p.ash_g_100g, kcalPerKg: p.kcal_per_kg, calcium: p.calcium_g_100g, phosphorus: p.phosphorus_g_100g, kcalPerCup: p.kcal_per_cup,
  kcalPerUnit: p.kcal_per_unit, kcalUnit: p.kcal_unit, gramsPerCup: p.grams_per_cup, pricePerKg: p.price_per_kg_cad_min ?? null, markets: p.markets || [], ingredients: p.ingredients || [],
  extras: [p.probiotics && 'probiotics', p.glucosamine_chondroitin && 'glucosamine', p.collagen_added && 'collagen', p.omega3_source && 'omega3'].filter(Boolean), guide: [],
});
const treat = (p) => ({ ...food(p), isTreat: true, treatType: p.treat_type, kcalPerTreat: p.kcal_per_treat, kcalPerTreatUnit: p.kcal_per_treat_unit, gramsPerTreat: p.grams_per_treat, treatBands: Array.isArray(p.treat_feeding_bands) ? p.treat_feeding_bands : [] });
const supp = (p) => ({ id: id(p), isSupplement: true, brand: p.brand, name: p.name, species: p.species, speciesAll: p.species_all || null, speciesUnknown: (p.qa_flags || []).includes('species_unknown'), type: p.supplement_type, servingSize: p.serving_size, dosingText: p.dosing_text, dosingBands: Array.isArray(p.dosing_bands) ? p.dosing_bands : [], vetOnly: !!p.vet_only, markets: p.markets || [] });

let cached = null; let at = 0; let loading = null;
const TTL = 10 * 60 * 1000;

async function load() {
  // foods only (retired and prescription foods are left out; a food needs an ingredient list and protein and fat), as the web app lists them
  const rows = await get(`products?select=${COLS}&product_type=eq.food&retired=is.false&prescription=is.false&protein_g_100g=not.is.null&fat_g_100g=not.is.null&ingredients=not.eq.{}&order=name,id`);
  const foods = rows.map(food);
  const guides = await get('feeding_guides?select=product_id,weight_label,weight_kg_min,weight_kg_max,amount_min,amount_max,unit,grams_per_day_min,grams_per_day_max,kcal_per_day_mid,source_url&order=product_id,weight_kg_max').catch(() => []);
  const byId = new Map();
  for (const g of guides) { const k = g.product_id.replace(/-/g, '_'); (byId.get(k) || byId.set(k, []).get(k)).push(g); }
  for (const f of foods) f.guide = byId.get(f.id) || [];
  const treats = (await get(`products?select=${TREAT_COLS}&product_type=eq.treat&prescription=is.false&order=name,id`).catch(() => [])).map(treat);
  const supplements = (await get(`products?select=${SUPP_COLS}&product_type=eq.supplement&order=name,id`).catch(() => [])).map(supp);
  return { foods, treats, supplements, byId: new Map([...foods, ...treats, ...supplements].map((x) => [x.id, x])) };
}

// { foods, treats, supplements, byId }; reloaded when older than ten minutes.
export async function getCatalog() {
  if (cached && Date.now() - at < TTL) return cached;
  loading ||= load().then((c) => { cached = c; at = Date.now(); return c; }).finally(() => { loading = null; });
  return loading;
}
export const setCatalog = (c) => { cached = c; at = Date.now(); }; // for tests
