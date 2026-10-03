-- Aggregates and search.
--
-- fragrance_stats is a denormalised read model rebuilt per fragrance after writes
-- (app: src/lib/data/stats.ts; production: a queue worker). It merges live votes with any
-- community_baselines row. Baselines exist so imported or demo aggregates are never
-- disguised as live votes: every page that shows them can say so.

create table public.community_baselines (
  fragrance_id uuid primary key references public.fragrances (id) on delete cascade,
  data_source_id uuid not null references public.data_sources (id),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.fragrance_stats (
  fragrance_id uuid primary key references public.fragrances (id) on delete cascade,
  rating_count integer not null default 0,
  rating_avg numeric(4, 2),
  rating_hist integer[] not null default '{0,0,0,0,0,0,0,0,0,0}',
  rating_spread numeric(4, 2),            -- standard deviation: "how divisive"
  scent_avg numeric(4, 2),
  performance_avg numeric(4, 2),
  value_avg numeric(4, 2),
  originality_avg numeric(4, 2),
  review_count integer not null default 0,
  perf_votes integer not null default 0,
  longevity_hist integer[] not null default '{0,0,0,0,0,0}',  -- lt2,2to4,4to6,6to8,8to10,10plus
  longevity_median_hrs numeric(4, 1),
  projection_opening_hist integer[] not null default '{0,0,0,0,0}',
  projection_later_hist integer[] not null default '{0,0,0,0,0}',
  projection_avg numeric(3, 2),
  wear_voters integer not null default 0,
  wear jsonb not null default '{}'::jsonb,          -- { "summer": 0.31, "office": 0.72, ... }
  perceived_voters integer not null default 0,
  perceived jsonb not null default '{}'::jsonb,     -- { "bergamot": 0.68, ... } share of voters
  perceived_by_phase jsonb not null default '{}'::jsonb,
  character jsonb not null default '{}'::jsonb,     -- { opening: {...}, heart: {...}, drydown: {...}, overall: {...} }
  own_count integer not null default 0,
  had_count integer not null default 0,
  want_count integer not null default 0,
  wears_30d integer not null default 0,
  wears_total integer not null default 0,
  popularity numeric(10, 3) not null default 0,
  trending numeric(10, 3) not null default 0,
  includes_baseline boolean not null default false,
  baseline_source text,
  updated_at timestamptz not null default now()
);
create index fragrance_stats_rating on public.fragrance_stats (rating_avg desc nulls last);
create index fragrance_stats_popularity on public.fragrance_stats (popularity desc);
create index fragrance_stats_trending on public.fragrance_stats (trending desc);
create index fragrance_stats_longevity on public.fragrance_stats (longevity_median_hrs);

-- ---------------------------------------------------------------------------
-- Search: Postgres FTS for words + pg_trgm for typos and partial names.
-- One document per fragrance so a query like "graphite oriel" or "bergamot cedar" works.
-- ---------------------------------------------------------------------------
create table public.fragrance_search (
  fragrance_id uuid primary key references public.fragrances (id) on delete cascade,
  document text not null,
  tsv tsvector not null
);
create index fragrance_search_tsv on public.fragrance_search using gin (tsv);
create index fragrance_search_trgm on public.fragrance_search using gin (document extensions.gin_trgm_ops);

create or replace function public.refresh_fragrance_search(fid uuid)
returns void
language plpgsql
as $$
declare
  v_name text;
  v_brand text;
  v_people text;
  v_notes text;
  v_extra text;
begin
  select f.name, b.name, concat_ws(' ', f.style, f.concentration, f.release_year::text)
    into v_name, v_brand, v_extra
    from public.fragrances f join public.brands b on b.id = f.brand_id
   where f.id = fid;
  if v_name is null then
    delete from public.fragrance_search where fragrance_id = fid;
    return;
  end if;

  select coalesce(string_agg(p.name, ' '), '') into v_people
    from public.fragrance_perfumers fp join public.perfumers p on p.id = fp.perfumer_id
   where fp.fragrance_id = fid;

  select coalesce(string_agg(n.name || ' ' || array_to_string(n.aliases, ' '), ' '), '') into v_notes
    from public.fragrance_notes fn join public.notes n on n.id = fn.note_id
   where fn.fragrance_id = fid;

  insert into public.fragrance_search (fragrance_id, document, tsv)
  values (
    fid,
    public.immutable_unaccent(lower(concat_ws(' ', v_name, v_brand, v_people, v_notes, v_extra))),
    setweight(to_tsvector('simple', public.immutable_unaccent(lower(v_name))), 'A') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(lower(v_brand))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(lower(v_people || ' ' || v_notes))), 'C') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(lower(coalesce(v_extra, '')))), 'D')
  )
  on conflict (fragrance_id) do update set document = excluded.document, tsv = excluded.tsv;
end
$$;
