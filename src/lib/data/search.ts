import 'server-only';
import { cache } from 'react';
import { sql } from '@/lib/db';
import { EMPTY_FILTERS, type Filters } from '@/lib/search/filters';
import type { Vocabulary } from '@/lib/search/interpret';
import { DIMENSION_META, WEAR_CONTEXTS, type Dimension } from '@/lib/scent/vocab';
import { formatNumber } from '@/lib/scent/read';
import { CARD_COLUMNS, CARD_FROM, mapCard, type CardRow } from './catalog';
import { similarityScores } from './similar';
import type { FragranceCard } from './types';

const PERCEIVED_STRONG = 0.3;

/** Prefix tsquery from free text: "berg ced" -> "berg:* & ced:*". Safe against tsquery syntax. */
export function prefixQuery(q: string): string | null {
  const tokens = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 1)
    .slice(0, 8);
  return tokens.length ? tokens.map((t) => `${t}:*`).join(' & ') : null;
}

export interface Suggestion {
  type: 'fragrance' | 'brand' | 'note' | 'perfumer';
  slug: string;
  label: string;
  sub: string;
  poster?: string | null;
  hue?: string | null;
}

export async function suggest(q: string): Promise<Suggestion[]> {
  const query = q.trim().slice(0, 80);
  if (!query) return [];
  const tsq = prefixQuery(query);
  const [frags, brands, notes, perfumers] = await Promise.all([
    sql<{ slug: string; name: string; brand: string; year: number | null; poster: string | null; rank: number }>(
      `select f.slug, f.name, b.name brand, f.release_year as year, p.url poster,
              (case when $2::text is not null and fs.tsv @@ to_tsquery('simple', $2) then ts_rank(fs.tsv, to_tsquery('simple', $2)) * 2 else 0 end)
              + extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(f.name || ' ' || b.name))) as rank
         from public.fragrance_search fs
         join public.fragrances f on f.id = fs.fragrance_id and f.visibility = 'public'
         join public.brands b on b.id = f.brand_id
         left join public.fragrance_primary_image p on p.fragrance_id = f.id
        where ($2::text is not null and fs.tsv @@ to_tsquery('simple', $2))
           or extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(f.name || ' ' || b.name))) > 0.35
        order by rank desc limit 6`,
      [query, tsq],
    ),
    sql<{ slug: string; name: string; kind: string; country: string }>(
      `select slug, name, kind, country from public.brands
        where public.immutable_unaccent(lower(name)) like '%' || public.immutable_unaccent(lower($1)) || '%'
           or extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(name))) > 0.45
        order by extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(name))) desc limit 3`,
      [query],
    ),
    sql<{ slug: string; name: string; family: string; hue: string }>(
      `select slug, name, family, hue from public.notes
        where public.immutable_unaccent(lower(name)) like public.immutable_unaccent(lower($1)) || '%'
           or exists (select 1 from unnest(aliases) a where a like lower($1) || '%')
           or extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(name))) > 0.5
        order by (public.immutable_unaccent(lower(name)) like public.immutable_unaccent(lower($1)) || '%') desc, name limit 4`,
      [query],
    ),
    sql<{ slug: string; name: string; country: string }>(
      `select slug, name, country from public.perfumers
        where public.immutable_unaccent(lower(name)) like '%' || public.immutable_unaccent(lower($1)) || '%'
           or extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(name))) > 0.45
        limit 2`,
      [query],
    ),
  ]);
  return [
    ...frags.map((f) => ({ type: 'fragrance' as const, slug: f.slug, label: f.name, sub: [f.brand, f.year].filter(Boolean).join(' · '), poster: f.poster })),
    ...brands.map((b) => ({ type: 'brand' as const, slug: b.slug, label: b.name, sub: `House · ${b.kind}` })),
    ...notes.map((n) => ({ type: 'note' as const, slug: n.slug, label: n.name, sub: `Note · ${n.family}`, hue: n.hue })),
    ...perfumers.map((p) => ({ type: 'perfumer' as const, slug: p.slug, label: p.name, sub: 'Perfumer' })),
  ];
}

/** Per-card lines the grid shows beside the facts: why it matched, and the ten-second read. */
export interface DiscoverMeta {
  /** "Vanilla listed · 71% smell it", "No tobacco in 1,418 votes". Null when nothing was asked for. */
  reason: string | null;
  /** The editorial summary, shown on the top match only. */
  summary: string | null;
}

export interface DiscoverResult {
  cards: FragranceCard[];
  total: number;
  meta: Record<string, DiscoverMeta>;
}

/* Extra columns the reasons are written from; read beside the card columns, never shown raw. */
type ReasonRow = CardRow & {
  total: string;
  summary: string | null;
  perceived: Record<string, number> | null;
  perceived_voters: string | number | null;
  wear: Record<string, number> | null;
  wear_voters: string | number | null;
  typical_price_usd: string | number | null;
  listed_slugs: string[] | null;
  nose_names: string | null;
};

export async function discover(f: Filters, limit = 48): Promise<DiscoverResult> {
  const where: string[] = [`f.visibility = 'public'`];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  const tsq = f.q ? prefixQuery(f.q) : null;
  if (f.q) {
    where.push(
      `(fs.tsv @@ to_tsquery('simple', ${p(tsq)}) or extensions.word_similarity(public.immutable_unaccent(lower(${p(f.q)})), fs.document) > 0.45)`,
    );
  }

  const listed = (slugParam: string) =>
    `exists (select 1 from public.fragrance_notes fn join public.notes n on n.id = fn.note_id where fn.fragrance_id = f.id and n.slug = ${slugParam})`;
  const perceived = (slugParam: string) => `coalesce((s.perceived ->> ${slugParam})::numeric, 0) >= ${PERCEIVED_STRONG}`;
  for (const slug of f.include) {
    const sp = p(slug);
    where.push(f.noteMatch === 'listed' ? listed(sp) : f.noteMatch === 'perceived' ? perceived(sp) : `(${listed(sp)} or ${perceived(sp)})`);
  }
  for (const slug of f.exclude) {
    const sp = p(slug);
    where.push(`not ${listed(sp)} and not ${perceived(sp)}`);
  }
  for (const fam of f.excludeFamilies) {
    where.push(
      `not exists (select 1 from public.notes n where n.family = ${p(fam)} and coalesce((s.perceived ->> n.slug)::numeric, 0) >= 0.4)`,
    );
  }
  for (const d of f.dims) where.push(`coalesce((s.character -> 'overall' ->> ${p(d)})::numeric, 0) >= 0.2`);
  for (const d of f.avoidDims) where.push(`coalesce((s.character -> 'overall' ->> ${p(d)})::numeric, 0) < 0.3`);
  for (const key of [...f.seasons, ...f.times, ...f.weather, ...f.occasions]) where.push(`coalesce((s.wear ->> ${p(key)})::numeric, 0) >= 0.5`);
  if (f.longevityMin !== null) where.push(`s.longevity_median_hrs >= ${p(f.longevityMin)}`);
  if (f.projectionMin !== null) where.push(`s.projection_avg >= ${p(f.projectionMin)}`);
  if (f.projectionMax !== null) where.push(`s.projection_avg <= ${p(f.projectionMax)}`);
  if (f.decades.length) where.push(`(f.release_year / 10 * 10) = any(${p(f.decades)}::int[])`);
  if (f.yearMin !== null) where.push(`f.release_year >= ${p(f.yearMin)}`);
  if (f.yearMax !== null) where.push(`f.release_year <= ${p(f.yearMax)}`);
  if (f.ratingMin !== null) where.push(`s.rating_avg >= ${p(f.ratingMin)}`);
  if (f.reviewsMin !== null) where.push(`s.review_count >= ${p(f.reviewsMin)}`);
  if (f.priceBands.length) where.push(`f.price_band = any(${p(f.priceBands)}::text[])`);
  if (f.priceMax !== null) where.push(`f.typical_price_usd <= ${p(f.priceMax)}`);
  if (f.brandKinds.length) where.push(`b.kind = any(${p(f.brandKinds)}::text[])`);
  if (f.brands.length) where.push(`b.slug = any(${p(f.brands)}::text[])`);
  if (f.perfumers.length) {
    where.push(
      `exists (select 1 from public.fragrance_perfumers fp join public.perfumers pf on pf.id = fp.perfumer_id where fp.fragrance_id = f.id and pf.slug = any(${p(f.perfumers)}::text[]))`,
    );
  }
  if (f.concentrations.length) where.push(`f.concentration = any(${p(f.concentrations)}::text[])`);
  if (f.available) where.push(`f.status in ('current', 'limited', 'reformulated')`);
  if (f.similarTo) where.push(`f.slug <> ${p(f.similarTo)}`);

  const dimScore = f.dims.length ? f.dims.map((d) => `coalesce((s.character -> 'overall' ->> ${p(d)})::numeric, 0)`).join(' + ') : '0';
  const textRank = tsq ? `ts_rank(fs.tsv, to_tsquery('simple', ${p(tsq)}))` : '0';
  const order: Record<string, string> = {
    relevance: `(${textRank}) * 4 + (${dimScore}) + coalesce(s.popularity, 0) / 40 desc`,
    popular: 's.popularity desc nulls last',
    rating: 's.rating_avg desc nulls last, s.rating_count desc',
    newest: 'f.release_year desc nulls last, f.name',
    trending: 's.trending desc nulls last',
    'lesser-known': `(${dimScore}) * 0.5 + coalesce(s.rating_avg, 6) / 10 - coalesce(s.popularity, 0) / 30 desc`,
    longest: 's.longevity_median_hrs desc nulls last',
  };

  // The reasons need the listed notes among the ones asked for, and the perfumers among those asked for.
  const includeParam = p(f.include);
  const noseParam = p(f.perfumers);
  const rows = await sql<ReasonRow>(
    `select ${CARD_COLUMNS}, count(*) over () as total,
            f.summary, s.perceived, s.perceived_voters, s.wear, s.wear_voters, f.typical_price_usd,
            (select array_agg(n.slug) from public.fragrance_notes fn join public.notes n on n.id = fn.note_id
              where fn.fragrance_id = f.id and n.slug = any(${includeParam}::text[])) as listed_slugs,
            (select string_agg(pf.name, ', ') from public.fragrance_perfumers fp join public.perfumers pf on pf.id = fp.perfumer_id
              where fp.fragrance_id = f.id and pf.slug = any(${noseParam}::text[])) as nose_names
       ${CARD_FROM}
       left join public.fragrance_search fs on fs.fragrance_id = f.id
      where ${where.join(' and ')}
      order by ${order[f.sort] ?? order.relevance}, f.name
      limit 400`,
    params,
  );
  const total = rows.length ? Number(rows[0].total) : 0;
  const names = await noteNames(f.include.concat(f.exclude));

  let scores: Map<string, number> | null = null;
  let kept = rows;
  if (f.similarTo) {
    scores = await similarityScores(f.similarTo);
    const sc = scores;
    kept = rows.filter((r) => (sc.get(r.id as string) ?? 0) > 0.45);
    const trending = (r: ReasonRow) => Number(r.trending ?? 0);
    if (f.sort === 'lesser-known') kept.sort((a, b) => (sc.get(b.id as string) ?? 0) * 3 - trending(b) / 100 - ((sc.get(a.id as string) ?? 0) * 3 - trending(a) / 100));
    else if (f.sort === 'relevance') kept.sort((a, b) => (sc.get(b.id as string) ?? 0) - (sc.get(a.id as string) ?? 0));
  }

  const page = kept.slice(0, limit);
  const cards = page.map(mapCard);
  const meta: Record<string, DiscoverMeta> = {};
  for (const r of page) {
    meta[r.id as string] = {
      reason: matchReason(r, f, names, scores),
      summary: typeof r.summary === 'string' && r.summary.trim() ? r.summary.trim() : null,
    };
  }
  return { cards, total: f.similarTo ? kept.length : total, meta };
}

/**
 * Why this card is in the set, in the order the question was asked: the first note asked for,
 * the first note ruled out, then the one other thing that narrowed it most. At most two clauses,
 * so the line stays one line under the card.
 */
function matchReason(r: ReasonRow, f: Filters, names: Record<string, string>, scores: Map<string, number> | null): string | null {
  const parts: string[] = [];
  const perceived = r.perceived ?? {};
  const voters = Number(r.perceived_voters ?? 0);
  const listed = new Set(r.listed_slugs ?? []);
  const name = (slug: string) => names[slug] ?? slug;
  const pctOf = (slug: string) => Math.round((Number(perceived[slug] ?? 0) || 0) * 100);

  if (f.similarTo && scores) {
    const s = scores.get(r.id as string);
    if (s !== undefined) parts.push(`${Math.round(s * 100)}% alike`);
  }
  for (const slug of f.include.slice(0, 1)) {
    const pct = pctOf(slug);
    const isListed = listed.has(slug);
    if (isListed && pct >= 10) parts.push(`${name(slug)} listed · ${pct}% smell it`);
    else if (isListed) parts.push(`${name(slug)} listed`);
    else if (pct > 0) parts.push(`${pct}% smell ${name(slug).toLowerCase()}`);
  }
  for (const slug of f.exclude.slice(0, 1)) {
    parts.push(voters > 0 ? `No ${name(slug).toLowerCase()} in ${formatNumber(voters)} votes` : `No ${name(slug).toLowerCase()} listed`);
  }
  if (parts.length < 2) {
    const dim = f.dims[0] as Dimension | undefined;
    const overall = (r.character as { overall?: Record<string, number> } | null)?.overall ?? {};
    if (dim && overall[dim] !== undefined) parts.push(`Reads ${DIMENSION_META[dim].label.toLowerCase()} · ${Math.round(Number(overall[dim]) * 100)}%`);
    else if (f.excludeFamilies.length) parts.push(`Not ${f.excludeFamilies[0]}-heavy`);
    else if (f.avoidDims.length) parts.push(`Not too ${f.avoidDims[0]}`);
  }
  if (parts.length < 2) {
    const ctx = [...f.seasons, ...f.weather, ...f.times, ...f.occasions][0];
    const share = ctx ? Number((r.wear ?? {})[ctx] ?? 0) : 0;
    if (ctx && share > 0) {
      const label = WEAR_CONTEXTS.find((c) => c.key === ctx)?.label ?? ctx;
      parts.push(`${label}: ${Math.round(share * 100)}% say it fits`);
    }
  }
  if (parts.length < 2) {
    if (f.longevityMin !== null && r.longevity_median_hrs) parts.push(`Lasts about ${Math.round(Number(r.longevity_median_hrs))}h for most`);
    else if ((f.priceMax !== null || f.priceBands.length) && r.typical_price_usd) parts.push(`Typically $${Math.round(Number(r.typical_price_usd))}`);
    else if (f.projectionMin !== null) parts.push('Noticeable');
    else if (f.projectionMax !== null) parts.push('Stays close');
    else if (f.perfumers.length && r.nose_names) parts.push(`Nose: ${r.nose_names}`);
  }
  return parts.length ? parts.slice(0, 2).join(' · ') : null;
}

const noteNames = cache(async (slugs: string[]): Promise<Record<string, string>> => {
  if (!slugs.length) return {};
  const rows = await sql<{ slug: string; name: string }>('select slug, name from public.notes where slug = any($1::text[])', [slugs]);
  return Object.fromEntries(rows.map((r) => [r.slug, r.name]));
});

/**
 * When nothing matches: the three closest cards, found by loosening the question one step at a
 * time (words first, then exclusions, then the context, then the ranges, then everything but the
 * notes) until something answers. The last step is the catalogue's most popular, so the page
 * never ends on nothing.
 */
export async function nearest(f: Filters, count = 3): Promise<FragranceCard[]> {
  const steps: Filters[] = [
    { ...f, q: '' },
    { ...f, q: '', exclude: [], excludeFamilies: [], avoidDims: [] },
    { ...f, q: '', exclude: [], excludeFamilies: [], avoidDims: [], seasons: [], weather: [], times: [], occasions: [] },
    { ...f, q: '', exclude: [], excludeFamilies: [], avoidDims: [], seasons: [], weather: [], times: [], occasions: [], longevityMin: null, projectionMin: null, projectionMax: null, priceMax: null, priceBands: [], ratingMin: null, reviewsMin: null, yearMin: null, yearMax: null, decades: [] },
    { ...EMPTY_FILTERS, include: f.include, dims: f.dims, similarTo: f.similarTo, noteMatch: 'any' },
    { ...EMPTY_FILTERS, sort: 'popular' },
  ];
  for (const step of steps) {
    const { cards } = await discover(step, count);
    if (cards.length) return cards.slice(0, count);
  }
  return [];
}

/** Just the number, for the feelings' counts and the sheet's "Show N results". */
export async function discoverCount(f: Filters): Promise<number> {
  return (await discover(f, 1)).total;
}

export const getVocabulary = cache(async (): Promise<Vocabulary> => {
  const [notes, brands, perfumers, fragrances] = await Promise.all([
    sql<{ slug: string; name: string; aliases: string[]; family: string }>('select slug, name, aliases, family from public.notes'),
    sql<{ slug: string; name: string }>('select slug, name from public.brands'),
    sql<{ slug: string; name: string }>('select slug, name from public.perfumers'),
    sql<{ slug: string; name: string; brand_name: string }>(
      `select f.slug, f.name, b.name brand_name from public.fragrances f join public.brands b on b.id = f.brand_id where f.visibility = 'public'`,
    ),
  ]);
  return { notes, brands, perfumers, fragrances: fragrances.map((f) => ({ slug: f.slug, name: f.name, brandName: f.brand_name })) };
});
