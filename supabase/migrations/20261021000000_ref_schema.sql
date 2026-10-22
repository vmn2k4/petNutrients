-- Reference / knowledge tables. Public read-only. Loaded by supabase/scripts/load_reference.py.
create schema if not exists ref;

create table ref.size_categories (
  id text primary key check (id in ('I','II','III','IV','V','VI')),
  adult_kg_min numeric,
  adult_kg_max numeric,
  size_group text not null check (size_group in ('small','medium','large')), -- Proposal: I-II small, III-IV medium, V-VI large
  source text not null
);

create table ref.breeds (
  breed_key text primary key,
  species text not null check (species in ('dog','cat')),
  display_name text not null,
  size_cat text references ref.size_categories(id),          -- dogs only
  adult_kg_min numeric,                                      -- dogs only
  adult_kg_max numeric,
  raw_weight_min numeric,                                    -- cats: unit NOT verified (looks like lb), kept raw
  raw_weight_max numeric,
  exercise_hours numeric,
  source text not null
);

create table ref.breed_aliases (
  alias text primary key,
  breed_key text not null references ref.breeds(breed_key) on delete cascade
);

create table ref.breed_conditions (
  breed_key text not null references ref.breeds(breed_key) on delete cascade,
  condition text not null,
  source text not null,
  primary key (breed_key, condition)
);

-- Dogs: Salt et al. 2017 empirical percentiles per size category. Cats: one curve, size_cat = 'all'.
-- All values are ESTIMATES and must be labelled so in the UI.
create table ref.growth_curves (
  species text not null check (species in ('dog','cat')),
  size_cat text not null,
  month int not null,
  p02 numeric, p09 numeric, p25 numeric, p50 numeric, p75 numeric, p91 numeric, p98 numeric,
  n_visits int,
  source text not null,
  primary key (species, size_cat, month)
);

create table ref.bcs_scores (
  species text not null check (species in ('dog','cat')),
  score int not null check (score between 1 and 9),
  label text not null,
  description text not null,
  pct_vs_ideal numeric,
  body_fat_min numeric,
  body_fat_max numeric,
  five_point_equiv numeric,
  calorie_guidance text,
  source text not null,
  primary key (species, score)
);

create table ref.energy_factors (
  id serial primary key,
  species text not null check (species in ('dog','cat','dog_cat')),
  status text not null,
  multiplier numeric,           -- times RER; null for the RER formulas themselves
  formula text not null,
  source text not null
);

create table ref.nutrient_profiles (
  standard text not null,       -- 'AAFCO-2014'; FEDIAF later
  species text not null check (species in ('dog','cat')),
  nutrient text not null,
  unit text not null,           -- per 1000 kcal ME
  growth_min numeric,
  adult_min numeric,
  max_value numeric,
  max_large_breed_puppy numeric,
  ratio_growth text,
  ratio_adult text,
  ratio_max text,
  not_determined boolean not null default false,   -- source says "ND"
  source text not null,
  primary key (standard, species, nutrient)
);

create table ref.toxins (
  id text primary key,
  source text not null,         -- 'biovet' | 'aspca'
  category text not null,
  names_en text[] not null,
  dog_verdict text check (dog_verdict in ('safe','caution','danger','avoid')),
  cat_verdict text check (cat_verdict in ('safe','caution','danger','avoid')),
  toxin text,
  toxic_dose text,
  notes_en text,
  evidence text,
  source_urls text[],
  attribution text not null
);

create table ref.toxin_terms (
  toxin_id text not null references ref.toxins(id) on delete cascade,
  term text not null,
  primary key (toxin_id, term)
);
create index on ref.toxin_terms (term);

create table ref.allergen_groups (
  key text primary key,
  label text not null
);
create table ref.allergen_terms (
  group_key text not null references ref.allergen_groups(key) on delete cascade,
  term text not null,
  primary key (group_key, term)
);

-- Read-only for everyone.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'ref' loop
    execute format('alter table ref.%I enable row level security', t);
    execute format('create policy "public read" on ref.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
grant usage on schema ref to anon, authenticated;
grant select on all tables in schema ref to anon, authenticated;
