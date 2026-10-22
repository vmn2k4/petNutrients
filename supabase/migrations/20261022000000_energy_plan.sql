-- Daily energy (kcal) as a server function, so web and Flutter get identical results (CLAUDE.md: important logic lives server-side).
-- Mirrors prototype/js/domain.js energyPlan(); the shared test cases are supabase/golden/energy.json.
-- Factors are data, not code. Sources: AAHA 2021 Nutrition and Weight Management Guidelines, Box 1; rows marked "chosen" have no published source.

-- Minutes of walking or active play a day, asked on the profile.
alter table public.pets add column exercise_min int check (exercise_min between 0 and 600);

create table ref.energy_plan_factors (
  species text not null check (species in ('dog','cat')),
  key text not null check (key in ('neutered','intact','growth_young','growth','loss')),
  factor numeric not null check (factor > 0),
  source text not null,
  primary key (species, key)
);
insert into ref.energy_plan_factors values
  ('dog','neutered',     1.5, 'AAHA 2021 Box 1: neutered adult 1.4-1.6, midpoint'),
  ('dog','intact',       1.7, 'AAHA 2021 Box 1: intact adult 1.6-1.8, midpoint'),
  ('dog','growth_young', 3.0, 'AAHA 2021 Box 1: puppy under 4 months'),
  ('dog','growth',       2.0, 'AAHA 2021 Box 1: puppy 4 months to adult'),
  ('dog','loss',         1.0, 'AAHA 2021 Box 1: weight loss, RER at ideal weight'),
  ('cat','neutered',     1.3, 'AAHA 2021 Box 1: neutered adult 1.2-1.4, midpoint'),
  ('cat','intact',       1.5, 'AAHA 2021 Box 1: intact adult 1.4-1.6, midpoint'),
  ('cat','growth_young', 2.5, 'AAHA 2021 Box 1: kitten'),
  ('cat','growth',       2.5, 'AAHA 2021 Box 1: kitten'),
  ('cat','loss',         0.8, 'AAHA 2021 Box 1: weight loss, RER at ideal weight');

-- An activity band starts at min_minutes. factor NULL = use the neutered / intact factor (a typical pet).
create table ref.activity_bands (
  species text not null check (species in ('dog','cat')),
  band text not null check (band in ('low','normal','active','very')),
  min_minutes int not null,
  factor numeric,
  source text not null,
  primary key (species, band)
);
insert into ref.activity_bands values
  ('dog','low',    0,   1.1,  'AAHA 2021 Box 1: inactive / obese-prone 1.0-1.2, midpoint'),
  ('dog','normal', 30,  null, 'neutered / intact factor'),
  ('dog','active', 60,  1.8,  'chosen, inside AAHA light work 1.6-2.0'),
  ('dog','very',   120, 2.0,  'chosen, top of AAHA light work; above this needs a vet or nutritionist'),
  ('cat','low',    0,   1.0,  'AAHA 2021 Box 1: inactive / obese-prone 1.0'),
  ('cat','normal', 15,  null, 'neutered / intact factor'),
  ('cat','active', 30,  1.6,  'chosen, no published source');

grant usage on schema ref to anon, authenticated;
grant select on ref.energy_plan_factors, ref.activity_bands to anon, authenticated;

-- ---- helpers shared by energy_plan and goal_plan (same rules as prototype/js/domain.js) ----

-- Ideal weight. A weigh-in carries over the body score from the last assessment, so the ideal is worked out from the weight at the
-- last assessment: the first log of the latest run of logs that share the current body score. p_logs = [{"on":"2026-10-01","kg":35,"bcs":7}].
create function public.pet_ideal_kg(p_weight_kg numeric, p_bcs int, p_logs jsonb default '[]')
returns numeric language plpgsql immutable as $$
declare v_bcs int := coalesce(p_bcs, 5); v_anchor numeric; r record; v_run boolean := true;
begin
  if v_bcs <= 5 then return p_weight_kg; end if;
  -- walk the logs newest first while their body score equals the current one; the oldest log of that run is the anchor
  for r in select (l->>'kg')::numeric as kg, (l->>'bcs')::int as bcs
           from jsonb_array_elements(coalesce(p_logs, '[]'::jsonb)) l order by l->>'on' desc loop
    exit when r.bcs is distinct from v_bcs;
    v_anchor := r.kg;
  end loop;
  return (case when v_anchor is not null and v_anchor > p_weight_kg then v_anchor else p_weight_kg end) / (1 + 0.1 * (v_bcs - 5));
end $$;

-- Adult multiplier: the activity band if it has its own factor, otherwise the neutered / intact factor.
create function public.adult_factor(p_species text, p_neutered boolean, p_exercise_min int, p_activity text default null)
returns numeric language plpgsql stable set search_path = public, ref as $$
declare v_band text; v_f numeric;
begin
  if p_exercise_min is not null then
    select band, factor into v_band, v_f from activity_bands where species = p_species and min_minutes <= p_exercise_min order by min_minutes desc limit 1;
  else
    v_band := case p_activity when 'low' then 'low' when 'high' then 'active' else 'normal' end;
    select factor into v_f from activity_bands where species = p_species and band = v_band;
  end if;
  return coalesce(v_f, (select factor from energy_plan_factors where species = p_species and key = case when coalesce(p_neutered, true) then 'neutered' else 'intact' end));
end $$;

create function public.energy_plan(
  p_species text, p_weight_kg numeric, p_bcs int, p_neutered boolean, p_exercise_min int,
  p_birth date, p_size_cat text default 'IV', p_activity text default null, p_on date default current_date, p_logs jsonb default '[]'
) returns jsonb language plpgsql stable set search_path = public, ref as $$
declare
  v_bcs int := coalesce(p_bcs, 5);
  v_months int := greatest(0, floor((p_on - p_birth) / 30.44));
  v_large boolean := p_species = 'dog' and p_size_cat in ('V','VI');
  v_stage text; v_ideal numeric; v_basis numeric; v_factor numeric; v_losing boolean := false; v_resting numeric;
begin
  if p_species not in ('dog','cat') or p_weight_kg is null or p_weight_kg <= 0 or p_birth is null then
    raise exception 'energy_plan needs species, a positive weight and a birth date';
  end if;
  v_stage := case when v_months < (case when v_large then 18 else 12 end) then 'growth' else 'adult' end;
  v_ideal := public.pet_ideal_kg(p_weight_kg, v_bcs, p_logs);
  v_basis := v_ideal;
  if v_stage = 'growth' then
    select factor into v_factor from energy_plan_factors
      where species = p_species and key = case when p_species = 'dog' and v_months < 4 then 'growth_young' else 'growth' end;
    v_basis := p_weight_kg;
  elsif v_bcs >= 6 then
    v_losing := true;
    select factor into v_factor from energy_plan_factors where species = p_species and key = 'loss';
  else
    v_factor := public.adult_factor(p_species, p_neutered, p_exercise_min, p_activity);
  end if;
  v_resting := 70 * power(v_basis, 0.75);
  return jsonb_build_object(
    'stage', v_stage, 'ideal_kg', round(v_ideal, 2), 'resting_kcal', round(v_resting, 1), 'factor', v_factor,
    'kcal', round(v_resting * v_factor, 1), 'floor_kcal', round(0.6 * 70 * power(v_ideal, 0.75), 1),
    'losing', v_losing,
    -- the growth-percentile hold (above the 98th percentile) is not in the database yet, so only body score is checked here
    'needs_vet', v_bcs <= 3 or v_bcs >= 7 and v_stage = 'growth'
  );
end $$;
grant execute on function public.pet_ideal_kg(numeric, int, jsonb), public.adult_factor(text, boolean, int, text),
  public.energy_plan(text, numeric, int, boolean, int, date, text, text, date, jsonb) to anon, authenticated;

-- ---- goal_plan: daily kcal for an adult weight goal (keep, lose or gain), same rules as goalPlan() in domain.js ----
-- Gain starts 10% above steady. Loss is the larger of the AAHA starting amount and the amount the owner's date implies, never above
-- steady. A saved goal (p_start_on given) is adjusted 5 to 10% from weigh-ins after 14 days, judged against the REALISTIC line,
-- not the owner's date. Growing pets (growth targets) are not covered here.
create function public.goal_plan(
  p_species text, p_weight_kg numeric, p_bcs int, p_neutered boolean, p_exercise_min int, p_birth date, p_size_cat text,
  p_activity text, p_logs jsonb, p_type text, p_target_kg numeric, p_days int,
  p_start_on date default null, p_start_kg numeric default null, p_target_date date default null, p_on date default current_date
) returns jsonb language plpgsql stable set search_path = public, ref as $$
declare
  v_bcs int := coalesce(p_bcs, 5);
  v_months int := greatest(0, floor((p_on - p_birth) / 30.44));
  v_adult_months int := case when p_species = 'dog' and p_size_cat in ('V','VI') then 18 else 12 end;
  v_gain_factor constant numeric := 1.1; v_kcal_per_kg constant numeric := 7700;
  v_ideal numeric := public.pet_ideal_kg(p_weight_kg, p_bcs, p_logs);
  v_factor numeric := public.adult_factor(p_species, p_neutered, p_exercise_min, p_activity);
  v_maint numeric := 70 * power(v_ideal, 0.75) * v_factor;
  v_d int; v_wt numeric := coalesce(p_target_kg, p_weight_kg); v_delta numeric; v_per_day numeric; v_aaha numeric := 0; v_aaha_min numeric;
  v_kcal numeric; v_floor numeric; v_est int; v_adj numeric; v_adj_text text;
  -- saved-goal progress
  v_since int; v_total int; v_plan_days numeric; v_rate numeric; v_start_kcal numeric; v_maint_start numeric; v_base numeric;
  v_planned numeric; v_tol numeric; v_ahead numeric; v_dir int; v_weekly numeric; v_has_log boolean; v_goal_delta numeric;
begin
  if p_type not in ('maintain','lose','gain') then raise exception 'goal_plan covers keep, lose and gain goals'; end if;
  if v_months < v_adult_months then
    raise exception 'goal_plan is for adults; growing pets use growth targets';
  end if;
  v_d := greatest(7, coalesce(case when p_target_date is not null then greatest(0, p_target_date - p_on) end, p_days, 90));
  if p_type = 'maintain' then return jsonb_build_object('kcal', round(v_maint), 'maintenance_kcal', round(v_maint, 1)); end if;

  v_delta := v_wt - p_weight_kg; v_per_day := v_delta * v_kcal_per_kg / v_d;
  if p_type = 'lose' then
    v_aaha := (select factor from energy_plan_factors where species = p_species and key = 'loss') * 70 * power(least(v_ideal, v_wt), 0.75);
    v_kcal := least(v_maint, greatest(v_aaha, v_maint + v_per_day));
  else
    v_kcal := v_maint * v_gain_factor;
  end if;
  v_floor := 0.6 * 70 * power(v_wt, 0.75);

  -- weigh-in adjustment on a saved goal
  if p_start_on is not null and p_target_date is not null and p_start_kg is not null then
    v_since := p_on - p_start_on;
    if v_since >= 14 then
      v_total := greatest(1, p_target_date - p_start_on); v_goal_delta := v_wt - p_start_kg;
      v_base := case when v_bcs > 5 then v_ideal else p_start_kg end;
      v_maint_start := 70 * power(v_base, 0.75) * v_factor;
      if p_type = 'gain' then v_start_kcal := v_maint_start * v_gain_factor;
      else v_start_kcal := least(v_maint_start, greatest(
        (select factor from energy_plan_factors where species = p_species and key = 'loss') * 70 * power(least(v_ideal, v_wt), 0.75),
        v_maint_start + v_goal_delta * v_kcal_per_kg / v_total)); end if;
      v_rate := abs(v_start_kcal - v_maint_start);
      v_plan_days := case when v_goal_delta <> 0 and v_rate > 0 then greatest(v_total, round(abs(v_goal_delta) * v_kcal_per_kg / v_rate)) else v_total end;
      select exists (select 1 from jsonb_array_elements(coalesce(p_logs, '[]'::jsonb)) l where (l->>'on')::date > p_start_on) into v_has_log;
      if v_has_log and v_since < v_plan_days and v_goal_delta <> 0 then
        v_planned := p_start_kg + v_goal_delta * (least(v_plan_days, v_since) / v_plan_days);
        v_tol := greatest(0.2, least(0.02 * p_start_kg, 0.1 * abs(v_goal_delta)));
        v_dir := sign(v_goal_delta); v_ahead := v_dir * (p_weight_kg - v_planned);
        v_weekly := ((p_start_kg - p_weight_kg) / p_start_kg / (v_since / 7.0)) * 100 * (case when p_type = 'lose' then 1 else -1 end);
        if p_type = 'lose' and v_weekly > 3 then v_adj := 0.05; v_adj_text := 'too_fast_loss_raise';
        elsif p_type = 'lose' and v_weekly > 2 then v_adj := 0; v_adj_text := 'fast_loss_note';
        elsif p_type = 'gain' and v_weekly > 2.5 then v_adj := -0.05; v_adj_text := 'too_fast_gain_lower';
        elsif v_ahead < -v_tol then
          v_adj := case when v_ahead < -2 * v_tol then 0.1 else 0.05 end * (case when p_type = 'gain' then 1 else -1 end);
          v_adj_text := 'behind_plan';
        elsif v_ahead > 2 * v_tol and p_type = 'gain' then v_adj := -0.05; v_adj_text := 'ahead_gain_lower';
        end if;
      end if;
    end if;
  end if;
  if v_adj is not null then v_kcal := v_kcal * (1 + v_adj); end if;

  if p_type = 'lose' then
    v_aaha_min := v_aaha * (case when v_adj < 0 then 1 + v_adj else 1 end);
    if v_kcal < v_aaha_min then v_kcal := v_aaha_min; end if;
    if v_kcal < v_floor then v_kcal := v_floor; end if;
    if v_maint + v_per_day < v_aaha and v_maint > v_aaha then v_est := round(abs(v_delta) * v_kcal_per_kg / (v_maint - v_aaha)); end if;
  else
    v_est := round(v_delta * v_kcal_per_kg / (v_maint * v_gain_factor - v_maint));
  end if;
  -- goals that are not advised for this body score show steady-weight calories
  if (p_type = 'gain' and v_bcs >= 6) or (p_type = 'lose' and (v_bcs <= 4 or v_wt < v_ideal * 0.9 - 0.05)) then v_kcal := v_maint; end if;

  return jsonb_build_object('kcal', round(v_kcal), 'maintenance_kcal', round(v_maint, 1), 'aaha_start_kcal', case when p_type = 'lose' then round(v_aaha, 1) end,
    'floor_kcal', round(v_floor, 1), 'est_days', v_est, 'adjustment', v_adj, 'adjustment_reason', v_adj_text,
    'weekly_pct', round(v_delta / p_weight_kg / (v_d / 7.0) * 100, 2), 'vet_warning', p_type = 'gain' and v_bcs = 5);
end $$;
grant execute on function public.goal_plan(text, numeric, int, boolean, int, date, text, text, jsonb, text, numeric, int, date, numeric, date, date) to anon, authenticated;
