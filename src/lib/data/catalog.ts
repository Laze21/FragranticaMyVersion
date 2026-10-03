import 'server-only';
import { cache } from 'react';
import { sql, sqlOne } from '@/lib/db';
import type { BottleSpec } from '@/seed/types';
import type { Character, FragranceCard, FragranceDetail, FragranceStats, NoteRef, SourceClaim } from './types';

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const avgFromHist = (h: number[] | null | undefined) => {
  if (!h) return null;
  const total = h.reduce((a, b) => a + b, 0);
  return total ? h.reduce((s, c, i) => s + c * (i + 1), 0) / total : null;
};
const emptyCharacter = (): Character => ({ overall: {}, opening: {}, heart: {}, drydown: {} });

/** Shared SELECT for card-sized fragrance data. Expects aliases f, b, s, p. */
export const CARD_COLUMNS = `
  f.id, f.slug, f.name, b.slug as brand_slug, b.name as brand_name, f.concentration, f.release_year, f.status, f.style,
  f.price_band, f.accent_hex, f.phase_heart_min, f.phase_drydown_min, p.url as poster, p.alt as poster_alt,
  s.rating_avg, coalesce(s.rating_count, 0) as rating_count, coalesce(s.review_count, 0) as review_count, s.character,
  s.longevity_median_hrs, s.projection_opening_hist, s.projection_later_hist, coalesce(s.own_count, 0) as own_count,
  coalesce(s.trending, 0) as trending, coalesce(s.includes_baseline, false) as includes_baseline`;

export const CARD_FROM = `
  from public.fragrances f
  join public.brands b on b.id = f.brand_id
  left join public.fragrance_stats s on s.fragrance_id = f.id
  left join lateral (
    select a.url, a.alt from public.fragrance_assets a
     where a.fragrance_id = f.id and a.kind = 'poster' and a.is_primary and a.status = 'approved' limit 1
  ) p on true`;

export type CardRow = Record<string, unknown>;

export function mapCard(r: CardRow): FragranceCard {
  const ch = (r.character as Character | null) ?? emptyCharacter();
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    brandSlug: r.brand_slug as string,
    brandName: r.brand_name as string,
    concentration: (r.concentration as string) ?? null,
    releaseYear: n(r.release_year),
    status: r.status as string,
    style: (r.style as string) ?? null,
    priceBand: (r.price_band as string) ?? null,
    accent: (r.accent_hex as string) ?? '#8a8f8c',
    poster: (r.poster as string) ?? null,
    posterAlt: (r.poster_alt as string) ?? null,
    ratingAvg: n(r.rating_avg),
    ratingCount: Number(r.rating_count ?? 0),
    reviewCount: Number(r.review_count ?? 0),
    character: { ...emptyCharacter(), ...ch },
    longevityHrs: n(r.longevity_median_hrs),
    projectionOpening: avgFromHist(r.projection_opening_hist as number[]),
    projectionLater: avgFromHist(r.projection_later_hist as number[]),
    heartAtMin: Number(r.phase_heart_min ?? 25),
    drydownAtMin: Number(r.phase_drydown_min ?? 180),
    ownCount: Number(r.own_count ?? 0),
    trending: Number(r.trending ?? 0),
    includesBaseline: Boolean(r.includes_baseline),
  };
}

export async function getCards(where = 'true', params: unknown[] = [], order = 's.popularity desc nulls last', limit = 60): Promise<FragranceCard[]> {
  const rows = await sql<CardRow>(
    `select ${CARD_COLUMNS} ${CARD_FROM} where f.visibility = 'public' and (${where}) order by ${order} limit ${Math.min(500, limit)}`,
    params,
  );
  return rows.map(mapCard);
}

export async function getCardsBySlugs(slugs: string[]): Promise<FragranceCard[]> {
  if (!slugs.length) return [];
  const cards = await getCards('f.slug = any($1::text[])', [slugs], 'f.name', slugs.length);
  return slugs.map((s) => cards.find((c) => c.slug === s)).filter(Boolean) as FragranceCard[];
}

export async function getCardsByIds(ids: string[]): Promise<FragranceCard[]> {
  if (!ids.length) return [];
  const cards = await getCards('f.id = any($1::uuid[])', [ids], 'f.name', ids.length);
  return ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as FragranceCard[];
}

function mapStats(r: Record<string, unknown> | null): FragranceStats {
  return {
    ratingCount: Number(r?.rating_count ?? 0),
    ratingAvg: n(r?.rating_avg),
    ratingHist: (r?.rating_hist as number[]) ?? new Array(10).fill(0),
    ratingSpread: n(r?.rating_spread),
    scentAvg: n(r?.scent_avg),
    performanceAvg: n(r?.performance_avg),
    valueAvg: n(r?.value_avg),
    originalityAvg: n(r?.originality_avg),
    reviewCount: Number(r?.review_count ?? 0),
    perfVotes: Number(r?.perf_votes ?? 0),
    longevityHist: (r?.longevity_hist as number[]) ?? new Array(6).fill(0),
    longevityMedian: n(r?.longevity_median_hrs),
    projectionOpeningHist: (r?.projection_opening_hist as number[]) ?? new Array(5).fill(0),
    projectionLaterHist: (r?.projection_later_hist as number[]) ?? new Array(5).fill(0),
    projectionAvg: n(r?.projection_avg),
    wearVoters: Number(r?.wear_voters ?? 0),
    wear: (r?.wear as Record<string, number>) ?? {},
    perceivedVoters: Number(r?.perceived_voters ?? 0),
    perceived: (r?.perceived as Record<string, number>) ?? {},
    perceivedByPhase: (r?.perceived_by_phase as Record<string, Record<string, number>>) ?? {},
    character: { ...emptyCharacter(), ...((r?.character as Character) ?? {}) },
    ownCount: Number(r?.own_count ?? 0),
    hadCount: Number(r?.had_count ?? 0),
    wantCount: Number(r?.want_count ?? 0),
    wears30d: Number(r?.wears_30d ?? 0),
    wearsTotal: Number(r?.wears_total ?? 0),
    includesBaseline: Boolean(r?.includes_baseline),
    baselineSource: (r?.baseline_source as string) ?? null,
  };
}

export const getFragrance = cache(async (slug: string): Promise<FragranceDetail | null> => {
  const row = await sqlOne<CardRow>(
    `select ${CARD_COLUMNS}, f.summary, f.best_for, f.editorial, f.official_description, f.marketed_for, f.discontinued_year,
            f.typical_price_usd, f.typical_size_ml, f.bottle_spec, f.is_demo, f.parent_id, b.kind as brand_kind, b.country as brand_country
       ${CARD_FROM}
      where f.slug = $1 and f.visibility = 'public'`,
    [slug],
  );
  if (!row) return null;
  const id = row.id as string;

  const [statsRow, perfumers, notes, claims, model, parent, flankers, variants] = await Promise.all([
    sqlOne('select * from public.fragrance_stats where fragrance_id = $1', [id]),
    sql<{ slug: string; name: string }>(
      `select p.slug, p.name from public.fragrance_perfumers fp join public.perfumers p on p.id = fp.perfumer_id where fp.fragrance_id = $1 order by p.name`,
      [id],
    ),
    sql<{ layer: string; id: string; slug: string; name: string; kind: string; family: string; hue: string; smells_like: string | null }>(
      `select fn.layer, n.id, n.slug, n.name, n.kind, n.family, n.hue, n.smells_like
         from public.fragrance_notes fn join public.notes n on n.id = fn.note_id
        where fn.fragrance_id = $1 order by fn.layer, fn.position`,
      [id],
    ),
    sql<Record<string, unknown>>(
      `select r.id, r.field, r.source_url, r.verified_at, r.confidence, r.notes, d.name as source_name, d.source_type, d.is_demo
         from public.fragrance_source_records r join public.data_sources d on d.id = r.data_source_id
        where r.fragrance_id = $1 and r.display_scope = 'public' and r.status = 'accepted'
        order by r.field`,
      [id],
    ),
    sqlOne<Record<string, string | null>>(
      `select url, poster_url, model_version, animation_idle, animation_spray, animation_open, animation_notes
         from public.fragrance_assets where fragrance_id = $1 and kind = 'model_3d' and status = 'approved' and is_primary`,
      [id],
    ),
    row.parent_id ? sqlOne<{ slug: string; name: string }>('select slug, name from public.fragrances where id = $1', [row.parent_id]) : null,
    sql<{ slug: string; name: string; concentration: string | null; release_year: number | null }>(
      `select slug, name, concentration, release_year from public.fragrances
        where (parent_id = $1 or (parent_id = $2 and id <> $1) or id = $2) and visibility = 'public' and id <> $1 order by release_year`,
      [id, row.parent_id ?? '00000000-0000-0000-0000-000000000000'],
    ),
    sql<{ label: string; kind: string; from_year: number | null; to_year: number | null; notes: string | null }>(
      `select label, kind, from_year, to_year, notes from public.fragrance_variants where fragrance_id = $1 order by from_year nulls last`,
      [id],
    ),
  ]);

  const mapClaim = (c: Record<string, unknown>): SourceClaim => ({
    id: c.id as string,
    field: c.field as string,
    sourceName: c.source_name as string,
    sourceType: c.source_type as string,
    sourceUrl: (c.source_url as string) ?? null,
    verifiedAt: c.verified_at ? new Date(c.verified_at as string).toISOString() : null,
    confidence: n(c.confidence),
    isDemo: Boolean(c.is_demo),
    notes: (c.notes as string) ?? null,
  });
  const claimList = claims.map(mapClaim);

  let noteLayers: FragranceDetail['notes'] = null;
  if (notes.length) {
    noteLayers = { top: [], heart: [], base: [], unspecified: [] };
    for (const r of notes) {
      const ref: NoteRef = { id: r.id, slug: r.slug, name: r.name, kind: r.kind as NoteRef['kind'], family: r.family, hue: r.hue, smellsLike: r.smells_like };
      noteLayers[r.layer as keyof typeof noteLayers].push(ref);
    }
  }

  const card = mapCard(row);
  return {
    ...card,
    brandKind: row.brand_kind as string,
    brandCountry: (row.brand_country as string) ?? null,
    summary: (row.summary as string) ?? null,
    bestFor: (row.best_for as string) ?? null,
    editorial: (row.editorial as string) ?? null,
    officialDescription: (row.official_description as string) ?? null,
    marketedFor: row.marketed_for as string,
    discontinuedYear: n(row.discontinued_year),
    priceUsd: n(row.typical_price_usd),
    sizeMl: n(row.typical_size_ml),
    bottle: (row.bottle_spec as BottleSpec) ?? null,
    isDemo: Boolean(row.is_demo),
    perfumers,
    notes: noteLayers,
    notesClaim: claimList.find((c) => c.field === 'notes') ?? null,
    claims: claimList,
    model: model
      ? {
          url: model.url!,
          poster: model.poster_url,
          version: model.model_version,
          animations: { idle: model.animation_idle, spray: model.animation_spray, open: model.animation_open, notes: model.animation_notes },
        }
      : null,
    parent: parent ?? null,
    flankers: flankers.map((f) => ({ slug: f.slug, name: f.name, concentration: f.concentration, releaseYear: n(f.release_year) })),
    variants: variants.map((v) => ({ label: v.label, kind: v.kind, fromYear: n(v.from_year), toYear: n(v.to_year), notes: v.notes })),
    stats: mapStats(statsRow),
  };
});

export async function getAllFragranceSlugs(): Promise<string[]> {
  const rows = await sql<{ slug: string }>(`select slug from public.fragrances where visibility = 'public' order by slug`);
  return rows.map((r) => r.slug);
}

/** All notes keyed by slug: small (hundreds), cached per request. */
export const getNoteIndex = cache(async (): Promise<Record<string, NoteRef & { aliases: string[] }>> => {
  const rows = await sql<{ id: string; slug: string; name: string; kind: string; family: string; hue: string; smells_like: string | null; aliases: string[] }>(
    'select id, slug, name, kind, family, hue, smells_like, aliases from public.notes order by name',
  );
  return Object.fromEntries(
    rows.map((r) => [r.slug, { id: r.id, slug: r.slug, name: r.name, kind: r.kind as NoteRef['kind'], family: r.family, hue: r.hue, smellsLike: r.smells_like, aliases: r.aliases }]),
  );
});
