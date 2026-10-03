-- Foundation: extensions, helpers, profiles, data sources.
--
-- Conventions
--  * Text + CHECK constraints instead of Postgres enums: vocabularies here will evolve and
--    CHECKs are cheaper to migrate than ALTER TYPE ... ADD VALUE.
--  * Every catalogue claim that matters carries provenance (see 20261003000200_catalog.sql).
--  * Demo/seed rows are flagged with is_demo so they can be purged before launch.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() is STABLE; index expressions need IMMUTABLE. Pinning the dictionary makes this safe.
create or replace function public.immutable_unaccent(input text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, input)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null,
  display_name text not null,
  bio text,
  location text,
  experience_level text not null default 'learning'
    check (experience_level in ('new', 'learning', 'enthusiast', 'collector', 'professional')),
  is_private boolean not null default false,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  avatar_hue text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_.]{3,20}$')
);
create unique index profiles_handle_key on public.profiles (lower(handle));
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Data sources: where a claim came from.
-- ---------------------------------------------------------------------------
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_type text not null check (source_type in (
    'official_brand',     -- the house's own site, packaging, press release
    'licensed_database',  -- data we pay for under contract
    'editorial',          -- our staff, from primary sources
    'community',          -- member submissions / votes
    'public_dataset',     -- Wikidata (CC0), Open Beauty Facts (ODbL, isolated), PubChem
    'retailer_feed'       -- affiliate feeds; offer-scoped only
  )),
  homepage_url text,
  license text,                 -- e.g. CC0-1.0, ODbL-1.0, proprietary:<contract id>
  share_alike boolean not null default false,
  terms_url text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
