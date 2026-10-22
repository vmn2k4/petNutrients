-- User data. Every row belongs to auth.uid(); anonymous sign-in users count, so no account is needed to start.
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  species text not null check (species in ('dog','cat')),
  name text not null,
  breed text not null default '',
  size_cat text references ref.size_categories(id),
  birth_date date not null,
  sex text not null default 'unknown' check (sex in ('male','female','unknown')),
  neutered boolean not null default true,
  weight_kg numeric not null check (weight_kg > 0),
  bcs int check (bcs between 1 and 9),
  activity text not null default 'normal',
  allergies text[] not null default '{}',
  health text[] not null default '{}',
  answered jsonb not null default '{}',    -- which "make the plan more accurate" questions the owner answered
  goal jsonb,                              -- {type, targetKg, days, custom, fromChart}
  target jsonb,                            -- {days, kg, setOn}
  skips date[] not null default '{}',      -- weigh-ins skipped on purpose (streak stays safe)
  remind boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.pets (user_id);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  measured_on date not null,
  kg numeric not null check (kg > 0),
  bcs int check (bcs between 1 and 9),
  created_at timestamptz not null default now()
);
create index on public.weight_logs (pet_id, measured_on);

-- food_id is text while foods are prototype samples; it becomes a FK to catalog.products when that exists.
create table public.saved_foods (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  food_id text not null,
  stars int not null check (stars between 1 and 5),
  liked text not null,                     -- palatability: 'Loved it', 'Liked it', 'Picky at first', ...
  improved text[] not null default '{}',
  rebuy boolean not null,
  subscribe boolean not null,
  why text not null default '',            -- why not subscribe
  body text not null default '',
  fed_for text not null default 'recently',
  pet_label text not null default 'Anonymous',
  pet_species text check (pet_species in ('dog','cat')),   -- snapshot for "pets like mine" later
  pet_size_cat text,
  pet_age_months int,
  status text not null default 'published' check (status in ('pending','published','rejected','removed')), -- MVP publishes at once; moderation later
  created_at timestamptz not null default now(),
  unique (user_id, food_id)
);
create index on public.reviews (food_id) where status = 'published';

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger pets_touch before update on public.pets for each row execute function public.touch_updated_at();

alter table public.pets enable row level security;
alter table public.weight_logs enable row level security;
alter table public.saved_foods enable row level security;
alter table public.reviews enable row level security;

create policy "own pets" on public.pets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own weight logs" on public.weight_logs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid()));
create policy "own saved foods" on public.saved_foods for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read published reviews" on public.reviews for select to anon, authenticated
  using (status = 'published' or user_id = auth.uid());
create policy "write own reviews" on public.reviews for insert to authenticated
  with check (user_id = auth.uid());
create policy "edit own reviews" on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own reviews" on public.reviews for delete to authenticated
  using (user_id = auth.uid());
