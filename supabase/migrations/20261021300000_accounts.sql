-- Account extras. The account itself is Supabase Auth; a guest (anonymous) user becomes a saved account by adding an email.
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email_reminders boolean not null default false,   -- opt-in; at most one weigh-in reminder a week
  reminders_consent_at timestamptz,                 -- when and that they said yes (consent record)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- "Delete my data": removes the signed-in user; pets, weigh-ins, saved foods, reviews and profile cascade with it.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
