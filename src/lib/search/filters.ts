/**
 * Discover filter state. Lives in the URL so every search is shareable and bookmarkable
 * (our "saved searches" for free).
 */
import type { Dimension } from '@/lib/scent/vocab';

export type NoteMatch = 'any' | 'listed' | 'perceived';
export type SortKey = 'relevance' | 'popular' | 'rating' | 'newest' | 'trending' | 'lesser-known' | 'longest';

export interface Filters {
  q: string;
  include: string[]; // note slugs
  exclude: string[]; // note slugs
  excludeFamilies: string[]; // note families, e.g. citrus
  noteMatch: NoteMatch;
  dims: Dimension[]; // character the fragrance should have
  avoidDims: Dimension[]; // character it should not lean on
  seasons: string[];
  times: string[];
  weather: string[];
  occasions: string[];
  longevityMin: number | null;
  projectionMin: number | null;
  projectionMax: number | null;
  decades: number[];
  ratingMin: number | null;
  reviewsMin: number | null;
  priceBands: string[];
  priceMax: number | null;
  brandKinds: string[];
  brands: string[];
  concentrations: string[];
  available: boolean; // hide discontinued and unreleased
  similarTo: string | null;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  include: [],
  exclude: [],
  excludeFamilies: [],
  noteMatch: 'any',
  dims: [],
  avoidDims: [],
  seasons: [],
  times: [],
  weather: [],
  occasions: [],
  longevityMin: null,
  projectionMin: null,
  projectionMax: null,
  decades: [],
  ratingMin: null,
  reviewsMin: null,
  priceBands: [],
  priceMax: null,
  brandKinds: [],
  brands: [],
  concentrations: [],
  available: false,
  similarTo: null,
  sort: 'relevance',
};

const LIST_KEYS = [
  'include',
  'exclude',
  'excludeFamilies',
  'dims',
  'avoidDims',
  'seasons',
  'times',
  'weather',
  'occasions',
  'priceBands',
  'brandKinds',
  'brands',
  'concentrations',
] as const;
const NUM_KEYS = ['longevityMin', 'projectionMin', 'projectionMax', 'ratingMin', 'reviewsMin', 'priceMax'] as const;
const URL_NAMES: Record<string, string> = {
  include: 'with',
  exclude: 'without',
  excludeFamilies: 'not-family',
  dims: 'feels',
  avoidDims: 'not-feels',
  seasons: 'season',
  times: 'time',
  weather: 'weather',
  occasions: 'for',
  priceBands: 'price',
  brandKinds: 'house-type',
  brands: 'house',
  concentrations: 'conc',
  longevityMin: 'lasts',
  projectionMin: 'proj-min',
  projectionMax: 'proj-max',
  ratingMin: 'rating',
  reviewsMin: 'reviews',
  priceMax: 'under',
  decades: 'decade',
  noteMatch: 'match',
  available: 'available',
  similarTo: 'like',
  sort: 'sort',
  q: 'q',
};

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const get = (k: string) => {
    const v = sp[URL_NAMES[k] ?? k];
    return Array.isArray(v) ? v.join(',') : v ?? '';
  };
  const f: Filters = structuredClone(EMPTY_FILTERS);
  f.q = get('q').slice(0, 160);
  for (const k of LIST_KEYS) {
    (f[k] as string[]) = get(k)
      .split(',')
      .map(clean)
      .filter(Boolean)
      .slice(0, 12);
  }
  for (const k of NUM_KEYS) {
    const v = Number.parseFloat(get(k));
    f[k] = Number.isFinite(v) ? v : null;
  }
  f.decades = get('decades')
    .split(',')
    .map((d) => Number.parseInt(d, 10))
    .filter((d) => d >= 1800 && d <= 2100);
  const m = get('noteMatch');
  f.noteMatch = m === 'listed' || m === 'perceived' ? m : 'any';
  f.available = get('available') === '1';
  f.similarTo = clean(get('similarTo')) || null;
  const s = get('sort') as SortKey;
  f.sort = ['relevance', 'popular', 'rating', 'newest', 'trending', 'lesser-known', 'longest'].includes(s) ? s : 'relevance';
  return f;
}

export function filtersToSearch(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  for (const k of LIST_KEYS) if (f[k].length) p.set(URL_NAMES[k], f[k].join(','));
  for (const k of NUM_KEYS) if (f[k] !== null) p.set(URL_NAMES[k], String(f[k]));
  if (f.decades.length) p.set('decade', f.decades.join(','));
  if (f.noteMatch !== 'any') p.set('match', f.noteMatch);
  if (f.available) p.set('available', '1');
  if (f.similarTo) p.set('like', f.similarTo);
  if (f.sort !== 'relevance') p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  for (const k of LIST_KEYS) n += f[k].length;
  for (const k of NUM_KEYS) if (f[k] !== null) n++;
  n += f.decades.length + (f.available ? 1 : 0) + (f.similarTo ? 1 : 0) + (f.noteMatch !== 'any' ? 1 : 0);
  return n;
}
