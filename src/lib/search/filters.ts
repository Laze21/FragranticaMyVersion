/**
 * Discover filter state. Lives in the URL so every search is shareable and bookmarkable
 * (our "saved searches" for free).
 */
import type { Dimension } from '@/lib/scent/vocab';

export type NoteMatch = 'any' | 'listed' | 'perceived';
export type SortKey = 'relevance' | 'popular' | 'rating' | 'newest' | 'trending' | 'lesser-known' | 'longest';
/** Result density. Not a filter: it never counts toward "Filters · 2". */
export type ViewKey = 'floor' | 'row';

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
  yearMin: number | null; // "from 2015"
  yearMax: number | null; // "before 2000"
  ratingMin: number | null;
  reviewsMin: number | null;
  priceBands: string[];
  priceMax: number | null;
  brandKinds: string[];
  brands: string[];
  perfumers: string[]; // perfumer slugs
  concentrations: string[];
  available: boolean; // in production only: hides discontinued and unreleased
  similarTo: string | null;
  sort: SortKey;
  view: ViewKey;
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
  yearMin: null,
  yearMax: null,
  ratingMin: null,
  reviewsMin: null,
  priceBands: [],
  priceMax: null,
  brandKinds: [],
  brands: [],
  perfumers: [],
  concentrations: [],
  available: false,
  similarTo: null,
  sort: 'relevance',
  view: 'floor',
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
  'perfumers',
  'concentrations',
] as const;
const NUM_KEYS = ['longevityMin', 'projectionMin', 'projectionMax', 'ratingMin', 'reviewsMin', 'priceMax', 'yearMin', 'yearMax'] as const;
const SORTS: SortKey[] = ['relevance', 'popular', 'rating', 'newest', 'trending', 'lesser-known', 'longest'];
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
  perfumers: 'nose',
  concentrations: 'conc',
  longevityMin: 'lasts',
  projectionMin: 'proj-min',
  projectionMax: 'proj-max',
  ratingMin: 'rating',
  reviewsMin: 'reviews',
  priceMax: 'under',
  yearMin: 'from',
  yearMax: 'before',
  decades: 'decade',
  noteMatch: 'match',
  available: 'available',
  similarTo: 'like',
  sort: 'sort',
  view: 'view',
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
  // Years outside the catalogue's possible range are typos, not filters.
  for (const k of ['yearMin', 'yearMax'] as const) if (f[k] !== null && (f[k]! < 1700 || f[k]! > 2100)) f[k] = null;
  f.decades = get('decades')
    .split(',')
    .map((d) => Number.parseInt(d, 10))
    .filter((d) => d >= 1800 && d <= 2100);
  const m = get('noteMatch');
  f.noteMatch = m === 'listed' || m === 'perceived' ? m : 'any';
  f.available = get('available') === '1';
  f.similarTo = clean(get('similarTo')) || null;
  const s = get('sort') as SortKey;
  f.sort = SORTS.includes(s) ? s : 'relevance';
  f.view = get('view') === 'row' ? 'row' : 'floor';
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
  if (f.view !== 'floor') p.set('view', f.view);
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

/**
 * The rail's groups, in rail order. interpret() tags what it could not read with one of these
 * so the "Couldn't read" fragment can point at the control that would have taken it.
 */
export type FilterGroup = 'notes' | 'longevity' | 'price' | 'character' | 'wear' | 'projection' | 'house' | 'concentration' | 'released' | 'rating';
export const FILTER_GROUP_LABEL: Record<FilterGroup, string> = {
  notes: 'pick a note',
  longevity: 'set a longevity',
  price: 'set a price',
  character: 'pick a character',
  wear: 'pick a season or occasion',
  projection: 'set a projection',
  house: 'pick a house',
  concentration: 'pick a concentration',
  released: 'set a release date',
  rating: 'set a rating',
};
