import 'server-only';
import { cache } from 'react';
import { sql } from '@/lib/db';
import { DIMENSIONS } from '@/lib/scent/vocab';
import { getCards } from './catalog';
import type { FragranceCard, Vec } from './types';

/**
 * Similarity = 50% character fingerprint (cosine) + 30% note overlap (listed + perceived,
 * weighted) + 10% community "smells similar" votes + 10% shared ownership.
 *
 * At prototype scale this runs in memory; in production the same scoring fills a
 * fragrance_similarity table nightly (top 50 per fragrance) and the page reads from it.
 * We never label anything a "clone": we show overlap and let people judge.
 */
export interface SimilarItem {
  card: FragranceCard;
  score: number; // 0..1
  why: string;
  pricePerMl: number | null;
}
export interface SimilarGroups {
  similar: SimilarItem[];
  cheaper: SimilarItem[];
  higherRated: SimilarItem[];
  fresher: SimilarItem[];
  sweeter: SimilarItem[];
  darker: SimilarItem[];
  stronger: SimilarItem[];
  subtler: SimilarItem[];
}

interface Profile {
  card: FragranceCard;
  vec: number[];
  notes: Map<string, number>;
  pricePerMl: number | null;
  scentAvg: number | null;
}

const loadProfiles = cache(async (): Promise<Profile[]> => {
  const [cards, extra, listed] = await Promise.all([
    getCards('true', [], 'f.name', 500),
    sql<{ id: string; price: string | null; size: string | null; perceived: Record<string, number> | null; scent_avg: string | null }>(
      `select f.id, f.typical_price_usd price, f.typical_size_ml size, s.perceived, s.scent_avg
         from public.fragrances f left join public.fragrance_stats s on s.fragrance_id = f.id`,
    ),
    sql<{ fragrance_id: string; slug: string }>(
      `select fn.fragrance_id, n.slug from public.fragrance_notes fn join public.notes n on n.id = fn.note_id`,
    ),
  ]);
  const byId = new Map(extra.map((e) => [e.id, e]));
  const listedBy = new Map<string, string[]>();
  for (const l of listed) listedBy.set(l.fragrance_id, [...(listedBy.get(l.fragrance_id) ?? []), l.slug]);
  return cards.map((card) => {
    const e = byId.get(card.id);
    const notes = new Map<string, number>();
    for (const s of listedBy.get(card.id) ?? []) notes.set(s, 0.5);
    for (const [s, share] of Object.entries(e?.perceived ?? {})) notes.set(s, Math.max(notes.get(s) ?? 0, Number(share)));
    const price = e?.price ? Number(e.price) : null;
    const size = e?.size ? Number(e.size) : null;
    return {
      card,
      vec: DIMENSIONS.map((d) => card.character.overall[d] ?? 0),
      notes,
      pricePerMl: price && size ? price / size : null,
      scentAvg: e?.scent_avg ? Number(e.scent_avg) : null,
    };
  });
});

const cosine = (a: number[], b: number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

const weightedJaccard = (a: Map<string, number>, b: Map<string, number>) => {
  let min = 0;
  let max = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(k) ?? 0;
    const y = b.get(k) ?? 0;
    min += Math.min(x, y);
    max += Math.max(x, y);
  }
  return max ? min / max : 0;
};

const sum = (v: Vec, ds: Array<keyof Vec>) => ds.reduce((s, d) => s + (v[d] ?? 0), 0);

export async function getSimilar(fragranceId: string): Promise<SimilarGroups> {
  const profiles = await loadProfiles();
  const me = profiles.find((p) => p.card.id === fragranceId);
  const empty: SimilarGroups = { similar: [], cheaper: [], higherRated: [], fresher: [], sweeter: [], darker: [], stronger: [], subtler: [] };
  if (!me) return empty;

  const [votes, coOwn] = await Promise.all([
    sql<{ other: string; score: string }>(
      `select case when fragrance_id = $1 then similar_id else fragrance_id end as other,
              sum(case when verdict = 'similar' then 1 else -1 end) as score
         from public.similarity_votes where fragrance_id = $1 or similar_id = $1 group by 1`,
      [fragranceId],
    ),
    sql<{ fragrance_id: string; n: string }>(
      `select b.fragrance_id, count(*) n
         from public.collection_items a
         join public.collection_items b on b.collection_id = a.collection_id and b.fragrance_id <> a.fragrance_id
        where a.fragrance_id = $1 and a.status in ('own','had') and b.status in ('own','had')
        group by b.fragrance_id`,
      [fragranceId],
    ),
  ]);
  const voteMap = new Map(votes.map((v) => [v.other, Number(v.score)]));
  const coMap = new Map(coOwn.map((c) => [c.fragrance_id, Number(c.n)]));
  const maxCo = Math.max(1, ...coMap.values());

  const scored = profiles
    .filter((p) => p.card.id !== fragranceId && p.card.status !== 'upcoming')
    .map((p) => {
      const fp = cosine(me.vec, p.vec);
      const nj = weightedJaccard(me.notes, p.notes);
      const v = Math.tanh((voteMap.get(p.card.id) ?? 0) / 5) * 0.5 + 0.5;
      const co = (coMap.get(p.card.id) ?? 0) / maxCo;
      const score = 0.5 * fp + 0.3 * nj + 0.1 * (voteMap.has(p.card.id) ? v : fp) + 0.1 * co;
      const shared = [...me.notes.keys()].filter((k) => (me.notes.get(k) ?? 0) >= 0.3 && (p.notes.get(k) ?? 0) >= 0.3).slice(0, 3);
      return { p, score, shared };
    })
    .sort((a, b) => b.score - a.score);

  const item = (x: (typeof scored)[number], why: string): SimilarItem => ({ card: x.p.card, score: x.score, why, pricePerMl: x.p.pricePerMl });
  const sharedWhy = (x: (typeof scored)[number]) => (x.shared.length ? `Shares ${x.shared.map((s) => s.replace(/-/g, ' ')).join(', ')}` : 'Similar character');
  const close = scored.filter((x) => x.score >= 0.42);
  const mc = me.card.character.overall;
  const delta = (x: (typeof scored)[number], ds: Array<keyof Vec>) => sum(x.p.card.character.overall, ds) - sum(mc, ds);

  return {
    similar: close.slice(0, 8).map((x) => item(x, sharedWhy(x))),
    cheaper: me.pricePerMl
      ? close
          .filter((x) => x.p.pricePerMl && x.p.pricePerMl < me.pricePerMl! * 0.7)
          .slice(0, 6)
          .map((x) => item(x, `About ${Math.round((1 - x.p.pricePerMl! / me.pricePerMl!) * 100)}% less per ml`))
      : [],
    higherRated: close
      .filter((x) => x.p.scentAvg && me.scentAvg && x.p.scentAvg - me.scentAvg >= 0.25 && x.p.card.ratingCount >= 30)
      .slice(0, 6)
      .map((x) => item(x, `Scent rated ${x.p.scentAvg!.toFixed(1)} vs ${me.scentAvg!.toFixed(1)}`)),
    fresher: close.filter((x) => delta(x, ['fresh', 'green', 'clean']) > 0.12).slice(0, 6).map((x) => item(x, 'Brighter, airier')),
    sweeter: close.filter((x) => delta(x, ['sweet', 'creamy']) > 0.12).slice(0, 6).map((x) => item(x, 'Sweeter, softer')),
    darker: close.filter((x) => delta(x, ['smoky', 'warm', 'earthy']) > 0.12).slice(0, 6).map((x) => item(x, 'Deeper, darker')),
    stronger: close
      .filter((x) => (x.p.card.projectionOpening ?? 0) - (me.card.projectionOpening ?? 0) > 0.35 || (x.p.card.longevityHrs ?? 0) - (me.card.longevityHrs ?? 0) > 2)
      .slice(0, 6)
      .map((x) => item(x, 'Projects or lasts more')),
    subtler: close
      .filter((x) => (me.card.projectionOpening ?? 0) - (x.p.card.projectionOpening ?? 0) > 0.35)
      .slice(0, 6)
      .map((x) => item(x, 'Sits closer to skin')),
  };
}

/** Score helper for Discover's "similar to" filter. */
export async function similarityScores(slug: string): Promise<Map<string, number>> {
  const profiles = await loadProfiles();
  const me = profiles.find((p) => p.card.slug === slug);
  if (!me) return new Map();
  return new Map(profiles.filter((p) => p !== me).map((p) => [p.card.id, 0.6 * cosine(me.vec, p.vec) + 0.4 * weightedJaccard(me.notes, p.notes)]));
}
