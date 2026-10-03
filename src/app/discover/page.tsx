import type { Metadata } from 'next';
import Link from 'next/link';
import { discover, getVocabulary, nearest, type DiscoverMeta } from '@/lib/data/search';
import type { FragranceCard as Card } from '@/lib/data/types';
import { activeFilterCount, describeFilters, EMPTY_FILTERS, filtersToSearch, parseFilters, type Filters } from '@/lib/search/filters';
import { interpret, looksLikeName, looksNatural, sentence, type Interpretation } from '@/lib/search/interpret';
import { FEELINGS, seasonalFeelings, type SeasonKey } from '@/lib/search/feelings';
import { sql } from '@/lib/db';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DiscoverControls, type RelaxOption } from '@/components/search/DiscoverControls';
import { CONCENTRATION_LABEL, PRICE_BANDS, type PriceBand } from '@/lib/scent/vocab';
import { formatCount } from '@/lib/scent/read';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Search fragrances by note, mood, season, longevity and price. Include and exclude notes, or just describe what you want.',
  alternates: { canonical: '/discover' },
};

/* Northern-hemisphere seasons by month; there is no weather feed in the prototype. */
function seasonNow(d = new Date()): SeasonKey {
  const m = d.getMonth();
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}

export default async function DiscoverPage(props: PageProps<'/discover'>) {
  const sp = await props.searchParams;
  const rawQuery = typeof sp.q === 'string' ? sp.q.slice(0, 160) : '';
  const raw = sp.raw === '1';
  let filters = parseFilters(sp);
  const vocab = await getVocabulary();

  // Anything that is not a name we have is read as a question; the chips then are the reading.
  let interpretation: Interpretation | null = null;
  if (filters.q && !raw && activeFilterCount(filters) === 0 && (looksNatural(filters.q) || !looksLikeName(filters.q, vocab))) {
    const it = interpret(filters.q, vocab);
    if (it.understood.length) {
      interpretation = it;
      filters = { ...it.filters, sort: filters.sort !== 'relevance' ? filters.sort : it.filters.sort, view: filters.view };
    }
  }

  const feeling = typeof sp.feel === 'string' ? FEELINGS.find((f) => f.slug === sp.feel) : undefined;
  if (feeling) filters = { ...feeling.filters, sort: filters.sort === 'relevance' ? feeling.filters.sort : filters.sort, q: filters.q, view: filters.view };

  const names = {
    notes: Object.fromEntries(vocab.notes.map((n) => [n.slug, n.name])),
    brands: Object.fromEntries(vocab.brands.map((b) => [b.slug, b.name])),
    perfumers: Object.fromEntries(vocab.perfumers.map((p) => [p.slug, p.name])),
    similar: filters.similarTo ? (vocab.fragrances.find((f) => f.slug === filters.similarTo)?.name ?? null) : null,
  };
  const chips = describeFilters(filters, names);
  const hasCriteria = chips.length > 0 || !!feeling;

  const [{ cards, total, meta }, decades] = await Promise.all([
    discover(filters),
    sql<{ d: number }>(`select distinct (release_year / 10 * 10)::int d from public.fragrances where release_year is not null order by d`),
  ]);
  const nearestCards = total === 0 ? await nearest(filters) : [];
  const brands = [...vocab.brands].sort((a, b) => a.name.localeCompare(b.name));
  const perfumers = [...vocab.perfumers].sort((a, b) => a.name.localeCompare(b.name));

  // The title is the question as we read it: "Vanilla, without tobacco". A feeling keeps its name.
  const title = feeling ? feeling.title : hasCriteria ? sentence(chips.map((c) => c.phrase)) : 'Find something';
  const relax = relaxOptions(filters, chips.length);
  const topMatch = hasCriteria && cards.length > 1 && filters.view === 'floor' ? (meta[cards[0].id]?.summary ?? null) : null;

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head} data-collapsed={hasCriteria || undefined}>
        <h1 className={hasCriteria ? `${styles.query} t-title` : `${styles.title} t-display`}>{title}</h1>
        {feeling && <p className={styles.feelingLine}>{feeling.line}</p>}
      </header>

      <DiscoverControls
        filters={filters}
        rawQuery={rawQuery}
        interpreted={interpretation ? { understood: interpretation.understood, unread: interpretation.unread } : null}
        chips={chips}
        notes={vocab.notes.map((n) => ({ slug: n.slug, name: n.name }))}
        decades={decades.map((d) => d.d)}
        brands={brands}
        perfumers={perfumers}
        total={total}
        shown={cards.length}
        hasCriteria={hasCriteria}
        relax={relax}
        intro={hasCriteria ? undefined : <StartSomewhere />}
      >
        {cards.length ? (
          <ul role="list" className={styles.grid} data-view={filters.view}>
            {cards.map((c, i) => (
              <li key={c.id} className={i === 0 && topMatch ? styles.top : undefined}>
                {i === 0 && topMatch ? (
                  <div className={styles.topMatch}>
                    <FragranceCard card={c} priority reason={meta[c.id]?.reason ?? undefined} compareSelect={{ name: 'compare' }} sizes="(max-width: 719px) 90vw, (max-width: 1100px) 46vw, 300px" />
                    <div className={styles.topText}>
                      <p className="kicker">Top match</p>
                      <p className={styles.summary}>{topMatch}</p>
                    </div>
                  </div>
                ) : filters.view === 'row' ? (
                  <FragranceCard card={c} variant="row" reason={meta[c.id]?.reason ?? undefined} metric={rowMetric(c, filters)} />
                ) : (
                  <FragranceCard card={c} priority={i < 4} reason={meta[c.id]?.reason ?? undefined} compareSelect={{ name: 'compare' }} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <NoResults filters={filters} relax={relax} nearest={nearestCards} interpreted={!!interpretation} raw={raw && !!filters.q} />
        )}
      </DiscoverControls>
    </div>
  );
}

/* The empty page's invitation: the feelings that fit the season, then the two other ways in. */
function StartSomewhere() {
  const { lead, rest } = seasonalFeelings(seasonNow());
  const picks = [...lead, ...rest].slice(0, 6);
  return (
    <nav className={styles.start} aria-label="Start somewhere">
      <p className={styles.startLabel}>Start somewhere</p>
      <ul role="list" className={styles.startList}>
        {picks.map((f) => (
          <li key={f.slug}>
            <Link href={`/discover?feel=${f.slug}`}>{f.title}</Link>
          </li>
        ))}
        <li className={styles.startOther}>
          <Link href="/house">by house</Link>
        </li>
        <li className={styles.startOther}>
          <Link href="/notes">by note</Link>
        </li>
      </ul>
    </nav>
  );
}

/* The row variant's right-hand figure is whatever the list is sorted by. */
function rowMetric(c: Card, f: Filters): string {
  if (f.sort === 'longest') return c.longevityHrs ? `${Math.round(c.longevityHrs)}h` : 'Not enough votes';
  if (f.sort === 'rating') return c.ratingAvg && c.ratingCount >= 5 ? `${c.ratingAvg.toFixed(1)}/10` : 'Unrated';
  if (f.sort === 'newest') return c.releaseYear ? String(c.releaseYear) : 'Not known yet';
  if (f.sort === 'popular' || f.sort === 'trending') return `${formatCount(c.ownCount)} own it`;
  const conc = c.concentration ? CONCENTRATION_LABEL[c.concentration]?.short : null;
  return [c.longevityHrs ? `${Math.round(c.longevityHrs)}h` : null, c.priceBand ? PRICE_BANDS[c.priceBand as PriceBand]?.glyph : null, conc].filter(Boolean).join(' · ');
}

/* One chip per constraint that could be loosened, as links so they work inside the sheet too. */
function relaxOptions(filters: Filters, chipCount: number): RelaxOption[] {
  const out: RelaxOption[] = [];
  const add = (label: string, next: Filters) => out.push({ label, href: `/discover${filtersToSearch(next)}` });
  if (filters.exclude.length || filters.excludeFamilies.length || filters.avoidDims.length) add('Allow what was ruled out', { ...filters, exclude: [], excludeFamilies: [], avoidDims: [] });
  if (filters.include.length > 1) add('Match any one note, not all', { ...filters, include: filters.include.slice(0, 1) });
  if (filters.noteMatch !== 'any') add('Count listed or smelled', { ...filters, noteMatch: 'any' });
  if (filters.longevityMin) add('Any longevity', { ...filters, longevityMin: null });
  if (filters.priceMax || filters.priceBands.length) add('Any price', { ...filters, priceMax: null, priceBands: [] });
  if (filters.occasions.length || filters.seasons.length || filters.weather.length || filters.times.length) add('Any season or occasion', { ...filters, occasions: [], seasons: [], weather: [], times: [] });
  if (filters.dims.length) add('Any character', { ...filters, dims: [] });
  if (filters.projectionMin !== null || filters.projectionMax !== null) add('Any projection', { ...filters, projectionMin: null, projectionMax: null });
  if (filters.brands.length || filters.perfumers.length || filters.brandKinds.length) add('Any house', { ...filters, brands: [], perfumers: [], brandKinds: [] });
  if (filters.decades.length || filters.yearMin !== null || filters.yearMax !== null) add('Any year', { ...filters, decades: [], yearMin: null, yearMax: null });
  if (filters.concentrations.length) add('Any concentration', { ...filters, concentrations: [] });
  if (filters.ratingMin !== null) add('Any rating', { ...filters, ratingMin: null });
  if (filters.available) add('Include discontinued', { ...filters, available: false });
  if (filters.q) add(`Drop the words “${filters.q}”`, { ...filters, q: '' });
  if (chipCount > 1 || out.length === 0) add('Start over', { ...structuredClone(EMPTY_FILTERS), view: filters.view });
  return out;
}

function NoResults({ filters, relax, nearest, interpreted, raw }: { filters: Filters; relax: RelaxOption[]; nearest: Card[]; interpreted: boolean; raw: boolean }) {
  const words = filters.q;
  const line =
    words && !interpreted
      ? raw
        ? `We searched for exactly “${words}” and nothing in the catalogue carries those words.`
        : `We couldn’t read “${words}” as a question, and nothing in the catalogue carries those words either.`
      : 'Our catalogue is still small. Loosen one thing and it will usually open up.';
  return (
    <EmptyState
      variant="nothing-matches"
      title="Nothing matches all of that."
      line={line}
      nearest={
        nearest.length ? (
          <ul role="list" className={`${styles.grid} ${styles.nearestGrid}`}>
            {nearest.map((c) => (
              <li key={c.id}>
                <FragranceCard card={c} />
              </li>
            ))}
          </ul>
        ) : undefined
      }
    >
      {relax.map((r) => (
        <Link key={r.label} className="chip" href={r.href}>
          {r.label}
        </Link>
      ))}
    </EmptyState>
  );
}
