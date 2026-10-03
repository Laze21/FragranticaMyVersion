-- A review carries the same four-way breakdown a rating does, so "8/10 · scent 9 · performance 6"
-- can be read beside the text instead of in a separate sheet. All optional: the overall score is
-- still the one number a review must have. The composer writes them here and into public.ratings
-- in the same transaction, so a person's breakdown is one set of numbers wherever it is read.
alter table public.reviews
  add column if not exists scent smallint check (scent between 1 and 10),
  add column if not exists performance smallint check (performance between 1 and 10),
  add column if not exists value smallint check (value between 1 and 10),
  add column if not exists originality smallint check (originality between 1 and 10);

-- Saved lists: a person keeps someone else's list on their own lists page. One row per pair.
create table if not exists public.list_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  list_id uuid not null references public.lists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, list_id)
);
create index if not exists list_saves_list on public.list_saves (list_id);

alter table public.list_saves enable row level security;
create policy "list_saves are readable" on public.list_saves for select using (true);
create policy "people save lists for themselves" on public.list_saves for insert with check (auth.uid() = user_id);
create policy "people unsave their own" on public.list_saves for delete using (auth.uid() = user_id);
grant select on public.list_saves to anon, authenticated;
grant insert, delete on public.list_saves to authenticated;
