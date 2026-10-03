/**
 * The real catalogue, assembled from the three research batches.
 * Brands, perfumers and extra notes may repeat across batches; first definition wins.
 */
import { isSpecV1, v1ToV2 } from '@/lib/bottle/legacy';
import type { BottleSpec } from '@/lib/bottle/spec';
import type { SeedBrand, SeedFragrance, SeedNote, SeedPerfumer } from '../types';
import { BRANDS_A } from './brands-a';
import { BRANDS_B } from './brands-b';
import { BRANDS_C } from './brands-c';
import { FRAGRANCES_A } from './fragrances-a';
import { FRAGRANCES_B } from './fragrances-b';
import { FRAGRANCES_C } from './fragrances-c';
import { NOTES_EXTRA_A } from './notes-extra-a';
import { NOTES_EXTRA_B } from './notes-extra-b';
import { NOTES_EXTRA_C } from './notes-extra-c';
import { PERFUMERS_A } from './perfumers-a';
import { PERFUMERS_B } from './perfumers-b';
import { PERFUMERS_C } from './perfumers-c';

function dedupe<T extends { slug: string }>(xs: T[]): T[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
}

/** A seed fragrance whose bottle is always a v2 spec. */
export type CatalogFragrance = Omit<SeedFragrance, 'bottle'> & { bottle: BottleSpec };

const brands = dedupe([...BRANDS_A, ...BRANDS_B, ...BRANDS_C]);
const brandName = Object.fromEntries(brands.map((b) => [b.slug, b.name]));

export const CATALOG: { fragrances: CatalogFragrance[]; brands: SeedBrand[]; perfumers: SeedPerfumer[]; notesExtra: SeedNote[] } = {
  fragrances: [...FRAGRANCES_A, ...FRAGRANCES_B, ...FRAGRANCES_C].map((f) => ({
    ...f,
    bottle: isSpecV1(f.bottle) ? v1ToV2(f.bottle, brandName[f.brand] ?? f.brand, f.name) : f.bottle,
  })),
  brands,
  perfumers: dedupe([...PERFUMERS_A, ...PERFUMERS_B, ...PERFUMERS_C]),
  notesExtra: dedupe([...NOTES_EXTRA_A, ...NOTES_EXTRA_B, ...NOTES_EXTRA_C]),
};
