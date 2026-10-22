-- Goal history. The active goal lives on pets.goal (with start date, start weight and a FIXED target date);
-- when a goal is replaced, cleared or finishes, it is archived here so changes are visible by date.
create table public.pet_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null check (type in ('grow','lose','gain','maintain')),
  start_on date not null,
  start_kg numeric not null,
  target_kg numeric not null,
  target_date date not null,
  ended_on date not null,
  end_kg numeric,
  outcome text not null check (outcome in ('replaced','cleared','achieved','missed')),
  created_at timestamptz not null default now()
);
create index on public.pet_goals (pet_id, ended_on desc);
alter table public.pet_goals enable row level security;
create policy "own goal history" on public.pet_goals for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));
grant select, insert, update, delete on public.pet_goals to authenticated;
