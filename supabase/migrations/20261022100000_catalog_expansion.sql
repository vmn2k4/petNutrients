-- Catalogue expansion: Canada + US products, buy offers and parsed feeding guides (from data/canada_catalog, see DATA_GUIDE.md).
-- Only adds nullable columns and tables; existing Hill's UK rows stay and are retired with a flag, never deleted (user references use the ids).

create table if not exists catalog.offers (
  id bigserial primary key,
  product_id text not null references catalog.products(id) on delete cascade,
  retailer text not null,
  url text not null,
  price_cad numeric,
  size text,
  size_kg numeric,
  price_per_kg_cad numeric,
  fetched_at timestamptz,
  match_method text,     -- same_page | same_title_other_size | fuzzy_title | manufacturer_store
  match_score numeric
);
create index if not exists offers_product_idx on catalog.offers (product_id);

-- Allow the new formats and keep the old ones. format stays dry|wet|other (freeze-dried/raw/air-dried land in 'other');
-- the precise form goes in form_detail.
alter table catalog.products
  add column if not exists region text,                       -- market the label/offer applies to; 'CA' for this catalogue
  add column if not exists product_line text,
  add column if not exists form_detail text check (form_detail in ('dry','wet','freeze-dried','raw','other')),
  add column if not exists life_stage_label text,            -- as written on the label/title (puppy, senior, indoor ...)
  add column if not exists aafco_statement text,
  add column if not exists breed_size text,
  add column if not exists ash numeric,                      -- % as fed, NULL = not reported
  add column if not exists guaranteed_analysis jsonb not null default '{}'::jsonb,  -- {"taurine":{"value":0.2,"unit":"%","basis":"min","label":"Taurine"}, ...}
  add column if not exists kcal_per_cup numeric,
  add column if not exists kcal_per_unit numeric,            -- per can / pouch / tetra as labelled
  add column if not exists kcal_unit text,
  add column if not exists kcal_per_kg_derived boolean not null default false, -- true when computed from kcal/cup and stated cup weight
  add column if not exists kcal_text text,                   -- the label sentence the numbers came from
  add column if not exists ingredients_text text,
  add column if not exists first_ingredient text,
  add column if not exists protein_sources text[] not null default '{}',
  add column if not exists package_sizes text[] not null default '{}',
  add column if not exists price_cad_min numeric,
  add column if not exists price_cad_max numeric,
  add column if not exists price_per_kg_cad_min numeric,
  add column if not exists purchase_url text,
  add column if not exists availability_retailers text[] not null default '{}',
  add column if not exists made_in text,                     -- ISO country, only when stated
  add column if not exists made_in_evidence text,
  add column if not exists canadian_made boolean,
  add column if not exists canadian_owned_claim text,
  add column if not exists upc text,
  add column if not exists organic_certified boolean,
  add column if not exists organic_cert_body text,
  add column if not exists organic_ingredients boolean,
  add column if not exists grain_free boolean,
  add column if not exists collagen_added boolean,
  add column if not exists prebiotics boolean,
  add column if not exists probiotics boolean,
  add column if not exists probiotic_strains text,
  add column if not exists probiotic_cfu text,
  add column if not exists glucosamine_chondroitin boolean,
  add column if not exists omega3_source text,
  add column if not exists limited_ingredient boolean,
  add column if not exists human_grade_claim boolean,
  add column if not exists no_by_products boolean,
  add column if not exists flag_evidence jsonb not null default '{}'::jsonb,
  add column if not exists feeding_guide_text text,
  add column if not exists qa_flags text[] not null default '{}',
  add column if not exists fetched_at timestamptz;

-- ===== per-100 g AS-FED nutrient / energy columns (added 2026-10-21, DRAFT) =====
-- Label % == g per 100 g as fed. GA values are guarantees (min or max), not typicals; *_basis holds 'min'/'max' when the label says so.
alter table catalog.products
  add column if not exists protein_g_100g numeric, add column if not exists fat_g_100g numeric, add column if not exists fibre_g_100g numeric,
  add column if not exists moisture_g_100g numeric, add column if not exists ash_g_100g numeric,
  add column if not exists calcium_g_100g numeric, add column if not exists phosphorus_g_100g numeric,
  add column if not exists protein_basis text, add column if not exists fat_basis text, add column if not exists fibre_basis text,
  add column if not exists moisture_basis text, add column if not exists ash_basis text, add column if not exists calcium_basis text,
  add column if not exists phosphorus_basis text,
  add column if not exists taurine_g_100g numeric, add column if not exists zinc_mg_100g numeric,
  add column if not exists omega3_g_100g numeric, add column if not exists omega6_g_100g numeric,
  add column if not exists dha_g_100g numeric, add column if not exists epa_g_100g numeric,
  add column if not exists magnesium_g_100g numeric, add column if not exists sodium_g_100g numeric,
  add column if not exists vitamin_e_iu_100g numeric, add column if not exists vitamin_a_iu_100g numeric,
  add column if not exists glucosamine_mg_100g numeric, add column if not exists chondroitin_mg_100g numeric,
  add column if not exists l_carnitine_mg_100g numeric, add column if not exists probiotic_cfu_100g numeric,
  add column if not exists ga_basis jsonb,          -- {"taurine_g_100g":"min",...} for the extra nutrients
  add column if not exists ga_units_raw jsonb,      -- original label unit per nutrient key, e.g. {"zinc":"mg/kg"}
  add column if not exists kcal_per_100g numeric,   -- kcal_per_kg / 10
  add column if not exists kcal_per_cup_source text check (kcal_per_cup_source in ('label','label_text_parsed')),
  add column if not exists grams_per_cup numeric,
  add column if not exists grams_per_cup_source text check (grams_per_cup_source in ('label_stated','derived_kcal_cup_over_kcal_kg')),
  add column if not exists unit_grams numeric,      -- grams per can/pouch/carton matching kcal_per_unit
  add column if not exists unit_grams_source text check (unit_grams_source in ('label_unit_name','label_text_parsed','derived_kcal_unit_over_kcal_kg')),
  add column if not exists protein_g_100g_dm numeric, add column if not exists fat_g_100g_dm numeric, add column if not exists fibre_g_100g_dm numeric,
  add column if not exists ash_g_100g_dm numeric, add column if not exists calcium_g_100g_dm numeric, add column if not exists phosphorus_g_100g_dm numeric,
  add column if not exists kcal_per_100g_dm numeric; -- value / (1 - moisture/100), only when moisture known

-- ===== buy links (DRAFT) =====
alter table catalog.products
  add column if not exists buy_url text,       -- best single link: product page > brand shop > search
  add column if not exists buy_url_type text check (buy_url_type in ('product','brand_shop','search','where_to_buy')),
  add column if not exists buy_retailer text;
alter table catalog.offers add column if not exists link_type text check (link_type in ('product','search','where_to_buy'));  -- search/where_to_buy rows are NOT product pages

-- ===== CA + US expansion (DRAFT) =====
-- region is kept for back-compat and now equals label_country (the country of the label the GA came from). Use markets for availability.
alter table catalog.products
  add column if not exists markets text[] not null default '{}',     -- {'CA'}, {'US'} or {'CA','US'}
  add column if not exists markets_evidence text,
  add column if not exists variant_group text,                       -- links CA/US rows of the same product whose labels differ
  add column if not exists buy_url_ca text, add column if not exists buy_url_ca_type text check (buy_url_ca_type in ('product','brand_shop','search','where_to_buy')),
  add column if not exists buy_retailer_ca text,
  add column if not exists buy_url_us text, add column if not exists buy_url_us_type text check (buy_url_us_type in ('product','brand_shop','search','where_to_buy')),
  add column if not exists buy_retailer_us text,
  add column if not exists image_url text,                           -- third-party copyrighted image URL; use per brand/retailer terms
  add column if not exists image_source text,
  add column if not exists image_type text check (image_type in ('packshot','other'));
create index if not exists products_markets_idx on catalog.products using gin (markets);
alter table catalog.offers
  add column if not exists country text check (country in ('CA','US')),
  add column if not exists price numeric,                            -- in local currency
  add column if not exists currency text check (currency in ('CAD','USD'));

alter table catalog.products add column if not exists retired boolean not null default false;  -- retired rows are hidden from the app but keep their id
update catalog.products set retired = true where source = 'hills_uk';
-- existing Hill's UK rows from load_foods.py are UK labels
update catalog.products set region = 'GB' where source = 'hills_uk' and region is null;

create index if not exists products_region_species_idx on catalog.products (region, species, format);

create table if not exists catalog.feeding_guides (
  id bigserial primary key,
  product_id text not null references catalog.products(id) on delete cascade,
  weight_label text not null,          -- as written, e.g. '10-20 lbs'
  weight_kg_min numeric,               -- NULL for 'up to X'
  weight_kg_max numeric,               -- NULL for 'over X'
  amount_min numeric,
  amount_max numeric,
  unit text check (unit in ('cup','g','can','pouch','pack','carton','patty')),  -- per day
  grams_per_day_min numeric,
  grams_per_day_max numeric,
  grams_basis text,                    -- how grams were obtained (stated grams / cups x grams_per_cup(source) / units x unit_grams(source))
  kcal_per_day_mid numeric,
  qa_flag text,                        -- set when kcal/day mid is outside 0.5x-3x of 70*kg^0.75*1.6
  raw_text text,
  source_url text
);
create index if not exists feeding_guides_product_idx on catalog.feeding_guides (product_id);

alter table catalog.offers enable row level security;
alter table catalog.feeding_guides enable row level security;
create policy "public read" on catalog.offers for select to anon, authenticated using (true);
create policy "public read" on catalog.feeding_guides for select to anon, authenticated using (true);
grant select on catalog.offers, catalog.feeding_guides to anon, authenticated;

create index if not exists products_ingredients_idx on catalog.products using gin (ingredients);
create index if not exists products_protein_sources_idx on catalog.products using gin (protein_sources);
