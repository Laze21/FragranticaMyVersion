import type { Metadata } from 'next';
import Link from 'next/link';
import { discover, getVocabulary } from '@/lib/data/search';
import { activeFilterCount, filtersToSearch, parseFilters, type Filters } from '@/lib/search/filters';
import { interpret, looksNatural } from '@/lib/search/interpret';
import { sql } from '@/lib/db';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { DiscoverControls } from '@/components/search/DiscoverControls';
import { FEELINGS } from '@/lib/search/feelings';
import { formatNumber } from '@/lib/scent/read';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Search fragrances by note, mood, season, longevity and price. Include and exclude notes, or just describe what you want.',
  alternates: { canonical: '/discover' },
};

export default async function DiscoverPage(props: PageProps<'/discover'>) {
  const sp = await props.searchParams;
  let filters = parseFilters(sp);
  let understood: Array<{ kind: string; label: string }> = [];
  const raw = sp.raw === '1';
  const vocab = await getVocabulary();

  // A sentence typed into search becomes structured filters we show and let people edit.
  if (filters.q && !raw && looksNatural(filters.q) && activeFilterCount(filters) === 0) {
    const it = interpret(filters.q, vocab);
    if (it.understood.length) {
      understood = it.understood;
      filters = { ...it.filters, sort: filters.sort !== 'relevance' ? filters.sort : it.filters.sort };
    }
  }

  const feeling = typeof sp.feel === 'string' ? FEELINGS.find((f) => f.slug === sp.feel) : undefined;
  if (feeling) filters = { ...feeling.filters, sort: filters.sort, q: filters.q };

  const [{ cards, total }, decades, brands] = await Promise.all([
    discover(filters),
    sql<{ d: number }>(`select distinct (release_year / 10 * 10)::int d from public.fragrances where release_year is not null order by d`),
    sql<{ slug: string; name: string }>(`select slug, name from public.brands order by name`),
  ]);

  const noteNames = Object.fromEntries(vocab.notes.map((n) => [n.slug, n.name]));
  const similarName = filters.similarTo ? vocab.fragrances.find((f) => f.slug === filters.similarTo)?.name : null;
  const hasCriteria = activeFilterCount(filters) > 0 || !!filters.q;

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>{feeling ? feeling.title : 'Find something'}</h1>
        <p className={styles.lede}>
          {feeling
            ? feeling.line
            : 'Search by name, or describe it: “warm but not sweet for the office”, “fig without coconut”, “lasts 10 hours”.'}
        </p>
      </header>

      <DiscoverControls
        filters={filters}
        originalQuery={understood.length ? (typeof sp.q === 'string' ? sp.q : '') : null}
        understood={understood}
        notes={vocab.notes.map((n) => ({ slug: n.slug, name: n.name }))}
        decades={decades.map((d) => d.d)}
        brands={brands}
        noteNames={noteNames}
        similarName={similarName ?? null}
        total={total}
      >
        {cards.length ? (
          <>
            <p className={styles.count} aria-live="polite">
              {hasCriteria ? `${formatNumber(total)} ${total === 1 ? 'match' : 'matches'}` : `${formatNumber(total)} fragrances`}
              {filters.similarTo && similarName ? ` similar to ${similarName}` : ''}
            </p>
            <ul role="list" className={styles.grid}>
              {cards.map((c, i) => (
                <li key={c.id}>
                  <FragranceCard card={c} priority={i < 4} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <NoResults filters={filters} />
        )}
      </DiscoverControls>
    </div>
  );
}

function NoResults({ filters }: { filters: Filters }) {
  // Offer to relax each constraint individually.
  const relax: Array<{ label: string; next: Filters }> = [];
  const without = <K extends keyof Filters>(k: K, v: Filters[K]) => ({ ...filters, [k]: v });
  if (filters.exclude.length) relax.push({ label: 'Allow the excluded notes', next: without('exclude', []) });
  if (filters.include.length > 1) relax.push({ label: 'Match any one note, not all', next: without('include', filters.include.slice(0, 1)) });
  if (filters.longevityMin) relax.push({ label: 'Any longevity', next: without('longevityMin', null) });
  if (filters.priceMax || filters.priceBands.length) relax.push({ label: 'Any price', next: { ...filters, priceMax: null, priceBands: [] } });
  if (filters.occasions.length || filters.seasons.length) relax.push({ label: 'Any season or occasion', next: { ...filters, occasions: [], seasons: [], weather: [], times: [] } });
  if (filters.dims.length) relax.push({ label: 'Any character', next: without('dims', []) });
  if (filters.q) relax.push({ label: `Drop the words “${filters.q}”`, next: without('q', '') });
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>Nothing matches all of that.</p>
      <p>Our catalogue is still small. Try loosening one thing:</p>
      <ul role="list" className="cluster">
        {relax.map((r) => (
          <li key={r.label}>
            <Link className="chip" href={`/discover${filtersToSearch(r.next)}`}>
              {r.label}
            </Link>
          </li>
        ))}
        <li>
          <Link className="chip" href="/discover">
            Start over
          </Link>
        </li>
      </ul>
    </div>
  );
}
