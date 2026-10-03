import 'server-only';
import { cache } from 'react';
import { sql, sqlOne } from '@/lib/db';
import { getCards } from './catalog';
import type { FragranceCard, Vec } from './types';
import { DIMENSIONS } from '@/lib/scent/vocab';

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

/** Average character across a body of work: a house's or perfumer's signature. */
export function averageCharacter(cards: FragranceCard[]): Vec {
  const out: Vec = {};
  if (!cards.length) return out;
  for (const d of DIMENSIONS) {
    const v = cards.reduce((s, c) => s + (c.character.overall[d] ?? 0), 0) / cards.length;
    if (v > 0.02) out[d] = Math.round(v * 1000) / 1000;
  }
  return out;
}
