-- Food data. `catalog` is our own curated compilation; `opff` holds Open Pet Food Facts rows untouched (ODbL, credit required)
-- and is kept in its own schema so the share-alike terms never reach our catalogue or scoring.
create schema if not exists catalog;
create schema if not exists opff;

create table catalog.products (
  id text primary key,
  source text not null,                       -- 'hills_uk' for now
  brand text not null,
  name text not null,
  species text not null check (species in ('dog','cat')),
  format text check (format in ('dry','wet','other')),
  life_stage text not null default 'unknown' check (life_stage in ('growth','adult','all','unknown')),
  prescription boolean not null default false, -- therapeutic diets: shown only as "ask your vet"
  kcal_per_kg numeric,
  protein numeric, fat numeric, fibre numeric, moisture numeric,   -- guaranteed analysis, % as fed
  calcium numeric, phosphorus numeric,                              -- NULL = not reported (never 0)
  ingredients text[] not null default '{}',
  ingredients_partial boolean not null default true,
  label_country text not null,
  source_url text,
  attribution text not null
);
create index on catalog.products (species, prescription);

create table opff.products (
  code text primary key,                      -- barcode
  name text not null,
  brand text,
  species text check (species in ('dog','cat','both')),
  categories text,
  ingredients_text text,
  kcal_100g numeric, protein_100g numeric, fat_100g numeric, fibre_100g numeric,
  moisture_100g numeric, calcium_100g numeric, phosphorus_100g numeric,
  nutrients_plausible boolean not null default false,   -- kcal consistent with protein and fat; otherwise treat nutrients as unreliable
  image_url text,
  countries text
);
create index on opff.products (species) where nutrients_plausible;

do $$
declare s text; t text;
begin
  foreach s in array array['catalog','opff'] loop
    for t in select tablename from pg_tables where schemaname = s loop
      execute format('alter table %I.%I enable row level security', s, t);
      execute format('create policy "public read" on %I.%I for select to anon, authenticated using (true)', s, t);
    end loop;
    execute format('grant usage on schema %I to anon, authenticated', s);
    execute format('grant select on all tables in schema %I to anon, authenticated', s);
  end loop;
end $$;
