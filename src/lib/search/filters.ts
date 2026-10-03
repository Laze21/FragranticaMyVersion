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

export interface FilterChip {
  key: string;
  /** The chip text: "No tobacco", "Lasts 8h+". Reuses the rail's own phrases. */
  label: string;
  /** The same thing inside a sentence: "without tobacco", "lasting 8h or more". */
  phrase: string;
  exclude: boolean;
  /** The filters with this one removed. */
  remove: Filters;
  group: FilterGroup;
}

export interface FilterNames {
  notes: Record<string, string>;
  brands: Record<string, string>;
  perfumers: Record<string, string>;
  similar: string | null;
}

const CONTEXT_PHRASE: Record<string, string> = {
  spring: 'for spring',
  summer: 'for summer',
  autumn: 'for autumn',
  winter: 'for winter',
  day: 'for daytime',
  night: 'for nights',
  hot: 'for hot days',
  mild: 'for mild days',
  cold: 'for cold days',
  rain: 'for rainy days',
  humid: 'for humid days',
  office: 'for the office',
  school: 'for school',
  date: 'for a date',
  formal: 'for formal occasions',
  casual: 'for every day',
  nightlife: 'for nights out',
  special: 'for a special occasion',
  outdoors: 'for outdoors',
};
const KIND_LABEL: Record<string, [string, string]> = {
  designer: ['Designer', 'from designer houses'],
  niche: ['Niche', 'from niche houses'],
  heritage: ['Heritage', 'from heritage houses'],
  regional: ['Middle Eastern & regional', 'from Middle Eastern houses'],
  indie: ['Independent', 'from independent houses'],
  mass: ['High street', 'from the high street'],
};
const CONC_SHORT: Record<string, string> = { cologne: 'Cologne', edc: 'EDC', edt: 'EDT', edp: 'EDP', parfum: 'Parfum', extrait: 'Extrait', oil: 'Oil', body_mist: 'Body mist' };
const PRICE_LABEL: Record<string, string> = { budget: 'Budget', accessible: 'Accessible', premium: 'Premium', luxury: 'Luxury', ultra: 'Rarefied' };
const DIM_LABEL = (d: string) => d[0].toUpperCase() + d.slice(1);
const CONTEXT_LABEL: Record<string, string> = { special: 'Special occasion' };
const titleCase = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Every active filter as a removable chip with the phrase the page title is built from. One
 * function, so the chip row, the H1 and the sheet's count never disagree about what is set.
 * Order: the reference fragrance, the notes, the exclusions, then everything else in rail order.
 */
export function describeFilters(f: Filters, names: FilterNames): FilterChip[] {
  const out: FilterChip[] = [];
  const drop = <K extends keyof Filters>(k: K, v: Filters[K]): Filters => ({ ...f, [k]: v });
  const without = <K extends 'include' | 'exclude' | 'excludeFamilies' | 'dims' | 'avoidDims' | 'seasons' | 'times' | 'weather' | 'occasions' | 'priceBands' | 'brandKinds' | 'brands' | 'perfumers' | 'concentrations'>(k: K, v: string) =>
    drop(k, (f[k] as string[]).filter((x) => x !== v) as Filters[K]);
  const push = (key: string, label: string, phrase: string, remove: Filters, group: FilterGroup, exclude = false) => out.push({ key, label, phrase, exclude, remove, group });

  if (f.q) push('q', `“${f.q}”`, `“${f.q}”`, drop('q', ''), 'notes');
  if (f.similarTo) {
    const n = names.similar ?? f.similarTo;
    push('like', `Like ${n}`, `like ${n}`, drop('similarTo', null), 'notes');
  }
  for (const s of f.include) push(`with:${s}`, names.notes[s] ?? s, (names.notes[s] ?? s).toLowerCase(), without('include', s), 'notes');
  for (const s of f.exclude) {
    const n = (names.notes[s] ?? s).toLowerCase();
    push(`without:${s}`, `No ${n}`, `without ${n}`, without('exclude', s), 'notes', true);
  }
  for (const s of f.excludeFamilies) push(`not-family:${s}`, `Not ${s}-heavy`, `not ${s}-heavy`, without('excludeFamilies', s), 'notes', true);
  for (const d of f.dims) push(`feels:${d}`, DIM_LABEL(d), d, without('dims', d), 'character');
  for (const d of f.avoidDims) push(`not-feels:${d}`, `Not too ${d}`, `not too ${d}`, without('avoidDims', d), 'character', true);
  for (const k of ['seasons', 'weather', 'times', 'occasions'] as const) {
    for (const s of f[k]) push(`${k}:${s}`, CONTEXT_LABEL[s] ?? titleCase(s), CONTEXT_PHRASE[s] ?? `for ${s}`, without(k, s), 'wear');
  }
  if (f.longevityMin !== null) push('lasts', `Lasts ${f.longevityMin}h+`, `lasting ${f.longevityMin}h or more`, drop('longevityMin', null), 'longevity');
  if (f.priceMax !== null) push('under', `Under $${f.priceMax}`, `under $${f.priceMax}`, drop('priceMax', null), 'price');
  for (const b of f.priceBands) push(`price:${b}`, PRICE_LABEL[b] ?? titleCase(b), (PRICE_LABEL[b] ?? b).toLowerCase(), without('priceBands', b), 'price');
  if (f.projectionMin !== null) push('proj-min', 'Noticeable', 'noticeable', drop('projectionMin', null), 'projection');
  if (f.projectionMax !== null) push('proj-max', 'Stays close', 'staying close', drop('projectionMax', null), 'projection');
  for (const b of f.brands) push(`house:${b}`, names.brands[b] ?? b, `by ${names.brands[b] ?? b}`, without('brands', b), 'house');
  for (const p of f.perfumers) push(`nose:${p}`, names.perfumers[p] ?? p, `by ${names.perfumers[p] ?? p}`, without('perfumers', p), 'house');
  for (const k of f.brandKinds) {
    const [label, phrase] = KIND_LABEL[k] ?? [titleCase(k), `from ${k} houses`];
    push(`house-type:${k}`, label, phrase, without('brandKinds', k), 'house');
  }
  for (const c of f.concentrations) push(`conc:${c}`, CONC_SHORT[c] ?? c, `as ${CONC_SHORT[c] ?? c}`, without('concentrations', c), 'concentration');
  for (const d of f.decades) push(`decade:${d}`, `${d}s`, `from the ${d}s`, drop('decades', f.decades.filter((x) => x !== d)), 'released');
  if (f.yearMin !== null && f.yearMax !== null && f.yearMin === f.yearMax) {
    push('year', `Released ${f.yearMin}`, `released in ${f.yearMin}`, { ...f, yearMin: null, yearMax: null }, 'released');
  } else {
    if (f.yearMin !== null) push('from', `${f.yearMin} or later`, `from ${f.yearMin}`, drop('yearMin', null), 'released');
    if (f.yearMax !== null) push('before', `Before ${f.yearMax + 1}`, `before ${f.yearMax + 1}`, drop('yearMax', null), 'released');
  }
  if (f.available) push('available', 'In production only', 'still in production', drop('available', false), 'released');
  if (f.ratingMin !== null) push('rating', `Rated ${f.ratingMin}+`, `rated ${f.ratingMin} or more`, drop('ratingMin', null), 'rating');
  if (f.reviewsMin !== null) push('reviews', `${f.reviewsMin}+ reviews`, `with ${f.reviewsMin} reviews or more`, drop('reviewsMin', null), 'rating');
  if (f.noteMatch !== 'any') {
    const l = f.noteMatch === 'listed' ? 'Listed by the house' : 'Noticed by people';
    push('match', l, l.toLowerCase(), drop('noteMatch', 'any'), 'notes');
  }
  return out;
}
