-- DRAFT, NOT APPLIED. Needed before loading products.jsonl after the kcal fill (kcal_fill_merge.py).
-- New *_source values (label_page, same_product_other_listing) and a per-value provenance column.
-- The inline check constraints from 20261022100000_catalog_expansion.sql have auto-generated names; drop whatever checks
-- exist on those columns, then add named ones that allow the new values.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'catalog.products'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%kcal_per_cup_source%' or pg_get_constraintdef(oid) like '%grams_per_cup_source%'
           or pg_get_constraintdef(oid) like '%unit_grams_source%')
  loop
    execute format('alter table catalog.products drop constraint %I', c.conname);
  end loop;
end $$;

alter table catalog.products
  add column if not exists kcal_per_kg_source text,
  add column if not exists kcal_fill jsonb;  -- [{field, value, source_url, fetched_at, method, evidence}] for every value the fill wrote

alter table catalog.products
  add constraint products_kcal_per_cup_source_chk check (kcal_per_cup_source is null or kcal_per_cup_source in
    ('label','label_text_parsed','label_page','same_product_other_listing')),
  add constraint products_grams_per_cup_source_chk check (grams_per_cup_source is null or grams_per_cup_source in
    ('label_stated','derived_kcal_cup_over_kcal_kg','same_product_other_listing')),
  add constraint products_unit_grams_source_chk check (unit_grams_source is null or unit_grams_source in
    ('label_unit_name','label_text_parsed','derived_kcal_unit_over_kcal_kg'));
-- kcal_per_kg_source (free text): label | converted_from_kcal_per_lb | label_page | same_product_other_listing
-- Also: load_canada_catalog.py must pass kcal_per_kg_source and kcal_fill through (kcal_fill as jsonb).
