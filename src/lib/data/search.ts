import 'server-only';
import { cache } from 'react';
import { sql } from '@/lib/db';
import type { Filters } from '@/lib/search/filters';
import type { Vocabulary } from '@/lib/search/interpret';
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

export interface DiscoverResult {
  cards: FragranceCard[];
  total: number;
}

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
  if (f.ratingMin !== null) where.push(`s.rating_avg >= ${p(f.ratingMin)}`);
  if (f.reviewsMin !== null) where.push(`s.review_count >= ${p(f.reviewsMin)}`);
  if (f.priceBands.length) where.push(`f.price_band = any(${p(f.priceBands)}::text[])`);
  if (f.priceMax !== null) where.push(`f.typical_price_usd <= ${p(f.priceMax)}`);
  if (f.brandKinds.length) where.push(`b.kind = any(${p(f.brandKinds)}::text[])`);
  if (f.brands.length) where.push(`b.slug = any(${p(f.brands)}::text[])`);
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

  const rows = await sql<CardRow & { total: string }>(
    `select ${CARD_COLUMNS}, count(*) over () as total
       ${CARD_FROM}
       left join public.fragrance_search fs on fs.fragrance_id = f.id
      where ${where.join(' and ')}
      order by ${order[f.sort] ?? order.relevance}, f.name
      limit 400`,
    params,
  );
  let cards = rows.map(mapCard);
  const total = rows.length ? Number(rows[0].total) : 0;

  if (f.similarTo) {
    const scores = await similarityScores(f.similarTo);
    cards = cards.filter((c) => (scores.get(c.id) ?? 0) > 0.45);
    if (f.sort === 'lesser-known') cards.sort((a, b) => (scores.get(b.id) ?? 0) * 3 - b.trending / 100 - ((scores.get(a.id) ?? 0) * 3 - a.trending / 100));
    else if (f.sort === 'relevance') cards.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    return { cards: cards.slice(0, limit), total: cards.length };
  }
  return { cards: cards.slice(0, limit), total };
}

export const getVocabulary = cache(async (): Promise<Vocabulary> => {
  const [notes, brands, fragrances] = await Promise.all([
    sql<{ slug: string; name: string; aliases: string[]; family: string }>('select slug, name, aliases, family from public.notes'),
    sql<{ slug: string; name: string }>('select slug, name from public.brands'),
    sql<{ slug: string; name: string; brand_name: string }>(
      `select f.slug, f.name, b.name brand_name from public.fragrances f join public.brands b on b.id = f.brand_id where f.visibility = 'public'`,
    ),
  ]);
  return { notes, brands, fragrances: fragrances.map((f) => ({ slug: f.slug, name: f.name, brandName: f.brand_name })) };
});
