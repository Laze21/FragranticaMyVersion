-- Community: ratings, perception and performance votes, reviews, collections, wear diary, lists.
--
-- Principle: subjective enjoyment (ratings) is stored separately from observations
-- (longevity, projection, wear contexts, perceived notes). Each vote row is timestamped so
-- aggregates can be windowed ("last 12 months") and weighted (account age) later.

create table public.ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  overall smallint not null check (overall between 1 and 10),
  scent smallint check (scent between 1 and 10),
  performance smallint check (performance between 1 and 10),
  value smallint check (value between 1 and 10),
  originality smallint check (originality between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, fragrance_id)
);
create index ratings_fragrance on public.ratings (fragrance_id);
create trigger ratings_touch before update on public.ratings for each row execute function public.touch_updated_at();

-- "What do you actually smell?"
create table public.perceived_note_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  note_id uuid not null references public.notes (id),
  phase text not null default 'overall' check (phase in ('overall', 'opening', 'heart', 'drydown')),
  created_at timestamptz not null default now(),
  primary key (user_id, fragrance_id, note_id, phase)
);
create index pnv_fragrance on public.perceived_note_votes (fragrance_id, phase);

-- Character (dimension) votes: how fresh / woody / sweet ... does it read to you, 0-3.
create table public.accord_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  accord_slug text not null references public.accords (slug),
  strength smallint not null check (strength between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, fragrance_id, accord_slug)
);
create index accord_votes_fragrance on public.accord_votes (fragrance_id);

create table public.performance_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  longevity text check (longevity in ('lt2', '2to4', '4to6', '6to8', '8to10', '10plus')),
  -- 1 skin, 2 close, 3 conversational, 4 arm's length, 5 room-filling
  projection_opening smallint check (projection_opening between 1 and 5),
  projection_later smallint check (projection_later between 1 and 5),
  sprays smallint check (sprays between 1 and 20),
  variant_id uuid references public.fragrance_variants (id) on delete set null,
  bottle_year smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, fragrance_id)
);
create index performance_votes_fragrance on public.performance_votes (fragrance_id);
create trigger performance_votes_touch before update on public.performance_votes for each row execute function public.touch_updated_at();

create table public.wear_contexts (
  key text primary key check (key ~ '^[a-z_]+$'),
  grp text not null check (grp in ('season', 'time', 'weather', 'occasion')),
  label text not null,
  sort smallint not null
);

create table public.wearability_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  context_key text not null references public.wear_contexts (key),
  fits boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, fragrance_id, context_key)
);
create index wearability_votes_fragrance on public.wearability_votes (fragrance_id);

-- Directed: "similar_id smells similar to fragrance_id, and is <modifiers> than it".
create table public.similarity_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  similar_id uuid not null references public.fragrances (id) on delete cascade,
  verdict text not null check (verdict in ('similar', 'not_similar')),
  modifiers text[] not null default '{}' check (modifiers <@ array[
    'cheaper', 'pricier', 'fresher', 'sweeter', 'darker', 'stronger', 'subtler', 'more_refined'
  ]::text[]),
  created_at timestamptz not null default now(),
  primary key (user_id, fragrance_id, similar_id),
  check (fragrance_id <> similar_id)
);
create index similarity_votes_pair on public.similarity_votes (fragrance_id, similar_id);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('quick', 'full')),
  title text,
  body text not null,
  rating_overall smallint check (rating_overall between 1 and 10),
  focus text[] not null default '{}' check (focus <@ array[
    'scent', 'performance', 'value', 'beginner', 'long_term', 'first_impression', 'comparison'
  ]::text[]),
  ownership text check (ownership in ('own', 'owned', 'sample', 'decant', 'tested', 'none')),
  wear_count integer check (wear_count >= 0),
  experience_level text,               -- snapshot of the author's self-described level
  gifted boolean not null default false,
  gift_note text,                      -- disclosure for gifted / promotional bottles
  status text not null default 'published' check (status in ('published', 'pending', 'hidden', 'deleted')),
  helpful_count integer not null default 0,
  helpful_baseline integer not null default 0,   -- imported/demo votes without individual rows
  comment_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint reviews_quick_is_short check (kind <> 'quick' or char_length(body) <= 600),
  constraint reviews_full_has_title check (kind <> 'full' or title is not null),
  constraint reviews_body_length check (char_length(body) between 1 and 20000)
);
-- One live review per person per fragrance; deleted ones stay for thread integrity.
create unique index reviews_one_per_user on public.reviews (user_id, fragrance_id) where status <> 'deleted';
create index reviews_fragrance_recent on public.reviews (fragrance_id, created_at desc);
create index reviews_fragrance_helpful on public.reviews (fragrance_id, helpful_count desc);
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();

create table public.review_votes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now()
);
create index review_comments_review on public.review_comments (review_id, created_at);

-- Keep denormalised counters honest.
create or replace function public.review_counters()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'review_votes' then
    update public.reviews
       set helpful_count = helpful_baseline
                         + (select count(*) from public.review_votes v where v.review_id = coalesce(new.review_id, old.review_id))
     where id = coalesce(new.review_id, old.review_id);
  else
    update public.reviews
       set comment_count = (select count(*) from public.review_comments c
                             where c.review_id = coalesce(new.review_id, old.review_id) and c.status = 'published')
     where id = coalesce(new.review_id, old.review_id);
  end if;
  return null;
end
$$;
create trigger review_votes_count after insert or delete on public.review_votes
  for each row execute function public.review_counters();
create trigger review_comments_count after insert or update or delete on public.review_comments
  for each row execute function public.review_counters();

-- ---------------------------------------------------------------------------
-- Collections: one 'main' shelf per person plus optional custom shelves.
-- Fields mirror what collectors keep in spreadsheets today.
-- ---------------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  kind text not null default 'custom' check (kind in ('main', 'custom')),
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);
create unique index collections_one_main on public.collections (user_id) where kind = 'main';

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  status text not null check (status in ('own', 'had', 'want', 'want_sample', 'testing', 'sampled')),
  is_favorite boolean not null default false,
  format text check (format in ('bottle', 'decant', 'sample', 'mini', 'travel')),
  size_ml numeric(6, 1),
  fill_level numeric(3, 2) check (fill_level between 0 and 1),
  batch_code text,
  bottle_year smallint,
  price_paid numeric(10, 2),
  currency text check (currency ~ '^[A-Z]{3}$'),
  acquired_from text,
  acquired_on date,
  notes text,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, fragrance_id)
);
create index collection_items_fragrance on public.collection_items (fragrance_id, status);
create trigger collection_items_touch before update on public.collection_items for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Wear diary. A wear can layer several fragrances.
-- ---------------------------------------------------------------------------
create table public.wear_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  worn_on date not null,
  weather text check (weather in ('hot', 'warm', 'mild', 'cool', 'cold', 'rain', 'humid')),
  occasion text check (occasion in ('office', 'school', 'date', 'formal', 'casual', 'nightlife', 'special', 'outdoors', 'home')),
  note text check (char_length(note) <= 1000),
  perceived_hours numeric(4, 1) check (perceived_hours between 0 and 48),
  created_at timestamptz not null default now()
);
create index wear_logs_user_day on public.wear_logs (user_id, worn_on desc);

create table public.wear_log_items (
  wear_log_id uuid not null references public.wear_logs (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  sprays smallint check (sprays between 1 and 30),
  position smallint not null default 0,
  primary key (wear_log_id, fragrance_id)
);
create index wear_log_items_fragrance on public.wear_log_items (fragrance_id);

-- ---------------------------------------------------------------------------
-- Lists and follows
-- ---------------------------------------------------------------------------
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 140),
  description text,
  is_public boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
create trigger lists_touch before update on public.lists for each row execute function public.touch_updated_at();

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  position integer not null,
  note text check (char_length(note) <= 500),
  primary key (list_id, fragrance_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
