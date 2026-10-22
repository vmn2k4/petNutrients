# Database design: analysis from how the frontend uses data

Date: 2026-10-21. Inputs: `data/DATA_GUIDE.md`, `data/USER_FLOW.md`, and the prototype (`store.js`, `domain.js`, `mock-data.js`, `reference-data.js`, `screens/*`). Anything marked Proposal is a decision, not a fact.

## 1. What the frontend actually does with data

| Screen | Reads | Writes | Shape / frequency |
|---|---|---|---|
| Wizard (3 steps) | breed list (184 dogs) | one pet | Anonymous. No account needed. |
| My pet: Overview, Growth, Profile | growth percentiles, AAFCO targets, breed info, BCS text | weigh-ins, goal/target, skips, reminder opt-in, profile edits | One pet, read on every page, small writes. |
| Foods browser | whole food list for a species, filtered client side; per-food rating, review count, rebuy %, subscribe % | none | Read-heavy, list view needs aggregates for every row. |
| Food detail | one food, its reviews | review, saved toggle | Single row plus child rows. |
| Scan | one food by barcode | none | Exact lookup, must fall through to Open Pet Food Facts. |
| Tools (recipe checker, toxic foods) | ingredient library, toxin list | none | Static reference data. |

Findings that change the schema:

1. **Reference data is small and static.** `reference-data.js` is 42 KB: 6 dog size curves x 36 months, one cat curve, 184 breeds, AAFCO rows. It should be public read-only tables, fetched once and cached. Do not make one request per page.
2. **The pet object is the main write path.** Fields in use: species, name, breed, sizeCat, birth, sex, neutered, weightKg, bcs, activity, allergies[], health[], answered{}, logs[], goal{}, target{}, skips[], remind.
   - `answered{}` exists only to say "did the owner answer this yet". Nullable columns (neutered, bcs, activity) replace it, so no extra field is needed.
   - `logs[]` becomes `weight_logs`; `skips[]` becomes `weigh_in_skips`.
3. **"No account to start" means anonymous auth.** Use Supabase anonymous sign-in. The pet is saved under that user id. The magic-link step later upgrades the same user (`updateUser({email})`), so nothing has to be migrated.
4. **Foods are filtered and ranked by per-1000-kcal values** (`foodFit`, `NUTRIENTS`). Store these as generated columns so the Foods browser can filter and sort in SQL with indexes. Do not compute them per row in JS.
5. **Missing is NULL, never 0.** Calcium and phosphorus are null on some foods and the UI says "not reported". The Hill's file uses 0 for "not given". Convert those to NULL on import.
6. **Business rules are hard-coded in `domain.js`** (`TOXIC_TERMS`, `ALLERGY_TERMS`, `GOALS`, size cut-offs). `CLAUDE.md` says these must be data. They become tables (`toxins`, `toxin_terms`, `allergen_groups`).
7. **Reviews in the prototype are simpler than DATA_GUIDE section 7.3.** The prototype has: stars, liked (palatability), improved[], rebuy, subscribe, why-not text, free text, time fed. That matches the scope in `CLAUDE.md` (item 5). Build that table first and add stool/coat/allergy columns later.
   - The "pet" field is a string like "Large dog, 2 years". Store a snapshot instead (species, size_cat, age_months at review time) so "dogs like mine" works later.
8. **Computed targets should not be stored.** DATA_GUIDE's `nutrient_targets` table duplicates what a function returns from the pet plus `nutrient_profiles`. Skip it. Revisit for the vet PDF.

## 2. Data inventory: what goes in, what stays out

| Load now | Source | Size | Notes |
|---|---|---|---|
| Growth curves | `growth/salt2017_empirical_weight_by_sizecat_month.csv` | 216 rows | Dogs only. Label "estimate". CAT_GROWTH exists in the prototype but has no source file listed in the guide; confirm. |
| Breeds + aliases | `growth/breed_growth_index.csv`, `breeds/cat-breeds-details`, figshare aliases | ~250 | Needs an alias table. Cat weight unit unlabelled (looks like lb). |
| AAFCO profiles | `nutrient_profiles/aafco_*.csv` | 88 rows | Cells like "6.25 (4.5 for large-breed puppies)" and "1:1" must be split into numeric columns. |
| Energy factors, BCS | `energy_requirements_msd.csv`, `bcs/dog_bcs_1to9.csv` | 11 + 9 | |
| Toxins | `biovet/repo/data/items.json` (101) + ASPCA (29) | 130 | Attribution line required. |
| Ingredient nutrients | figshare map (40) -> USDA SR Legacy / CNF via NDB | ~126 foods | Join on NDB number, not on text. |
| Disease predispositions | `figshare_canine/dog_breed_diseases.csv` | 4,093 | Info only, per breed. |
| OPFF dog/cat | `opff/products.csv` | ~4,000 of 15,136 | Separate schema (ODbL). Skip the parquet duplicate and the Mongo dump. |

| Do not load | Why |
|---|---|
| `dog-breeds/` (AKC / TidyTuesday) | Not cleared for commercial use. |
| AAFCO Chapter 6 PDF | Copyright, no machine-readable use. |
| `Final_Data_PLOS.csv` (1.1 GB, 15M rows) | Only the derived percentile files are needed. |
| USDA Branded (3 GB) | Human foods, not needed. |
| OPFF rows with no nutrients and no ingredients (about 96%) | Unusable for fit scoring. Keep barcode + name only if scan needs it. |

**Gap to resolve first:** DATA_GUIDE describes `products.csv`, `prices_ca.csv`, `brands.csv`, `recalls.csv` and `videos.csv`, but none of them are in this repo. Only OPFF is. Until they are copied in, the only catalogue data here is the 8 invented sample foods in `mock-data.js`. Seed those with `is_sample = true` so they never appear in a real build.

## 3. Proposed structure (Proposal)

Schemas, because `CLAUDE.md` requires OPFF to be kept apart from our own data:

- `ref`: reference and knowledge tables. Public read-only.
- `catalog`: our brands, products, labels, prices, recalls, videos. Public read, writes by service role only.
- `opff`: Open Pet Food Facts rows, untouched, with credit. Public read.
- `public`: user data, protected by row-level security.

```
ref.species, ref.regions
ref.breeds(breed_key PK, species, display_name, size_cat, adult_kg_min, adult_kg_max, source)
ref.breed_aliases(alias PK, breed_key FK)
ref.breed_conditions(breed_key FK, condition)                 -- BREED_INFO.dis
ref.size_categories(id I..VI, min_kg, max_kg, group small|medium|large)
ref.growth_curves(species, size_cat, month, p02,p09,p25,p50,p75,p91,p98, is_estimate)
ref.bcs_scores(species, score, label, description, pct_vs_ideal, calorie_guidance)
ref.energy_factors(species, status, multiplier, source)
ref.nutrients(key PK, label, unit, on_label bool)             -- "only nutrients that exist on labels"
ref.nutrient_profiles(standard, species, stage, nutrient FK, min_value, max_value,
                      max_large_breed_puppy, ratio_text, source)   -- AAFCO now, FEDIAF later
ref.toxins(id, category, dog_verdict, cat_verdict, toxic_dose, evidence, source)
ref.toxin_terms(toxin_id FK, term)                            -- replaces TOXIC_TERMS
ref.allergen_groups(key PK) + ref.allergen_terms(key FK, term) -- replaces ALLERGY_TERMS
ref.ingredients(key PK, display_name, category)
ref.ingredient_nutrients(ingredient_key FK, nutrient FK, per_100g, source)   -- RECIPE_LIBRARY

catalog.brands(id, name, parent_company, hq_country, canadian_owned, ...)
catalog.products(id, brand_id, name, species, life_stage ENUM(growth,adult,all,unknown), format,
                 gtin UNIQUE NULL, kcal_per_kg, protein, fat, fibre, moisture, calcium, phosphorus,  -- all nullable
                 protein_per_1000kcal GENERATED, fat_per_1000kcal GENERATED, calcium_per_1000kcal GENERATED, ...,
                 ingredient_tokens text[] (GIN), extras text[] (GIN), label_country, verified, is_sample, image_url)
catalog.product_ingredients(product_id, position, raw_text, ingredient_key NULL)
catalog.product_labels(product_id, country, ...)               -- later: per-country formulas
catalog.retailers, catalog.product_availability(product_id, region, retailer_id, price, size_kg, price_per_kg, last_seen, source)
catalog.recalls(brand_id, product_id NULL, agency, date, title, reason, url)
catalog.videos(...)                                            -- later

opff.products(code PK, ... raw columns kept as imported)

public.pets(id, user_id, name, species, breed_key NULL, size_cat, birth_date, sex NULL, neutered NULL,
            bcs NULL, activity NULL, allergies text[], health text[], goal_type, target_kg, target_days,
            target_set_on, remind bool)
public.weight_logs(pet_id, measured_on, kg, bcs NULL)
public.weigh_in_skips(pet_id, skipped_on)
public.saved_foods(user_id, product_id)
public.reviews(id, user_id, pet_id, product_id, stars, palatability, improved text[], rebuy, subscribe,
               why_not text, body, weeks_fed, pet_species, pet_size_cat, pet_age_months,
               status DEFAULT 'pending', UNIQUE(pet_id, product_id))
public.product_review_stats  -- view: count, avg stars, rebuy %, subscribe %. Make it materialised if slow.
```

Row-level security: `pets`, `weight_logs`, `weigh_in_skips`, `saved_foods` readable and writable only by `auth.uid() = user_id`. `reviews` are public to read when `status = 'published'`, writable by their owner.

## 4. Server functions (shared by web and Flutter)

Per `CLAUDE.md`, the maths lives in Postgres. Each function takes plain parameters, not a pet id, so it works before the owner has saved or signed up:

- `energy_plan(species, weight_kg, bcs, neutered, activity, birth_date)`
- `nutrient_targets(species, stage, size_cat)`
- `growth_percentile(species, size_cat, age_months, kg)`
- `food_fit(product_id, pet params)` and `match_foods(pet params, filters)` for the Foods browser
- `lookup_barcode(code)` searches `catalog.products`, then `opff.products`, and returns a source flag

`packages/domain` keeps only the pure helpers for instant preview, and the Labrador case in DATA_GUIDE 4.3 becomes a shared golden test.

## 5. Build order

1. Reference tables plus loader scripts (growth, breeds, AAFCO, BCS, energy, toxins, allergens). Nothing user-facing breaks if these are wrong, and they are small.
2. `public` user tables with RLS, anonymous auth, and a `packages/data` module that keeps the same function names as `store.js`.
3. `catalog` and `opff` tables, sample seed, then real catalogue data once the missing CSVs are available.
4. Server functions with golden tests.
5. Reviews, saved foods, region and availability tables.
6. Deferred: moderation, review media/votes, affiliate programs, origin claims, per-country labels, recall alerts.

## 6. Open questions

- Where are `products.csv`, `prices_ca.csv`, `brands.csv`, `recalls.csv` and `videos.csv` from the guide? They are not in this repo.
- Source for `CAT_GROWTH` (kitten percentiles) used in the prototype.
- Should anonymous users be allowed to post reviews, or only after the magic-link step?
- Are unit conversions (kg/lb) display-only? This design stores kg everywhere.
