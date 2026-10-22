-- Diet log. Every food a pet eats is one row with the dates it was fed: started_on and (when it stops or changes) ended_on.
-- The current diet is the rows with no end date. A change is an end date on some rows and new rows from the same date;
-- replaced_id links a new row to the one it replaced. This keeps the full history, so growth can be read against each diet period.
create table public.pet_diet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  food_id text,                                   -- our catalogue id when the food is in the list, else null
  food_name text not null,
  role text not null default 'main' check (role in ('main','topper','treat','other')),
  amount numeric not null check (amount > 0),     -- per meal
  unit text not null default 'g' check (unit in ('g','cup','can','piece')),
  times_per_day numeric not null default 2 check (times_per_day > 0 and times_per_day <= 12),
  started_on date not null,
  ended_on date,
  replaced_id uuid references public.pet_diet_items(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);
create index on public.pet_diet_items (pet_id, started_on);
alter table public.pet_diet_items enable row level security;
create policy "own diet" on public.pet_diet_items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));
grant select, insert, update, delete on public.pet_diet_items to authenticated;
