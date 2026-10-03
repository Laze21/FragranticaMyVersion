import 'server-only';
import { cache } from 'react';
import { sql, sqlOne } from '@/lib/db';
import { getCards } from './catalog';
import type { Character, FragranceCard, Vec } from './types';
import { DIMENSIONS, type Dimension } from '@/lib/scent/vocab';
import type { TrailInput } from '@/lib/scent/trail';

export const getBrand = cache(async (slug: string) => {
  const b = await sqlOne<Record<string, unknown>>('select * from public.brands where slug = $1', [slug]);
  if (!b) return null;
  const cards = await getCards('b.id = $1', [b.id], 'f.release_year desc nulls last, f.name', 200);
  return { brand: b, cards };
});

export const getPerfumer = cache(async (slug: string) => {
  const p = await sqlOne<Record<string, unknown>>('select * from public.perfumers where slug = $1', [slug]);
  if (!p) return null;
  const cards = await getCards(
    'exists (select 1 from public.fragrance_perfumers fp where fp.fragrance_id = f.id and fp.perfumer_id = $1)',
    [p.id],
    'f.release_year desc nulls last, f.name',
    200,
  );
  return { perfumer: p, cards };
});

export async function allBrandSlugs() {
  return (await sql<{ slug: string }>('select slug from public.brands')).map((r) => r.slug);
}
export async function allPerfumerSlugs() {
  return (await sql<{ slug: string }>('select slug from public.perfumers')).map((r) => r.slug);
}

function meanVec(vecs: Vec[]): Vec {
  const out: Vec = {};
  if (!vecs.length) return out;
  for (const d of DIMENSIONS) {
    const v = vecs.reduce((s, vec) => s + (vec[d as Dimension] ?? 0), 0) / vecs.length;
    if (v > 0.02) out[d] = Math.round(v * 1000) / 1000;
  }
  return out;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.round((s.length - 1) * p))];
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Average character across a body of work: a house's or perfumer's signature. */
export function averageCharacter(cards: FragranceCard[]): Vec {
  return meanVec(cards.map((c) => c.character.overall));
}

/**
 * A body of work as one Trail: every phase vector averaged, the median longevity as the end,
 * the 72nd percentile as the faded tail. The same geometry as a fragrance's own Trail, so a
 * house signature and the bottle that defines it can be read against each other. Null when
 * there is nothing to average.
 */
export function signatureTrail(cards: FragranceCard[]): TrailInput | null {
  if (!cards.length) return null;
  const character: Character = {
    overall: meanVec(cards.map((c) => c.character.overall)),
    opening: meanVec(cards.map((c) => c.character.opening)),
    heart: meanVec(cards.map((c) => c.character.heart)),
    drydown: meanVec(cards.map((c) => c.character.drydown)),
  };
  if (!Object.keys(character.opening).length && !Object.keys(character.drydown).length) return null;
  const lon = cards.map((c) => c.longevityHrs).filter((x): x is number => x !== null);
  return {
    character,
    longevityHrs: median(lon),
    longevityLateHrs: percentile(lon, 0.72),
    projectionOpening: mean(cards.map((c) => c.projectionOpening).filter((x): x is number => x !== null)),
    projectionLater: mean(cards.map((c) => c.projectionLater).filter((x): x is number => x !== null)),
    heartAtMin: Math.round(mean(cards.map((c) => c.heartAtMin)) ?? 20),
    drydownAtMin: Math.round(mean(cards.map((c) => c.drydownAtMin)) ?? 150),
  };
}

/** The span of release years in a body of work, for "years active" lines. */
export function yearsActive(cards: FragranceCard[]): { from: number; to: number } | null {
  const years = cards.map((c) => c.releaseYear).filter((y): y is number => y !== null);
  if (!years.length) return null;
  return { from: Math.min(...years), to: Math.max(...years) };
}

/** Houses a perfumer has work with here, most work first. */
export function housesWorkedWith(cards: FragranceCard[]): Array<{ slug: string; name: string; count: number }> {
  const by = new Map<string, { slug: string; name: string; count: number }>();
  for (const c of cards) {
    const h = by.get(c.brandSlug) ?? { slug: c.brandSlug, name: c.brandName, count: 0 };
    h.count += 1;
    by.set(c.brandSlug, h);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
