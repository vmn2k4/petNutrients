-- Dog treats (chews, biscuits, jerky, lickables) live in catalog.products next to foods, told apart by product_type.
-- Additive only: every existing row becomes product_type = 'food'. The app's food queries must filter product_type = 'food'.
alter table catalog.products
  add column if not exists product_type text not null default 'food' check (product_type in ('food','treat')),
  add column if not exists treat_type text check (treat_type in ('biscuit','jerky','dental chew','soft chew','freeze-dried','lickable/puree','long-lasting chew','training treat','other')),
  add column if not exists kcal_per_treat numeric,          -- kcal per piece/tube/stick as labelled
  add column if not exists kcal_per_treat_unit text,
  add column if not exists grams_per_treat numeric,
  add column if not exists grams_per_treat_source text check (grams_per_treat_source in ('label_stated','derived_kcal_treat_over_kcal_kg')),
  add column if not exists kcal_per_kg_source text,         -- label | converted_from_kcal_per_lb
  add column if not exists treat_feeding_text text,         -- label daily-limit sentence
  add column if not exists treat_feeding_bands jsonb,       -- [{weight_kg_min, weight_kg_max, max_treats_per_day, raw}]
  add column if not exists complete_and_balanced boolean,   -- false = intermittent or supplemental feeding only
  add column if not exists vohc_seal boolean;
create index if not exists products_type_idx on catalog.products (product_type, species);
notify pgrst, 'reload schema';
