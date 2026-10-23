-- Which market the owner shops in. Food search shows only foods sold there; 'all' shows every market.
alter table public.profiles add column if not exists region text check (region in ('US','CA','all'));
