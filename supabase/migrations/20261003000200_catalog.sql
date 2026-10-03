-- Catalogue: brands, perfumers, notes, character dimensions, fragrances and their provenance.

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  kind text not null check (kind in ('designer', 'niche', 'indie', 'heritage', 'mass', 'regional')),
  country text check (country ~ '^[A-Z]{2}$'),
  city text,
  founded_year smallint,
  description text,
  known_for text,
  website_url text,
  parent_company text,
  wikidata_qid text check (wikidata_qid ~ '^Q[0-9]+$'),
  data_source_id uuid references public.data_sources (id),
  source_url text,
  verified_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brands_name_trgm on public.brands using gin (public.immutable_unaccent(lower(name)) extensions.gin_trgm_ops);
create trigger brands_touch before update on public.brands for each row execute function public.touch_updated_at();

create table public.perfumers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  country text check (country ~ '^[A-Z]{2}$'),
  born_year smallint,
  bio text,
  signature text,
  wikidata_qid text check (wikidata_qid ~ '^Q[0-9]+$'),
  data_source_id uuid references public.data_sources (id),
  source_url text,
  verified_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index perfumers_name_trgm on public.perfumers using gin (public.immutable_unaccent(lower(name)) extensions.gin_trgm_ops);
create trigger perfumers_touch before update on public.perfumers for each row execute function public.touch_updated_at();

-- Notes are an educational destination as much as a tag. kind distinguishes raw materials,
-- composed accords ("leather", "marine") and descriptors people use for what they smell
-- ("metallic", "soapy") so perceived-note voting can speak the way people actually talk.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  kind text not null check (kind in ('material', 'accord', 'descriptor')),
  family text not null,
  aliases text[] not null default '{}',
  smells_like text,
  origin text,
  contributes text,
  synthetic text check (synthetic in ('natural', 'synthetic', 'both')),
  volatility text check (volatility in ('top', 'heart', 'base')),
  character jsonb not null default '{}'::jsonb,   -- { "fresh": 0.9, ... }
  hue text check (hue ~ '^#[0-9A-Fa-f]{6}$'),
  pubchem_cid integer,                             -- for single-molecule materials
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_name_trgm on public.notes using gin (public.immutable_unaccent(lower(name)) extensions.gin_trgm_ops);
create index notes_aliases on public.notes using gin (aliases);
create trigger notes_touch before update on public.notes for each row execute function public.touch_updated_at();

-- The 13 character dimensions of the Scent Fingerprint / Trail.
-- Named "accords" for industry familiarity; in the UI they are "character".
create table public.accords (
  slug text primary key check (slug ~ '^[a-z]+$'),
  name text not null,
  description text not null,
  hue text not null check (hue ~ '^#[0-9A-Fa-f]{6}$'),
  sort smallint not null
);

create table public.fragrances (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  brand_id uuid not null references public.brands (id),
  concentration text check (concentration in ('cologne', 'edc', 'edt', 'edp', 'parfum', 'extrait', 'oil', 'body_mist')),
  release_year smallint check (release_year between 1700 and 2100),
  discontinued_year smallint,
  status text not null default 'current'
    check (status in ('current', 'discontinued', 'limited', 'reformulated', 'upcoming')),
  -- How the house positions it. NOT who can wear it: wearability comes from community data.
  marketed_for text not null default 'unspecified'
    check (marketed_for in ('feminine', 'masculine', 'shared', 'unspecified')),
  parent_id uuid references public.fragrances (id),          -- flankers / concentrations
  style text,                                                 -- "Fresh spicy woods"
  summary text,                                               -- the 10-second read (editorial)
  best_for text,
  official_description text,                                  -- house copy; provenance in source records
  editorial text,
  country text check (country ~ '^[A-Z]{2}$'),
  price_band text check (price_band in ('budget', 'accessible', 'premium', 'luxury', 'ultra')),
  typical_price_usd numeric(8, 2),
  typical_size_ml numeric(6, 1),
  accent_hex text check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  bottle_spec jsonb,                                          -- parametric bottle (poster/3D generator)
  phase_heart_min smallint,
  phase_drydown_min smallint,
  visibility text not null default 'public' check (visibility in ('public', 'hidden', 'merged')),
  merged_into uuid references public.fragrances (id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fragrances_discontinued_after_release
    check (discontinued_year is null or release_year is null or discontinued_year >= release_year),
  constraint fragrances_merged_has_target check ((visibility = 'merged') = (merged_into is not null))
);
create index fragrances_brand on public.fragrances (brand_id);
create index fragrances_parent on public.fragrances (parent_id);
create index fragrances_name_trgm on public.fragrances using gin (public.immutable_unaccent(lower(name)) extensions.gin_trgm_ops);
create trigger fragrances_touch before update on public.fragrances for each row execute function public.touch_updated_at();

-- Sizes, batches, reformulations. Performance votes can point at a variant so
-- "it used to be a beast" stops polluting today's numbers.
create table public.fragrance_variants (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  label text not null,                    -- "2019 reformulation", "100 ml", "Tester"
  kind text not null check (kind in ('size', 'formulation', 'packaging', 'batch_range')),
  size_ml numeric(6, 1),
  gtin text check (gtin ~ '^[0-9]{8,14}$'),
  from_year smallint,
  to_year smallint,
  notes text,
  created_at timestamptz not null default now()
);
create index fragrance_variants_fragrance on public.fragrance_variants (fragrance_id);

-- ---------------------------------------------------------------------------
-- Provenance: field-level claims about a fragrance.
-- One row = "source S says field F of fragrance X is V", with how sure we are.
-- Deleting every row for a source (takedown) must leave the catalogue consistent.
-- ---------------------------------------------------------------------------
create table public.fragrance_source_records (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  data_source_id uuid not null references public.data_sources (id),
  field text not null check (field in (
    'identity', 'brand', 'concentration', 'release_year', 'status', 'perfumers',
    'notes', 'description', 'image', 'model_3d', 'price', 'gtin', 'marketed_for'
  )),
  value jsonb,                         -- the claimed value as received
  source_url text,
  license text,
  share_alike boolean not null default false,
  display_scope text not null default 'public' check (display_scope in ('public', 'internal', 'offer_only')),
  retrieved_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  confidence numeric(3, 2) check (confidence between 0 and 1),
  submitted_by uuid references public.profiles (id),
  submission_id uuid,                  -- FK added in moderation migration
  status text not null default 'accepted'
    check (status in ('pending', 'accepted', 'disputed', 'superseded', 'retracted')),
  supersedes_id uuid references public.fragrance_source_records (id),
  evidence_url text,                   -- photo of box, press release
  notes text,
  created_at timestamptz not null default now()
);
create index fsr_fragrance_field on public.fragrance_source_records (fragrance_id, field);
create index fsr_source on public.fragrance_source_records (data_source_id);

create table public.fragrance_perfumers (
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  perfumer_id uuid not null references public.perfumers (id),
  role text not null default 'perfumer' check (role in ('perfumer', 'co_perfumer', 'creative_director', 'reformulation')),
  source_record_id uuid references public.fragrance_source_records (id) on delete set null,
  primary key (fragrance_id, perfumer_id)
);
create index fragrance_perfumers_perfumer on public.fragrance_perfumers (perfumer_id);

-- Official / published notes only. What people smell lives in perceived_note_votes.
create table public.fragrance_notes (
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  note_id uuid not null references public.notes (id),
  layer text not null check (layer in ('top', 'heart', 'base', 'unspecified')),
  position smallint not null default 0,
  source_record_id uuid references public.fragrance_source_records (id) on delete set null,
  primary key (fragrance_id, note_id, layer)
);
create index fragrance_notes_note on public.fragrance_notes (note_id);

-- Character per phase. 'editorial' is our staff estimate (the cold-start prior),
-- 'computed' is derived from notes, 'community' from accord votes.
create table public.fragrance_accords (
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  accord_slug text not null references public.accords (slug),
  phase text not null check (phase in ('opening', 'heart', 'drydown')),
  strength numeric(4, 3) not null check (strength between 0 and 1),
  source text not null check (source in ('editorial', 'computed', 'community')),
  primary key (fragrance_id, accord_slug, phase, source)
);

create table public.fragrance_assets (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  kind text not null check (kind in ('poster', 'photo', 'model_3d', 'press', 'user_photo')),
  url text not null,
  width integer,
  height integer,
  bytes integer,
  mime text,
  alt text,
  is_primary boolean not null default false,
  license text,
  credit text,
  data_source_id uuid references public.data_sources (id),
  source_record_id uuid references public.fragrance_source_records (id) on delete set null,
  contributed_by uuid references public.profiles (id),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  -- 3D-only fields (kind = 'model_3d')
  poster_url text,
  model_version text,
  animation_idle text,
  animation_spray text,
  animation_open text,
  animation_notes text,
  created_at timestamptz not null default now()
);
create index fragrance_assets_fragrance on public.fragrance_assets (fragrance_id, kind);
create unique index fragrance_assets_one_primary on public.fragrance_assets (fragrance_id, kind) where is_primary;

-- Room for the business model without building it: prices and where to buy.
-- Retailer images/copy are offer-scoped and never become canonical catalogue assets.
create table public.retailer_offers (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances (id) on delete cascade,
  variant_id uuid references public.fragrance_variants (id) on delete set null,
  retailer text not null,
  url text not null,
  price numeric(10, 2),
  currency text check (currency ~ '^[A-Z]{3}$'),
  size_ml numeric(6, 1),
  is_affiliate boolean not null default false,   -- must be disclosed in UI when true
  is_sample boolean not null default false,
  data_source_id uuid references public.data_sources (id),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index retailer_offers_fragrance on public.retailer_offers (fragrance_id);
