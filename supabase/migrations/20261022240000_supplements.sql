-- Supplements (dog and cat) live in catalog.products next to foods and treats, told apart by product_type = 'supplement'.
-- Additive: every new column is nullable and holds label text only, nothing estimated. Source: data/canada_catalog (proposed_migration.sql).
alter table catalog.products
  add column if not exists species_all text[],            -- every species named on the label or listing (dog, cat); species = the first
  add column if not exists supplement_type text,          -- joint | probiotic/digestive | fish oil/omega | skin & coat | calming | urinary | dental | multivitamin | liver/kidney | immune | hairball | other
  add column if not exists supplement_form text,          -- chew | powder | liquid | capsule | tablet | paste
  add column if not exists active_ingredients jsonb,      -- [{name, amount, unit}] per serving as printed
  add column if not exists serving_size text,
  add column if not exists kcal_per_serving numeric,
  add column if not exists kcal_per_serving_unit text,
  add column if not exists dosing_text text,
  add column if not exists dosing_bands jsonb,            -- [{weight_kg_min, weight_kg_max, amount, unit, raw}]
  add column if not exists nasc_seal boolean,             -- true only when the NASC seal is stated
  add column if not exists vet_only boolean,
  add column if not exists label_claim_text text;         -- verbatim label claim, not a health claim by us

-- allow the third product type (the check was created without a name by the treats migration)
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'catalog.products'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%product_type%' loop
    execute format('alter table catalog.products drop constraint %I', c);
  end loop;
end $$;
alter table catalog.products add constraint products_product_type_check check (product_type in ('food','treat','supplement'));
create index if not exists products_supplement_type_idx on catalog.products (supplement_type) where product_type = 'supplement';
notify pgrst, 'reload schema';
