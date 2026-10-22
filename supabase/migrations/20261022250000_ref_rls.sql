-- The two reference tables added with the energy functions get row-level security and a public read policy, like every other ref table.
-- They were already read-only for anon and authenticated (select grant only); this makes the protection the same everywhere.
alter table ref.energy_plan_factors enable row level security;
alter table ref.activity_bands enable row level security;
do $$ begin create policy "public read" on ref.energy_plan_factors for select to anon, authenticated using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public read" on ref.activity_bands for select to anon, authenticated using (true); exception when duplicate_object then null; end $$;
