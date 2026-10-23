// DATA LAYER: the only module that reads or writes persisted data (reference data lives in reference.js).
// Screens call these functions synchronously. Data is hydrated from Supabase once at startup (top-level await),
// kept in memory, cached in localStorage, and every write goes through to Supabase in order.
// Auth is Supabase anonymous sign-in, so no account is needed to start; a later magic link upgrades the same user.
// If Supabase is unreachable the app keeps working from localStorage alone.
import { FOODS, REVIEWS } from './mock-data.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { run } from './calc.js';

const KEY = 'pnm.v1';
const AUTH_KEY = 'pnm.auth';
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: stay in memory */ } };
let mem = lsGet(KEY) || {};
const save = () => lsSet(KEY, mem);
// Several pets per account. mem.pets holds them all; mem.pet is always the active one (same object), which the older code paths use.
if (mem.pet && !mem.pets) mem.pets = [mem.pet];
if (!mem.pets) mem.pets = [];
mem.pets.forEach((p) => { if (!p.id) p.id = newId(); });
mem.pet = mem.pets.find((p) => p.id === mem.activeId) || mem.pets[0] || undefined;

// ---------- Supabase access (REST + GoTrue, no library so the prototype needs no build step) ----------
let session = lsGet(AUTH_KEY);
// Earlier builds created invisible guest accounts. They are dropped: only a real account (with an email) counts as signed in.
const jwtClaims = (jwt) => { try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; } };
if (session?.access_token && jwtClaims(session.access_token).is_anonymous !== false) { session = null; try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ } }
export const isSignedIn = () => !!session?.access_token;

// The email link brings the owner back with the session in the URL (#access_token=...&type=...). Take it, clean the URL, and
// leave a short note for the screen to show. Works with the default Supabase emails, before any custom email sender exists.
const NOTICE_KEY = 'pnm.notice';
const RECOVERY_KEY = 'pnm.recovery';
(function takeAuthRedirect() {
  try {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('access_token') && h.get('refresh_token')) {
      const jwt = JSON.parse(atob(h.get('access_token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      session = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: Number(h.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(h.get('expires_in') || 3600), uid: jwt.sub };
      lsSet(AUTH_KEY, session);
      if (h.get('type') === 'recovery') sessionStorage.setItem(RECOVERY_KEY, '1'); // the reset-password sheet opens on load
      else sessionStorage.setItem(NOTICE_KEY, h.get('type') === 'signup' ? 'Welcome! Your account is ready.' : 'Welcome back.');
      history.replaceState(null, '', '/pet'); // tapping the email link lands on the pet page
    } else if (h.get('error_code')) {
      sessionStorage.setItem(NOTICE_KEY, h.get('error_code') === 'otp_expired' ? 'That link has expired. Ask for a new one.' : 'That link did not work. Please try again.');
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch { /* no auth redirect in the URL */ }
})();
// "Continue with Google": Supabase sends the owner to Google and back here with the session in the URL, which takeAuthRedirect above reads.
export const googleSignInUrl = () => `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin)}`;
export const takeRecovery = () => { try { const m = sessionStorage.getItem(RECOVERY_KEY); sessionStorage.removeItem(RECOVERY_KEY); return !!m && !!session; } catch { return false; } };
export const takeAuthNotice = () => { try { const m = sessionStorage.getItem(NOTICE_KEY); sessionStorage.removeItem(NOTICE_KEY); return m; } catch { return null; } };
let online = false;
let petId = null;
let remoteReviews = [];
let profile = null;

const authFetch = async (path, body) => {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  return r.json();
};
const keep = (s) => { session = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600), uid: s.user?.id || session?.uid }; lsSet(AUTH_KEY, session); };

async function ensureSession() {
  if (session && session.expires_at - 60 > Date.now() / 1000) return session;
  if (session?.refresh_token) { try { keep(await authFetch('token?grant_type=refresh_token', { refresh_token: session.refresh_token })); return session; } catch { session = null; } }
  throw new Error('signed out'); // no guest accounts: a profile needs a real account
}

async function api(path, { method = 'GET', body, prefer, schema = 'public' } = {}) {
  const s = await ensureSession();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, signal: AbortSignal.timeout(8000),
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json', 'Accept-Profile': schema, 'Content-Profile': schema, ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    // The anonymous account is gone (deleted, or the token is no longer valid): forget it and work locally.
    // The next visit signs in fresh and uploads what this browser holds.
    if (r.status === 401 || (r.status === 409 && /user_id_fkey/.test(text))) { session = null; lsSet(AUTH_KEY, null); online = false; }
    throw new Error(`${method} ${path}: ${r.status} ${text}`);
  }
  return r.status === 204 ? null : r.json().catch(() => null);
}

// Writes run one after another so an update never races the insert it depends on.
let chain = Promise.resolve();
// petId is the pet a queued write belongs to: captured when the write is queued, so switching pets before it runs cannot send it to the wrong one.
const sync = (fn) => { if (!online) return; const forPet = mem.pet?.id || null; chain = chain.then(() => { petId = forPet; return fn(); }).catch((e) => console.warn('Sync failed, kept locally:', e.message)); };

// ---------- mapping between the app's pet object and the `pets` table ----------
const COLS = { species: 'species', name: 'name', breed: 'breed', sizeCat: 'size_cat', birth: 'birth_date', sex: 'sex', neutered: 'neutered', weightKg: 'weight_kg', bcs: 'bcs', activity: 'activity', exerciseMin: 'exercise_min', allergies: 'allergies', health: 'health', answered: 'answered', goal: 'goal', target: 'target', skips: 'skips', remind: 'remind' };
const toRow = (obj) => {
  const row = {};
  for (const [k, col] of Object.entries(COLS)) if (k in obj) row[col] = obj[k] === undefined ? null : obj[k];
  if ('remind' in row) row.remind = !!row.remind;
  return row;
};
const fromRow = (row, logs) => {
  const pet = {};
  for (const [k, col] of Object.entries(COLS)) pet[k] = row[col];
  pet.id = row.id; pet.weightKg = Number(pet.weightKg); pet.goal = pet.goal || undefined; pet.target = pet.target || null;
  pet.logs = logs.map((l) => ({ on: l.measured_on, kg: Number(l.kg), bcs: l.bcs }));
  return pet;
};
const reviewRow = (r, pet) => ({
  food_id: r.foodId, pet_id: petId || null, stars: r.stars, liked: r.liked, improved: r.improved || [], rebuy: !!r.rebuy, subscribe: !!r.subscribe,
  why: r.why || '', body: r.text || '', fed_for: r.when || 'recently', pet_label: r.pet || 'Anonymous',
  pet_species: pet?.species || null, pet_size_cat: pet?.sizeCat || null, pet_age_months: pet ? ageMonths(pet.birth) : null,
});
const fromReview = (r) => ({ id: r.id, uid: r.user_id, foodId: r.food_id, pet: r.pet_label, stars: r.stars, liked: r.liked, improved: r.improved, rebuy: r.rebuy, subscribe: r.subscribe, why: r.why, text: r.body, when: r.fed_for });
const ageMonths = (birth) => Math.max(0, Math.round((Date.now() - new Date(birth)) / 2629800000));
function today() { return new Date().toISOString().slice(0, 10); }

const insertPet = async (pet) => {
  const [row] = await api('pets', { method: 'POST', body: { id: pet.id, ...toRow(pet) }, prefer: 'return=representation' });
  const logs = pet.logs?.length ? pet.logs : [{ on: today(), kg: pet.weightKg, bcs: pet.bcs }];
  await api('weight_logs', { method: 'POST', body: logs.map((l) => ({ pet_id: row.id, measured_on: l.on, kg: l.kg, bcs: l.bcs ?? null })) });
  for (const it of pet.diet || []) await api('pet_diet_items', { method: 'POST', body: { ...toDiet(it), pet_id: row.id } }).catch(() => {});
};

// ---------- hydrate once at startup ----------
async function hydrate() {
  if (!SUPABASE_URL || !session) return; // signed out: browse only, nothing to load
  await ensureSession();
  const [pets, saved, reviews, profiles] = await Promise.all([
    api('pets?select=*&order=created_at.asc'), api('saved_foods?select=food_id'), api('reviews?select=*&status=eq.published&order=created_at.desc'),
    api('profiles?select=*&limit=1').catch(() => []),
  ]);
  profile = profiles[0] || null;
  online = true;
  remoteReviews = reviews.map(fromReview);
  if (pets.length) {
    const loaded = [];
    for (const row of pets) {
      const logs = await api(`weight_logs?select=measured_on,kg,bcs&pet_id=eq.${row.id}&order=measured_on`);
      const p = fromRow(row, logs);
      const hist = await api(`pet_goals?select=*&pet_id=eq.${row.id}&order=ended_on.desc,created_at.desc&limit=50`).catch(() => []);
      p.goalHistory = hist.map((h) => ({ type: h.type, startOn: h.start_on, startKg: Number(h.start_kg), targetKg: Number(h.target_kg), targetDate: h.target_date, endedOn: h.ended_on, endKg: h.end_kg == null ? null : Number(h.end_kg), outcome: h.outcome }));
      const diet = await api(`pet_diet_items?select=*&pet_id=eq.${row.id}&order=started_on.desc,created_at.desc`).catch(() => []);
      p.diet = diet.map(fromDiet);
      loaded.push(p);
    }
    mem.pets = loaded;
    activate(loaded.find((p) => p.id === mem.activeId) || loaded[0]);
    mem.saved = saved.map((s) => s.food_id);
  } else {
    // first run on this account: upload whatever the browser already had
    for (const p of mem.pets) await insertPet(p);
    const ids = mem.saved || [];
    if (ids.length) await api('saved_foods', { method: 'POST', body: ids.map((food_id) => ({ food_id })), prefer: 'resolution=ignore-duplicates' });
    mem.saved = ids;
  }
  petId = mem.pet?.id || null;
  const mine = (mem.reviews || []).filter((r) => !r.id);
  for (const r of mine) await api('reviews?on_conflict=user_id,food_id', { method: 'POST', body: reviewRow(r, mem.pet), prefer: 'resolution=merge-duplicates' }).catch(() => {});
  if (mine.length) remoteReviews = (await api('reviews?select=*&status=eq.published&order=created_at.desc')).map(fromReview);
  mem.reviews = [];
  save();
  try { if (sessionStorage.getItem('pnm.pendingReminders')) { sessionStorage.removeItem('pnm.pendingReminders'); setEmailReminders(true); } } catch { /* ignore */ }
}


// ---------- public API (same names and sync behaviour the screens already use) ----------
export const getPet = () => (isSignedIn() ? mem.pet || null : null);
export const getPets = () => (isSignedIn() ? mem.pets : []);
// Make one pet the active one: every screen then shows its weights, diet and goal.
function activate(p) {
  mem.pet = p; mem.activeId = p?.id; anchorLegacyGoal(); save();
}
export const setActivePet = (id) => { const p = mem.pets.find((x) => x.id === id); if (p) activate(p); return p || null; };
// Adds a pet and makes it the active one.
export const savePet = (pet) => {
  const p = { ...pet, id: newId(), logs: pet.logs || [{ on: today(), kg: pet.weightKg, bcs: pet.bcs }] };
  mem.pets = [...mem.pets, p]; activate(p);
  sync(() => insertPet(p));
  return p;
};
export const updatePet = (patch) => {
  if (!mem.pet) return null;
  Object.assign(mem.pet, patch); save();   // in place, so mem.pets keeps pointing at the same pet
  const row = toRow(patch); const id = mem.pet.id;
  if (Object.keys(row).length) sync(async () => { await api(`pets?id=eq.${id}`, { method: 'PATCH', body: row }); });
  return mem.pet;
};
// Removes the active pet; the next one (if any) becomes active.
export const removePet = () => {
  const gone = mem.pet; if (!gone) return;
  mem.pets = mem.pets.filter((p) => p !== gone); activate(mem.pets[0]);
  sync(async () => { await api(`pets?id=eq.${gone.id}`, { method: 'DELETE' }); });
};
export const clearPet = removePet;
export const addWeighIn = (kg, bcs) => {
  const pet = mem.pet; if (!pet || !Number.isFinite(kg) || !(kg > 0)) return null; // the screens check the range; this stops a bad number reaching the saved data
  const on = today();
  pet.logs = [...(pet.logs || []), { on, kg, bcs }]; pet.weightKg = kg; pet.bcs = bcs; save();
  sync(async () => {
    if (!petId) return;
    await api('weight_logs', { method: 'POST', body: { pet_id: petId, measured_on: on, kg, bcs } });
    await api(`pets?id=eq.${petId}`, { method: 'PATCH', body: { weight_kg: kg, bcs } });
  });
  return pet;
};

// ---------- foods: Hill's UK label data (catalog) and Open Pet Food Facts (opff) from Supabase ----------
const IMG = { dry: 'assets/food-dry-dog.webp', wet: 'assets/food-wet-dog.webp', catdry: 'assets/food-cat-kibble.webp', catwet: 'assets/food-cat-pate.webp' };
const genericImg = (species, format) => (species === 'cat' ? (format === 'wet' ? IMG.catwet : IMG.catdry) : (format === 'wet' ? IMG.wet : IMG.dry));
const NONE = { rating: 0, reviews: 0, rebuy: 0, subscribe: 0 };
const guess = (t) => (t || '').split(/,(?![^()]*\))/).map((x) => x.replace(/[_*]/g, '').trim().toLowerCase()).filter(Boolean).slice(0, 40);

const fromCatalog = (p) => ({
  id: p.id.replace(/-/g, '_'), img: genericImg(p.species, p.format), barcode: null, brand: p.brand, name: p.name, species: p.species, format: p.format || 'other', formDetail: p.form_detail,
  lifeStage: p.life_stage, protein: p.protein_g_100g, fat: p.fat_g_100g, fibre: p.fibre_g_100g, moisture: p.moisture_g_100g, ash: p.ash_g_100g, kcalPerKg: p.kcal_per_kg, calcium: p.calcium_g_100g, phosphorus: p.phosphorus_g_100g,
  kcalPerCup: p.kcal_per_cup, kcalPerUnit: p.kcal_per_unit, kcalUnit: p.kcal_unit, gramsPerCup: p.grams_per_cup,
  // price is CAD from Canadian retailers only; other foods show no price rather than a guess
  pricePerKg: p.price_per_kg_cad_min ?? null, markets: p.markets || [], madeIn: p.made_in || null, grainFree: p.grain_free, proteinSources: p.protein_sources || [], productLine: p.product_line,
  photo: p.image_type === 'packshot' ? p.image_url : null, buyUrl: p.buy_url, buyType: p.buy_url_type, buyRetailer: p.buy_retailer, ingredients: p.ingredients || [],
  extras: [p.probiotics && 'probiotics', p.glucosamine_chondroitin && 'glucosamine', p.collagen_added && 'collagen', p.omega3_source && 'omega3'].filter(Boolean),
  source: `${p.brand} ${p.label_country} label (check it matches your bag)`, credit: p.attribution, url: p.source_url, partialIngredients: p.ingredients_partial, ...NONE,
});
const fromTreat = (p) => ({ ...fromCatalog(p), isTreat: true, treatType: p.treat_type, kcalPerTreat: p.kcal_per_treat, kcalPerTreatUnit: p.kcal_per_treat_unit, gramsPerTreat: p.grams_per_treat,
  treatFeedingText: p.treat_feeding_text, treatBands: Array.isArray(p.treat_feeding_bands) ? p.treat_feeding_bands : [], completeAndBalanced: p.complete_and_balanced, vohc: !!p.vohc_seal });
const fromSupplement = (p) => ({
  id: p.id.replace(/-/g, '_'), isSupplement: true, brand: p.brand, name: p.name, species: p.species, speciesAll: p.species_all || null, speciesUnknown: (p.qa_flags || []).includes('species_unknown'),
  type: p.supplement_type, form: p.supplement_form, servingSize: p.serving_size, dosingText: p.dosing_text, dosingBands: Array.isArray(p.dosing_bands) ? p.dosing_bands : [], claim: p.label_claim_text,
  actives: Array.isArray(p.active_ingredients) ? p.active_ingredients : [], ingredients: p.ingredients || [], partialIngredients: p.ingredients_partial, kcalPerServing: p.kcal_per_serving, kcalPerServingUnit: p.kcal_per_serving_unit,
  vetOnly: !!p.vet_only, nasc: !!p.nasc_seal, cfu: p.probiotic_cfu, img: p.image_url || null, photo: p.image_url || null,
  buyUrl: p.buy_url_us || p.buy_url, buyType: p.buy_url_us ? p.buy_url_us_type : p.buy_url_type, buyRetailer: p.buy_url_us ? p.buy_retailer_us : p.buy_retailer, sourceUrl: p.source_url, credit: p.attribution, markets: p.markets || [],
});
// Open Pet Food Facts rows are crowd-sourced and their nutrient numbers are often wrong (per serving, mistyped), so they are used
// for barcode lookup only (name, brand, ingredients, picture) and never for ranking or fit.
const fromOpff = (p) => {
  const ok = false; const kg = () => null;
  const species = p.species === 'both' ? 'dog' : p.species;
  return {
    id: `opff_${p.code}`, img: p.image_url || genericImg(species, 'dry'), barcode: p.code, brand: p.brand || 'Unknown brand', name: p.name, species, format: 'other', lifeStage: 'unknown',
    protein: kg(p.protein_100g), fat: kg(p.fat_100g), fibre: kg(p.fibre_100g), moisture: kg(p.moisture_100g), kcalPerKg: null,
    calcium: kg(p.calcium_100g), phosphorus: kg(p.phosphorus_100g), pricePerKg: null, ingredients: guess(p.ingredients_text), extras: [],
    source: 'Open Pet Food Facts (community data, verify on the bag)', credit: 'Open Pet Food Facts, ODbL', unreliable: !ok, ...NONE,
  };
};
const pub = async (schema, path) => {
  const out = [];
  for (let from = 0; ; from += 1000) { // PostgREST returns at most 1000 rows a request, so the catalogue is read a page at a time
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Accept-Profile': schema, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`${schema}.${path}: ${r.status}`);
    const rows = await r.json(); out.push(...rows);
    if (rows.length < 1000) return out;
  }
};
let liveFoods = null; // null = could not load (offline): the invented sample foods are shown instead
let liveSupplements = []; // supplements, once they are in the catalogue (product_type = 'supplement'); empty until then
let liveTreats = []; // dog treats, chews and lickables (product_type = 'treat'); empty when they could not load
async function loadFoods() {
  if (!SUPABASE_URL) return;
  const cols = 'id,brand,name,species,format,form_detail,life_stage,kcal_per_kg,kcal_per_cup,kcal_per_unit,kcal_unit,grams_per_cup,protein_g_100g,fat_g_100g,fibre_g_100g,moisture_g_100g,ash_g_100g,calcium_g_100g,phosphorus_g_100g,ingredients,ingredients_partial,protein_sources,grain_free,probiotics,glucosamine_chondroitin,collagen_added,omega3_source,markets,made_in,product_line,price_per_kg_cad_min,buy_url,buy_url_type,buy_retailer,image_url,image_type,label_country,source_url,attribution';
  // foods only (treats live in the same table, product_type = 'treat'), not retired, not prescription; unknown life stage is kept (the fit check flags it); a food needs an ingredient list (allergy matching) and protein and fat. Calories may be blank: those foods show "calories not reported".
  const cat = await pub('catalog', `products?select=${cols}&product_type=eq.food&retired=is.false&prescription=is.false&protein_g_100g=not.is.null&fat_g_100g=not.is.null&ingredients=not.eq.{}&order=name,id`);
  liveFoods = cat.map(fromCatalog);
  // the maker's own feeding table (per weight band), parsed from the label; only some foods have one
  const gcols = 'product_id,weight_label,weight_kg_min,weight_kg_max,amount_min,amount_max,unit,grams_per_day_min,grams_per_day_max,kcal_per_day_mid,source_url';
  const guides = await pub('catalog', `feeding_guides?select=${gcols}&order=product_id,weight_kg_max`).catch(() => []);
  const byId = new Map();
  for (const g of guides) { const k = g.product_id.replace(/-/g, '_'); (byId.get(k) || byId.set(k, []).get(k)).push(g); }
  for (const f of liveFoods) f.guide = byId.get(f.id) || [];
  // Treats live in the same table. They stay retired = true in the database so older versions of the app, whose food query has no
  // product_type filter, never list them as foods; this query asks for them by type and ignores `retired`.
  try {
    const tcols = `${cols},treat_type,kcal_per_treat,kcal_per_treat_unit,grams_per_treat,treat_feeding_text,treat_feeding_bands,complete_and_balanced,vohc_seal`;
    liveTreats = (await pub('catalog', `products?select=${tcols}&product_type=eq.treat&prescription=is.false&order=name,id`)).map(fromTreat);
  } catch (e) { console.warn('Treats unavailable.', e.message); liveTreats = []; }
  // Supplements (product_type = 'supplement'): label text only. Species can be unstated on the listing (qa flag species_unknown).
  try {
    const scols = 'id,brand,name,species,species_all,supplement_type,supplement_form,serving_size,dosing_text,dosing_bands,label_claim_text,active_ingredients,ingredients,ingredients_partial,kcal_per_serving,kcal_per_serving_unit,vet_only,nasc_seal,qa_flags,image_url,image_type,buy_url,buy_url_type,buy_retailer,buy_url_us,buy_url_us_type,buy_retailer_us,price_cad_min,source_url,attribution,markets,probiotic_cfu';
    liveSupplements = (await pub('catalog', `products?select=${scols}&product_type=eq.supplement&order=name,id`)).map(fromSupplement);
  } catch (e) { liveSupplements = []; }
}
// Account data and the food catalogue load side by side, so the app waits for the slower one, not both. If either is slow or down
// the app still opens (from this browser's saved data and the sample foods) instead of staying blank.
await Promise.all([
  hydrate().catch((e) => { console.warn('Supabase unavailable, using this browser only.', e.message); online = false; }),
  loadFoods().catch((e) => console.warn('Foods unavailable, showing sample foods.', e.message)),
]);
export const STORE_ONLINE = online;

// Owner ratings come from published reviews; a food with none shows "no reviews yet", never an invented score.
const statsFor = (foodId) => {
  const rs = listReviews(foodId).filter((r) => !REVIEWS.includes(r));
  if (!rs.length) return NONE;
  const pct = (k) => Math.round((100 * rs.filter((r) => r[k]).length) / rs.length);
  return { rating: Math.round((10 * rs.reduce((a, r) => a + r.stars, 0)) / rs.length) / 10, reviews: rs.length, rebuy: pct('rebuy'), subscribe: pct('subscribe') };
};
// Prices in the catalogue are Canadian dollars, so owners in the US see no price rather than a wrong one.
const withStats = (f) => { const g = liveFoods ? { ...f, ...statsFor(f.id) } : f; return getRegion() === 'US' ? { ...g, pricePerKg: null } : g; };
export const STORE_FOODS_LIVE = !!liveFoods;
// ---------- diet log: what the pet eats, with dates ----------
// function declarations (not const arrows): the startup load below runs before the lines that define consts, so these must already exist
function fromDiet(r) { return { id: r.id, foodId: r.food_id, foodName: r.food_name, role: r.role, amount: Number(r.amount), unit: r.unit, timesPerDay: Number(r.times_per_day), startedOn: r.started_on, endedOn: r.ended_on, replacedId: r.replaced_id, note: r.note, ...(r.kcal_per_kg ? { kcalPerKg: Number(r.kcal_per_kg) } : {}), ...(r.kcal_per_unit ? { kcalPerUnit: Number(r.kcal_per_unit) } : {}), ...(r.recipe ? { recipe: r.recipe } : {}) }; }
function toDiet(it) { return { id: it.id, pet_id: petId, food_id: it.foodId || null, food_name: it.foodName, role: it.role || 'main', amount: it.amount, unit: it.unit || 'g', times_per_day: it.timesPerDay, started_on: it.startedOn, ended_on: it.endedOn || null, replaced_id: it.replacedId || null, note: it.note || null, ...(it.kcalPerKg ? { kcal_per_kg: it.kcalPerKg } : {}), ...(it.kcalPerUnit ? { kcal_per_unit: it.kcalPerUnit } : {}), ...(it.recipe ? { recipe: it.recipe } : {}) }; } // kcal_per_kg, kcal_per_unit and recipe are only sent when set, so a database without those columns still saves normal foods
function newId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`; }
export const getDiet = () => (isSignedIn() ? mem.pet?.diet || [] : []);
// One call for every kind of change on one day: stop some foods (by id), start others. A start can say which stop it replaces.
//   changeDiet({ date, stops: [id, ...], starts: [{ foodName, foodId?, role?, amount, unit, timesPerDay, replacesId?, note? }, ...] })
export async function changeDiet({ date, stops = [], starts = [] }) {
  const pet = mem.pet; if (!pet) return { ok: false, message: 'No pet yet.' };
  // calc checks the change and returns the rows to save; the ids are made here so a retry saves the same rows
  const r = await run('planDietChange', pet, { date, stops, starts, ids: starts.map(() => newId()), today: today() });
  if (!r.ok) return r;
  const { started: fresh, stopped } = r;
  pet.diet = r.diet; save();
  sync(async () => {
    if (!petId) return;
    for (const it of stopped) await api(`pet_diet_items?id=eq.${it.id}`, { method: 'PATCH', body: { ended_on: date } });
    if (fresh.length) await api('pet_diet_items', { method: 'POST', body: fresh.map(toDiet) });
  });
  return { ok: true, started: fresh.length, stopped: stopped.length };
}
// Add or correct the calories of a food already in the diet, in place (no new history entry): the calories are a fact about the food,
// not a change in what the pet eats. `kcal` is per 100 g when the item is measured in grams, otherwise per one unit (cup, can, piece...).
export async function setDietKcal(id, kcal) {
  const pet = mem.pet; const it = pet?.diet?.find((x) => x.id === id);
  if (!it) return { ok: false, message: 'That food is not in the diet.' };
  const r = await run('planDietKcal', it, kcal); if (!r.ok) return r;
  if (r.kcalPerKg != null) { it.kcalPerKg = r.kcalPerKg; delete it.kcalPerUnit; } else { it.kcalPerUnit = r.kcalPerUnit; delete it.kcalPerKg; }
  save();
  sync(async () => { if (petId) await api(`pet_diet_items?id=eq.${it.id}`, { method: 'PATCH', body: { kcal_per_kg: it.kcalPerKg ?? null, kcal_per_unit: it.kcalPerUnit ?? null } }); });
  return { ok: true };
}
// Undo a whole change day (a wrong entry): remove what started that day and bring back what stopped that day.
export async function undoDietChange(date) {
  const pet = mem.pet; if (!pet?.diet) return;
  const { removed, revived, diet } = await run('planUndo', pet.diet, date);
  pet.diet = diet; save();
  sync(async () => {
    if (!petId) return;
    for (const it of revived) await api(`pet_diet_items?id=eq.${it.id}`, { method: 'PATCH', body: { ended_on: null } });
    for (const it of removed) await api(`pet_diet_items?id=eq.${it.id}`, { method: 'DELETE' });
  });
}

// ---------- goals: fixed target dates and a dated history ----------
function addDays(iso, n) { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
// Goals saved before dates existed get a fixed date once, so they stop sliding.
function anchorLegacyGoal() {
  const pet = mem.pet; const g = pet?.goal; if (!g || g.targetDate) return;
  const startOn = g.startOn || pet.target?.setOn || today(); const days = Number(g.days) || Number(pet.target?.days) || 90;
  const before = (pet.logs || []).filter((l) => l.on <= startOn).sort((a, b) => (a.on < b.on ? 1 : -1))[0];
  pet.goal = { ...g, startOn, startKg: g.startKg ?? before?.kg ?? pet.weightKg, targetDate: addDays(startOn, days) };
  pet.target = { kg: pet.goal.targetKg, days, date: pet.goal.targetDate, setOn: startOn }; save();
  sync(async () => { if (petId) await api(`pets?id=eq.${petId}`, { method: 'PATCH', body: { goal: pet.goal, target: pet.target } }); });
}
const archiveRow = (h) => ({ type: h.type, start_on: h.startOn, start_kg: h.startKg, target_kg: h.targetKg, target_date: h.targetDate, ended_on: h.endedOn, end_kg: h.endKg ?? null, outcome: h.outcome });
export const getGoalHistory = () => (isSignedIn() ? mem.pet?.goalHistory || [] : []);
// Set the goal. `draft` = { type, targetKg, days (from today), custom?, fromChart?, kcalOverride? }.
// Same goal again keeps its original start and date. A change on the same day refines it quietly. A change on a later day
// archives the old goal in the history (with its dates and the weight at the time), then starts the new one today.
export async function setGoal(draft, { outcome = 'replaced' } = {}) {
  const pet = mem.pet; if (!pet || !draft || !['grow', 'lose', 'gain', 'maintain'].includes(draft.type) || !Number.isFinite(Number(draft.targetKg)) || !(Number(draft.targetKg) > 0)) return null;
  const t = today();
  const { goal, archived } = await run('planSetGoal', pet, { type: draft.type, targetKg: draft.targetKg, days: draft.days, custom: draft.custom, fromChart: draft.fromChart, kcalOverride: draft.kcalOverride, outcome, today: t });
  if (archived) {
    pet.goalHistory = [archived, ...(pet.goalHistory || [])].slice(0, 50);
    sync(async () => { if (petId) await api('pet_goals', { method: 'POST', body: { ...archiveRow(archived), pet_id: petId } }); });
  }
  pet.goal = goal; pet.target = { kg: goal.targetKg, days: goal.days, date: goal.targetDate, setOn: goal.startOn }; save();
  sync(async () => { if (petId) await api(`pets?id=eq.${petId}`, { method: 'PATCH', body: { goal: pet.goal, target: pet.target } }); });
  return pet.goal;
}
export async function clearGoal({ outcome = 'cleared' } = {}) {
  const pet = mem.pet; if (!pet?.goal) return;
  const { archived } = await run('planClearGoal', pet, { outcome, today: today() });
  if (archived) {
    pet.goalHistory = [archived, ...(pet.goalHistory || [])].slice(0, 50);
    sync(async () => { if (petId) await api('pet_goals', { method: 'POST', body: { ...archiveRow(archived), pet_id: petId } }); });
  }
  delete pet.goal; pet.target = null; save();
  sync(async () => { if (petId) await api(`pets?id=eq.${petId}`, { method: 'PATCH', body: { goal: null, target: null } }); });
}

export const listFoods = () => (liveFoods ? liveFoods.map(withStats) : FOODS.map((f) => ({ ...f, source: 'Sample data (offline)' })));
export const getFood = (id) => listFoods().find((f) => f.id === id) || null;
export const listTreats = () => liveTreats;
export const listSupplements = () => liveSupplements;
export const getTreat = (id) => liveTreats.find((t) => t.id === id) || null;
// Barcode lookup: the loaded foods first, then Open Pet Food Facts by code.
export async function findFoodByBarcode(code) {
  const c = String(code).trim(); if (!c) return null;
  const hit = listFoods().find((f) => f.barcode === c); if (hit) return hit;
  if (!SUPABASE_URL) return null;
  try {
    const [p] = await pub('opff', `products?select=*&code=eq.${encodeURIComponent(c)}&limit=1`);
    return p ? fromOpff(p) : null;
  } catch { return null; }
}

export const listReviews = (foodId) => {
  const mine = (mem.reviews || []).filter((r) => r.foodId === foodId);
  const others = remoteReviews.filter((r) => r.foodId === foodId && !(mine.length && r.uid === session?.uid));
  return [...mine, ...others, ...REVIEWS.filter((r) => r.foodId === foodId)];
};
// Real published owner reviews that have some text, newest first; empty until owners post.
export const listRecentReviews = (n = 3) => remoteReviews.filter((r) => r.text && r.text !== 'No comment.').slice(0, n);
export const addReview = (review) => {
  mem.reviews = [review, ...(mem.reviews || []).filter((r) => r.foodId !== review.foodId)]; save();
  const pet = mem.pet ? { ...mem.pet } : null;
  sync(async () => { await api('reviews?on_conflict=user_id,food_id', { method: 'POST', body: reviewRow(review, pet), prefer: 'resolution=merge-duplicates' }); });
};

export const getSaved = () => (isSignedIn() ? mem.saved || [] : []);
export const toggleSaved = (id) => {
  const s = new Set(mem.saved || []); const had = s.has(id);
  had ? s.delete(id) : s.add(id); mem.saved = [...s]; save();
  sync(async () => { if (had) await api(`saved_foods?food_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); else await api('saved_foods', { method: 'POST', body: { food_id: id }, prefer: 'resolution=ignore-duplicates' }); });
  return s.has(id);
};

// ---------- account: guest (anonymous) -> saved account, log in, sign out, delete ----------
// "Save my plan" adds an email to the guest user and confirms it with a 6-digit code, so the user id (and every pet,
// weigh-in and review) stays the same. "Log in" is for a returning owner on a new device. Sign in with email and password.
const decodeJwt = (jwt) => { try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; } };
export const getAccount = () => {
  const c = session?.access_token ? decodeJwt(session.access_token) : {};
  const saved = !!c.email && c.is_anonymous === false;
  return { saved, signedIn: saved, email: saved ? c.email : null, online };
};
export const getProfile = () => profile;

const authReq = async (path, { method = 'POST', body, token } = {}) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method, signal: AbortSignal.timeout(12000),
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, code: data.error_code || data.code || null, data };
  } catch { return { ok: false, status: 0, code: 'network', data: {} }; }
};
// Plain-words errors for the sheets. `kind` lets the screen offer "log in instead" or "save your plan instead".
const ERRORS = {
  network: ['Could not reach the server. Check your connection and try again.', 'network'],
  email_exists: ['That email already has an account.', 'exists'],
  otp_disabled: ['We could not find an account with that email.', 'unknown'],
  otp_expired: ['That code is wrong or has expired. Check it, or send a new one.', 'code'],
  over_email_send_rate_limit: ['Too many emails just now. Please wait a minute and try again.', 'rate'],
  over_request_rate_limit: ['Too many tries. Please wait a minute and try again.', 'rate'],
  validation_failed: ['That does not look like an email address.', 'email'],
  invalid_credentials: ['That email and password do not match. Check them and try again.', 'credentials'],
  user_already_exists: ['That email already has an account. Log in instead.', 'exists'],
  same_password: ['Choose a password you have not used on this account before.', 'password'],
  weak_password: ['Choose a password with at least 8 characters.', 'password'],
  email_not_confirmed: ['Confirm your email first: we sent you a link.', 'confirm'],
  email_address_invalid: ['That does not look like an email address.', 'email'],
};
const failure = (r) => { const [message, kind] = ERRORS[r.code] || (r.status === 429 ? ERRORS.over_email_send_rate_limit : ['Something went wrong. Please try again.', 'other']); return { ok: false, message, kind }; };

// Email + password. Sign up returns a session straight away when email confirmation is off; otherwise the owner confirms by link first.
export async function signUpWithPassword(email, password) {
  const r = await authReq('signup', { body: { email, password } });
  if (!r.ok) return failure(r);
  if (r.data.access_token) { keep(r.data); return { ok: true }; }
  return { ok: false, kind: 'confirm', message: 'Almost there: we emailed you a link to confirm your address, then log in.' };
}
export async function logInWithPassword(email, password) {
  const r = await authReq('token?grant_type=password', { body: { email, password } });
  if (!r.ok) return failure(r);
  keep(r.data); return { ok: true };
}
// Forgot password: Supabase emails a link that signs the owner in and opens the "choose a new password" sheet.
export async function requestPasswordReset(email) {
  const r = await authReq(`recover?redirect_to=${encodeURIComponent(location.origin)}`, { body: { email } });
  return r.ok ? { ok: true } : failure(r); // same answer whether or not the email has an account
}
export async function setNewPassword(password) {
  const r = await authReq('user', { method: 'PUT', body: { password }, token: session?.access_token });
  return r.ok ? { ok: true } : failure(r);
}
const wipeDevice = () => { try { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(KEY); } catch { /* ignore */ } session = null; mem = { pets: [] }; };
export async function signOut() {
  if (session?.access_token) await authReq('logout', { token: session.access_token, body: {} });
  wipeDevice();
}
export async function deleteMyData() {
  try { await api('rpc/delete_my_account', { method: 'POST', body: {} }); } catch (e) { return { ok: false, message: 'Could not delete right now. Please try again.' }; }
  wipeDevice(); return { ok: true };
}
// Opt-in weigh-in reminders: the choice and when it was made are kept as a consent record.
export function setEmailReminders(on) {
  profile = { ...(profile || {}), email_reminders: !!on, reminders_consent_at: on ? new Date().toISOString() : (profile?.reminders_consent_at || null) };
  if (mem.pet) { mem.pet.remind = !!on; save(); }
  sync(async () => {
    await api('profiles?on_conflict=user_id', { method: 'POST', body: { email_reminders: !!on, ...(on ? { reminders_consent_at: profile.reminders_consent_at } : {}) }, prefer: 'resolution=merge-duplicates' });
    if (petId) await api(`pets?id=eq.${petId}`, { method: 'PATCH', body: { remind: !!on } });
  });
}

// ---------- region: US or Canada decides which foods are shown ----------
// Kept on the profile when signed in, and on this device for visitors. 'all' shows every market.
export const REGIONS = [['US', 'United States'], ['CA', 'Canada'], ['all', 'Anywhere']];
const REGION_KEY = 'pnm.region';
const guessRegion = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Whitehorse|Yellowknife|Iqaluit)/.test(tz) || /-CA$/i.test(navigator.language || '')) return 'CA';
  } catch { /* fall through */ }
  return 'US';
};
export const hasRegion = () => { try { return !!(profile?.region || localStorage.getItem(REGION_KEY)); } catch { return !!profile?.region; } };
export const getRegion = () => { try { return profile?.region || localStorage.getItem(REGION_KEY) || guessRegion(); } catch { return profile?.region || guessRegion(); } };
export function setRegion(r) {
  if (!REGIONS.some(([id]) => id === r)) return;
  try { localStorage.setItem(REGION_KEY, r); } catch { /* storage blocked */ }
  if (isSignedIn()) { profile = { ...(profile || {}), region: r }; sync(async () => { await api('profiles?on_conflict=user_id', { method: 'POST', body: { region: r }, prefer: 'resolution=merge-duplicates' }); }); }
}

// ---------- quick details for visitors who are not signed in ----------
// Lets a logged-out visitor see which foods fit without making a profile. Kept only in this tab (sessionStorage), never saved or sent.
const QUICK_KEY = 'pnm.quickPet';
export const peekQuickPet = () => { try { return JSON.parse(sessionStorage.getItem(QUICK_KEY)); } catch { return null; } };
export const getQuickPet = () => (isSignedIn() ? null : peekQuickPet());
export const setQuickPet = (p) => { try { if (p) sessionStorage.setItem(QUICK_KEY, JSON.stringify(p)); else sessionStorage.removeItem(QUICK_KEY); } catch { /* storage blocked */ } };
