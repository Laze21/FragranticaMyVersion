import 'server-only';
import { cache } from 'react';
import { sql } from '@/lib/db';
import { getCards } from './catalog';
import type { FragranceCard } from './types';

/**
 * The two directories: every house and every perfumer with work in the catalogue, each with the
 * three fragrances people own most, so the index reads as a shelf rather than a phone book.
 */

export type HouseEntry = {
  slug: string;
  name: string;
  kind: string;
  country: string | null;
  city: string | null;
  foundedYear: number | null;
  parentCompany: string | null;
  knownFor: string | null;
  count: number;
  work: FragranceCard[];
};

export type PerfumerEntry = {
  slug: string;
  name: string;
  country: string | null;
  bornYear: number | null;
  signature: string | null;
  count: number;
  work: FragranceCard[];
};

const WORK_SHOWN = 3;

const allCards = cache(() => getCards('true', [], 's.popularity desc nulls last, f.name', 500));

export const getHousesIndex = cache(async (): Promise<HouseEntry[]> => {
  const [brands, cards] = await Promise.all([
    sql<{ slug: string; name: string; kind: string; country: string | null; city: string | null; founded_year: number | null; parent_company: string | null; known_for: string | null }>(
      'select slug, name, kind, country, city, founded_year, parent_company, known_for from public.brands order by name',
    ),
    allCards(),
  ]);
  const byBrand = new Map<string, FragranceCard[]>();
  for (const c of cards) {
    const list = byBrand.get(c.brandSlug) ?? [];
    list.push(c);
    byBrand.set(c.brandSlug, list);
  }
  return brands
    .map((b) => {
      const work = byBrand.get(b.slug) ?? [];
      return {
        slug: b.slug,
        name: b.name,
        kind: b.kind,
        country: b.country,
        city: b.city,
        foundedYear: b.founded_year == null ? null : Number(b.founded_year),
        parentCompany: b.parent_company,
        knownFor: b.known_for,
        count: work.length,
        work: work.slice(0, WORK_SHOWN),
      };
    })
    .filter((b) => b.count > 0);
});

export const getPerfumersIndex = cache(async (): Promise<PerfumerEntry[]> => {
  const [rows, cards] = await Promise.all([
    sql<{ slug: string; name: string; country: string | null; born_year: number | null; signature: string | null; fragrance_id: string | null }>(
      `select p.slug, p.name, p.country, p.born_year, p.signature, fp.fragrance_id
         from public.perfumers p
         left join public.fragrance_perfumers fp on fp.perfumer_id = p.id
        order by p.name`,
    ),
    allCards(),
  ]);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const people = new Map<string, PerfumerEntry>();
  for (const r of rows) {
    const entry =
      people.get(r.slug) ??
      people
        .set(r.slug, {
          slug: r.slug,
          name: r.name,
          country: r.country,
          bornYear: r.born_year == null ? null : Number(r.born_year),
          signature: r.signature,
          count: 0,
          work: [],
        })
        .get(r.slug)!;
    const card = r.fragrance_id ? byId.get(r.fragrance_id) : undefined;
    if (card) entry.work.push(card);
  }
  const out = [...people.values()].filter((p) => p.work.length > 0);
  for (const p of out) {
    // The join comes back in name order; the shelf order is the popular one.
    p.work.sort((a, b) => b.ownCount - a.ownCount || a.name.localeCompare(b.name));
    p.count = p.work.length;
    p.work = p.work.slice(0, WORK_SHOWN);
  }
  return out.sort((a, b) => surname(a.name).localeCompare(surname(b.name)) || a.name.localeCompare(b.name));
});

/** Perfumers are listed by surname, the way a credits page reads. */
export function surname(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}
