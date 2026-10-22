-- Explicit table privileges, so a database built only from these migrations works (cloud projects add some by default, local ones do not).
-- Row-level security still decides which rows each user can touch.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.pets, public.weight_logs, public.saved_foods, public.reviews, public.profiles to authenticated;
grant select on public.reviews to anon;
