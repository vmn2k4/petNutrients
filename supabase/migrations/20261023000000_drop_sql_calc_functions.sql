-- The calculations now live in one place, the `calc` edge function (supabase/functions/calc). These SQL copies were only checked against
-- the JavaScript for parity and nothing calls them, so they are removed rather than kept in step by hand.
drop function if exists public.goal_plan cascade;
drop function if exists public.energy_plan cascade;
drop function if exists public.pet_ideal_kg cascade;
drop function if exists public.adult_factor cascade;
