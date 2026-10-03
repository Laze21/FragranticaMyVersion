'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useRadioGroup } from '@/lib/hooks/useRadioGroup';
import { reducedMotion } from '@/lib/motion';
import { activeFilterCount, EMPTY_FILTERS, FILTER_GROUP_LABEL, filtersToSearch, type FilterChip, type FilterGroup, type Filters, type SortKey, type ViewKey } from '@/lib/search/filters';
import type { Unread, Understood } from '@/lib/search/interpret';
import { CONCENTRATION_LABEL, DIMENSION_META, DIMENSIONS, PRICE_BANDS, WEAR_CONTEXTS, type Dimension } from '@/lib/scent/vocab';
import { formatNumber } from '@/lib/scent/read';
import styles from './DiscoverControls.module.css';

export interface RelaxOption {
  label: string;
  href: string;
}

interface Props {
  filters: Filters;
  /** The words as typed, so the field shows the sentence while the chips show what it meant. */
  rawQuery: string;
  /** Set when the sentence was interpreted: the chips are the reading, and the exact words are a link away. */
  interpreted: { understood: Understood[]; unread: Unread[] } | null;
  chips: FilterChip[];
  notes: Array<{ slug: string; name: string }>;
  decades: number[];
  brands: Array<{ slug: string; name: string }>;
  perfumers: Array<{ slug: string; name: string }>;
  total: number;
  shown: number;
  /** Whether anything narrows the catalogue (chips, a feeling, words). */
  hasCriteria: boolean;
  /** The chips that would loosen the question, for the no-results state and the sheet footer. */
  relax: RelaxOption[];
  /** The empty page's "Start somewhere" row, rendered between the field and the results. */
  intro?: ReactNode;
  children: ReactNode;
}

const SORTS: Array<[SortKey, string]> = [
  ['relevance', 'Best match'],
  ['popular', 'Most popular'],
  ['rating', 'Highest rated'],
  ['trending', 'Trending now'],
  ['newest', 'Newest'],
  ['lesser-known', 'Less common'],
  ['longest', 'Longest lasting'],
];
const SORT_KEYS = SORTS.map(([k]) => k);
const VIEWS: ViewKey[] = ['floor', 'row'];

/* One example at a time in the field; the rest come round every four seconds unless motion is reduced. */
const EXAMPLES = ['vanilla without tobacco', 'fresh, lasts 8 hours', 'like Sauvage but less common', 'woody date night under $100', 'by Demachy, from the 90s', 'summer, not citrus-heavy'];
const SLOW_AFTER_MS = 150;
const COMPARE_MAX = 4;

/** Below 1100 the rail lives in a sheet; the same question is answered by the breakpoint tokens. */
const railIsSheet = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches;

export function DiscoverControls(props: Props) {
  const { filters, chips, total, shown, hasCriteria, relax } = props;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(props.rawQuery);
  const [sheet, setSheet] = useState<'filters' | 'sort' | null>(null);
  const [slow, setSlow] = useState(false);
  const [example, setExample] = useState(0);
  const [focused, setFocused] = useState(false);
  const [jumpTo, setJumpTo] = useState<FilterGroup | null>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => setQ(props.rawQuery), [props.rawQuery]);

  // The hairline only for a slow answer: a fast one must feel instantaneous (plan, section 4).
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [pending]);

  useEffect(() => {
    if (q || focused || reducedMotion()) return;
    const t = setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 4000);
    return () => clearInterval(t);
  }, [q, focused]);

  // "Couldn't read: … set a price" lands on the control that would have taken it.
  useEffect(() => {
    if (!jumpTo) return;
    const id = `${sheet === 'filters' ? 'sheet' : 'rail'}-fg-${jumpTo}`;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    el.querySelector<HTMLElement>('input, button, select')?.focus({ preventScroll: true });
    setJumpTo(null);
  }, [jumpTo, sheet]);

  const go = (next: Filters) => start(() => router.push(`/discover${filtersToSearch(next)}`, { scroll: false }));
  const count = activeFilterCount(filters);
  const sortLabel = SORTS.find(([k]) => k === filters.sort)?.[1] ?? 'Best match';
  const countText = hasCriteria ? `${formatNumber(total)} ${total === 1 ? 'match' : 'matches'}` : `All ${formatNumber(total)} fragrances, ${sortLine(filters.sort)}`;
  const searchKey = filtersToSearch(filters);

  const jump = (group: FilterGroup) => {
    if (railIsSheet()) setSheet('filters');
    setJumpTo(group);
  };
  const loosen = () => {
    if (railIsSheet()) setSheet('filters');
    else railRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  const viewGroup = useRadioGroup<ViewKey>({ values: VIEWS, value: filters.view, onChange: (view) => go({ ...filters, view }), orientation: 'horizontal' });
  const sortGroup = useRadioGroup<SortKey>({
    values: SORT_KEYS,
    value: filters.sort,
    onChange: (sort) => {
      setSheet(null);
      go({ ...filters, sort });
    },
    orientation: 'vertical',
  });

  const relaxChips = relax.length > 0 && (
    <ul role="list" className={styles.relax} aria-label="Loosen one thing">
      {relax.map((r) => (
        <li key={r.label}>
          <Link className="chip" href={r.href} onClick={() => setSheet(null)}>
            {r.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.wrap}>
      <form
        className={styles.query}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          start(() => router.push(q.trim() ? `/discover?q=${encodeURIComponent(q.trim())}` : '/discover'));
        }}
      >
        <label htmlFor="discover-q" className="visually-hidden">
          Describe what you are looking for, or type a name
        </label>
        <Icon name="search" className={styles.qIcon} size={18} />
        <input
          id="discover-q"
          className={styles.qInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={EXAMPLES[example]}
          enterKeyHint="search"
          autoComplete="off"
        />
        <button className={styles.qGo} type="submit" aria-label="Search">
          <Icon name="arrow-right" size={22} />
        </button>
      </form>

      {props.intro}

      {hasCriteria && (
        <div className={styles.chipRow}>
          <ul role="list" className={styles.chips} aria-label="What this search is narrowed to">
            {chips.map((c) => (
              <li key={c.key}>
                <button type="button" className={`chip ${c.exclude ? 'chip--exclude' : ''}`} data-on={c.exclude ? 'true' : undefined} onClick={() => go(c.remove)} aria-label={`Remove: ${c.label}`}>
                  {c.label} <Icon name="close" size={14} />
                </button>
              </li>
            ))}
            {chips.length > 1 && (
              <li>
                <button type="button" className={styles.clear} onClick={() => go({ ...EMPTY_FILTERS, view: filters.view })}>
                  Clear all
                </button>
              </li>
            )}
            {props.interpreted && (
              <li>
                <Link href={`/discover?q=${encodeURIComponent(props.rawQuery)}&raw=1`} className={styles.rawLink}>
                  Search the exact words instead
                </Link>
              </li>
            )}
          </ul>
          <p className={`${styles.countSmall} tnum`} key={searchKey} aria-live="polite">
            {countText}
          </p>
        </div>
      )}

      {props.interpreted && props.interpreted.unread.length > 0 && (
        <p className={styles.unread}>
          <span>
            We read: {props.interpreted.understood.map((u) => u.label).join(' · ')}.{' '}
          </span>
          <span>
            Couldn’t read:{' '}
            {props.interpreted.unread.map((u, i) => (
              <span key={`${u.text}-${i}`} className={styles.unreadItem}>
                <q className={styles.unreadText}>{u.text}</q>{' '}
                <button type="button" className={styles.unreadLink} onClick={() => jump(u.group)}>
                  <Icon name="arrow-right" size={14} /> {FILTER_GROUP_LABEL[u.group]}
                </button>
                {i < props.interpreted!.unread.length - 1 ? ', ' : ''}
              </span>
            ))}
          </span>
        </p>
      )}

      <div className={styles.toolbar}>
        <button type="button" className={`btn btn--quiet ${styles.sheetBtn}`} onClick={() => setSheet('filters')} aria-haspopup="dialog">
          <Icon name="sliders" size={18} /> Filters{count ? ` · ${count}` : ''}
        </button>
        <button type="button" className={`btn btn--quiet ${styles.sheetBtn}`} onClick={() => setSheet('sort')} aria-haspopup="dialog">
          Sort · {sortLabel} <Icon name="chevron-down" size={16} />
        </button>
      </div>

      <div className={styles.layout} data-plain={!hasCriteria || undefined}>
        <aside className={`${styles.rail} layout-rail`} aria-label="Filters" ref={railRef}>
          <FilterPanel {...props} onChange={go} idPrefix="rail" />
        </aside>
        <div className={styles.results} aria-busy={pending}>
          <div className={styles.resultsHead}>
            <p className={`${styles.count} tnum`} key={searchKey} aria-live="polite">
              {countText}
            </p>
            <div className={styles.headControls}>
              <div className={styles.views} {...viewGroup.group()} aria-label="Result density">
                <button type="button" className="hit" {...viewGroup.item('floor')}>
                  <Icon name="grid" size={16} /> Bottles
                </button>
                <button type="button" className="hit" {...viewGroup.item('row')}>
                  <Icon name="list" size={16} /> Rows
                </button>
              </div>
              <label className={styles.sort}>
                <span className="visually-hidden">Sort</span>
                <select className={styles.sortSelect} value={filters.sort} onChange={(e) => go({ ...filters, sort: e.target.value as SortKey })}>
                  {SORTS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <Icon name="chevron-down" size={16} className={styles.sortChevron} />
              </label>
            </div>
            <div className={styles.progress} data-on={slow || undefined} aria-hidden />
          </div>
          <CompareTray>
            <div className={styles.arrive} key={searchKey}>
              {props.children}
            </div>
          </CompareTray>
          {total > 0 && (
            <p className={styles.end}>
              <span className="tnum">
                {formatNumber(Math.min(shown, total))} of {formatNumber(total)}
              </span>
              {shown < total ? (
                <>
                  {' · '}
                  <button type="button" className={styles.endLink} onClick={loosen}>
                    add a filter to see the rest
                  </button>
                </>
              ) : hasCriteria ? (
                <>
                  {' · '}
                  <button type="button" className={styles.endLink} onClick={loosen}>
                    loosen a filter
                  </button>
                </>
              ) : (
                ' · the whole catalogue'
              )}
            </p>
          )}
        </div>
      </div>

      <Sheet
        open={sheet === 'filters'}
        onClose={() => setSheet(null)}
        title="Filters"
        footer={
          total === 0 ? (
            <button className="btn" type="button" disabled>
              No matches: loosen a filter
            </button>
          ) : (
            <button className="btn" type="button" onClick={() => setSheet(null)}>
              Show {formatNumber(total)} {total === 1 ? 'result' : 'results'}
            </button>
          )
        }
      >
        {total === 0 && relaxChips && (
          <div className={styles.sheetRelax}>
            <p className={styles.sheetRelaxLine}>Nothing matches all of that. Loosen one thing:</p>
            {relaxChips}
          </div>
        )}
        <FilterPanel {...props} onChange={go} idPrefix="sheet" />
      </Sheet>

      <Sheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort by">
        <div className={styles.sortRows} {...sortGroup.group()} aria-label="Sort by">
          {SORTS.map(([k, l]) => (
            <button key={k} type="button" {...sortGroup.item(k)}>
              <span>{l}</span>
              {filters.sort === k && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function sortLine(sort: SortKey): string {
  const label = SORTS.find(([k]) => k === sort)?.[1] ?? 'Best match';
  return sort === 'relevance' || sort === 'popular' ? 'most popular first' : `${label.toLowerCase()} first`;
}

/**
 * The compare checkboxes live on the server-rendered cards; this wrapper reads them through
 * the form and shows "Compare 3" once two are ticked. A fifth tick is refused with a line,
 * not silently.
 */
function CompareTray({ children }: { children: ReactNode }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const read = () => {
    const form = formRef.current;
    if (!form) return [];
    return new FormData(form).getAll('compare').map(String);
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.name !== 'compare') return;
        const next = read();
        if (next.length > COMPARE_MAX) {
          target.checked = false;
          setNote('Compare takes four at most.');
          return;
        }
        setNote(null);
        setSlugs(next);
      }}
    >
      {children}
      {(slugs.length > 0 || note) && (
        <div className={styles.tray} role="region" aria-label="Compare selection">
          {note && (
            <p className={styles.trayNote} role="status">
              {note}
            </p>
          )}
          {slugs.length > 0 && (
            <>
              <span className={`${styles.trayCount} tnum`}>
                {slugs.length} {slugs.length === 1 ? 'picked' : 'picked'}
              </span>
              <button
                type="button"
                className={styles.trayClear}
                onClick={() => {
                  formRef.current?.querySelectorAll<HTMLInputElement>('input[name="compare"]').forEach((i) => (i.checked = false));
                  setSlugs([]);
                  setNote(null);
                }}
              >
                Clear
              </button>
              <button type="button" className="btn" disabled={slugs.length < 2} onClick={() => router.push(`/compare?f=${slugs.join(',')}`)}>
                Compare {slugs.length} <Icon name="arrow-right" size={18} />
              </button>
              {slugs.length < 2 && <span className={styles.trayHint}>Pick one more to compare</span>}
            </>
          )}
        </div>
      )}
    </form>
  );
}

const NOTE_MATCH: Array<{ key: Filters['noteMatch']; label: string; hint?: string }> = [
  { key: 'any', label: 'Listed or smelled' },
  { key: 'listed', label: 'Listed by the house' },
  { key: 'perceived', label: 'Noticed by people', hint: 'From what people say they smell, not the box' },
];
const LONGEVITY = [0, 4, 6, 8, 10];
const PROJECTION = ['any', 'close', 'loud'] as const;
const RATINGS = [0, 7, 7.5, 8];
const KINDS: Array<[string, string]> = [
  ['designer', 'Designer'],
  ['niche', 'Niche'],
  ['heritage', 'Heritage'],
  ['indie', 'Independent'],
  ['regional', 'Middle Eastern & regional'],
  ['mass', 'High street'],
];

function FilterPanel({ filters, notes, decades, brands, perfumers, onChange, idPrefix }: Props & { onChange: (f: Filters) => void; idPrefix: string }) {
  const toggle = <K extends 'seasons' | 'times' | 'weather' | 'occasions' | 'priceBands' | 'brandKinds' | 'concentrations' | 'dims'>(k: K, v: string) => {
    const arr = filters[k] as string[];
    onChange({ ...filters, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };
  const gid = (g: FilterGroup) => `${idPrefix}-fg-${g}`;

  const matchGroup = useRadioGroup({ values: NOTE_MATCH.map((m) => m.key), value: filters.noteMatch, onChange: (noteMatch) => onChange({ ...filters, noteMatch }), orientation: 'vertical' });
  const lastsGroup = useRadioGroup({ values: LONGEVITY, value: filters.longevityMin ?? 0, onChange: (h) => onChange({ ...filters, longevityMin: h || null }), orientation: 'horizontal' });
  const projValue = filters.projectionMax !== null ? 'close' : filters.projectionMin !== null ? 'loud' : 'any';
  const projGroup = useRadioGroup({
    values: PROJECTION,
    value: projValue,
    onChange: (k) => onChange({ ...filters, projectionMin: k === 'loud' ? 3.4 : null, projectionMax: k === 'close' ? 2.8 : null }),
    orientation: 'horizontal',
  });
  const ratingGroup = useRadioGroup({ values: RATINGS, value: filters.ratingMin ?? 0, onChange: (r) => onChange({ ...filters, ratingMin: r || null }), orientation: 'horizontal' });

  const moreActive = filters.brandKinds.length + filters.brands.length + filters.perfumers.length + filters.concentrations.length + filters.decades.length + (filters.yearMin !== null || filters.yearMax !== null ? 1 : 0) + (filters.available ? 1 : 0) + (filters.ratingMin !== null ? 1 : 0);

  return (
    <div className={styles.panel}>
      <Group title="Notes" id={gid('notes')}>
        <NotePicker label="Must have" notes={notes} selected={filters.include} onChange={(include) => onChange({ ...filters, include })} idPrefix={idPrefix} />
        <NotePicker label="Must not have" notes={notes} selected={filters.exclude} exclude onChange={(exclude) => onChange({ ...filters, exclude })} idPrefix={idPrefix} />
        <fieldset className={styles.matchSet}>
          <legend className={styles.subLegend}>Count a note when it is</legend>
          <div className={styles.match} {...matchGroup.group()} aria-label="Count a note when it is">
            {NOTE_MATCH.map((m) => (
              <button key={m.key} type="button" {...matchGroup.item(m.key)}>
                <span className={styles.radioMark} aria-hidden />
                <span className={styles.matchText}>
                  {m.label}
                  {m.hint && <small>{m.hint}</small>}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </Group>

      <Group title="Lasts at least" id={gid('longevity')}>
        <div className={styles.seg} {...lastsGroup.group()} aria-label="Lasts at least">
          {LONGEVITY.map((h) => (
            <button key={h} type="button" className="hit" {...lastsGroup.item(h)}>
              {h === 0 ? 'Any' : `${h}h`}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Price" id={gid('price')}>
        <div className={styles.chips}>
          {Object.entries(PRICE_BANDS).map(([k, v]) => (
            <Chip key={k} on={filters.priceBands.includes(k)} onClick={() => toggle('priceBands', k)}>
              {v.label} <small>{v.range}</small>
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Character" id={gid('character')} hint="The Trail's thirteen bands, in their order.">
        <div className={styles.legend}>
          {DIMENSIONS.map((d: Dimension) => (
            <button key={d} type="button" className={styles.legendItem} aria-pressed={filters.dims.includes(d)} onClick={() => toggle('dims', d)}>
              <i className={styles.swatch} style={{ background: DIMENSION_META[d].hue }} aria-hidden />
              {DIMENSION_META[d].label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="When to wear it" id={gid('wear')}>
        {(
          [
            ['season', 'seasons', 'Season'],
            ['weather', 'weather', 'Weather'],
            ['time', 'times', 'Time of day'],
            ['occasion', 'occasions', 'Occasion'],
          ] as const
        ).map(([grp, key, label]) => (
          <div key={grp} className={styles.subGroup}>
            <p className={styles.subLegend}>{label}</p>
            <div className={styles.chips}>
              {WEAR_CONTEXTS.filter((c) => c.grp === grp).map((c) => (
                <Chip key={c.key} on={filters[key].includes(c.key)} onClick={() => toggle(key, c.key)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </Group>

      <Group title="Projection" id={gid('projection')}>
        <div className={styles.seg} {...projGroup.group()} aria-label="Projection">
          {PROJECTION.map((k) => (
            <button key={k} type="button" className="hit" {...projGroup.item(k)}>
              {k === 'any' ? 'Any' : k === 'close' ? 'Stays close' : 'Noticeable'}
            </button>
          ))}
        </div>
      </Group>

      <details className={styles.more} open={moreActive > 0 || undefined}>
        <summary className={styles.moreSummary}>
          <Icon name="chevron-right" size={16} className={styles.moreChevron} />
          More filters{moreActive ? ` · ${moreActive}` : ''}
        </summary>
        <div className={styles.moreBody}>
          <Group title="House" id={gid('house')}>
            <div className={styles.chips}>
              {KINDS.map(([k, l]) => (
                <Chip key={k} on={filters.brandKinds.includes(k)} onClick={() => toggle('brandKinds', k)}>
                  {l}
                </Chip>
              ))}
            </div>
            <PickSelect
              label="A house"
              id={`${idPrefix}-house`}
              value={filters.brands[0] ?? ''}
              options={brands}
              empty="Any house"
              onChange={(slug) => onChange({ ...filters, brands: slug ? [slug] : [] })}
            />
            <PickSelect
              label="A perfumer"
              id={`${idPrefix}-nose`}
              value={filters.perfumers[0] ?? ''}
              options={perfumers}
              empty="Any perfumer"
              onChange={(slug) => onChange({ ...filters, perfumers: slug ? [slug] : [] })}
            />
          </Group>
          <Group title="Concentration" id={gid('concentration')}>
            <div className={styles.chips}>
              {['cologne', 'edt', 'edp', 'parfum', 'extrait', 'body_mist'].map((c) => (
                <Chip key={c} on={filters.concentrations.includes(c)} onClick={() => toggle('concentrations', c)}>
                  {CONCENTRATION_LABEL[c].short}
                </Chip>
              ))}
            </div>
          </Group>
          <Group title="Released" id={gid('released')}>
            <div className={styles.chips}>
              {decades.map((d) => (
                <Chip key={d} on={filters.decades.includes(d)} onClick={() => onChange({ ...filters, decades: filters.decades.includes(d) ? filters.decades.filter((x) => x !== d) : [...filters.decades, d] })}>
                  {d}s
                </Chip>
              ))}
            </div>
            <div className={styles.years}>
              <label>
                <span>From</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1700}
                  max={2100}
                  placeholder="1990"
                  defaultValue={filters.yearMin ?? ''}
                  onBlur={(e) => {
                    const v = Number.parseInt(e.target.value, 10);
                    const next = Number.isFinite(v) && v >= 1700 && v <= 2100 ? v : null;
                    if (next !== filters.yearMin) onChange({ ...filters, yearMin: next });
                  }}
                />
              </label>
              <label>
                <span>Until</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1700}
                  max={2100}
                  placeholder="2024"
                  defaultValue={filters.yearMax ?? ''}
                  onBlur={(e) => {
                    const v = Number.parseInt(e.target.value, 10);
                    const next = Number.isFinite(v) && v >= 1700 && v <= 2100 ? v : null;
                    if (next !== filters.yearMax) onChange({ ...filters, yearMax: next });
                  }}
                />
              </label>
            </div>
            <label className={styles.check}>
              <input type="checkbox" checked={filters.available} onChange={(e) => onChange({ ...filters, available: e.target.checked })} />
              In production only
            </label>
          </Group>
          <Group title="Rated at least" id={gid('rating')}>
            <div className={styles.seg} {...ratingGroup.group()} aria-label="Rated at least">
              {RATINGS.map((r) => (
                <button key={r} type="button" className="hit" {...ratingGroup.item(r)}>
                  {r === 0 ? 'Any' : `${r}+`}
                </button>
              ))}
            </div>
          </Group>
        </div>
      </details>
    </div>
  );
}

function Group({ title, id, hint, children }: { title: string; id: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group} id={id}>
      <legend>{title}</legend>
      {hint && <p className={styles.groupHint}>{hint}</p>}
      {children}
    </fieldset>
  );
}

function Chip({ on, onClick, children, exclude }: { on: boolean; onClick: () => void; children: ReactNode; exclude?: boolean }) {
  return (
    <button type="button" className={`chip ${exclude ? 'chip--exclude' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

/* The Sort control's box, reused for the house and perfumer pickers so the rail has one select style. */
function PickSelect({ label, id, value, options, empty, onChange }: { label: string; id: string; value: string; options: Array<{ slug: string; name: string }>; empty: string; onChange: (slug: string) => void }) {
  return (
    <label className={styles.pickSelect} htmlFor={id}>
      <span className="visually-hidden">{label}</span>
      <select id={id} className={styles.sortSelect} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={16} className={styles.sortChevron} />
    </label>
  );
}

function NotePicker({ label, notes, selected, onChange, exclude, idPrefix }: { label: string; notes: Array<{ slug: string; name: string }>; selected: string[]; onChange: (s: string[]) => void; exclude?: boolean; idPrefix: string }) {
  const [q, setQ] = useState('');
  const listId = useId();
  const matches = q.length >= 1 ? notes.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()) && !selected.includes(n.slug)).slice(0, 6) : [];
  const name = (s: string) => notes.find((n) => n.slug === s)?.name ?? s;
  const id = `${idPrefix}-np-${label.replace(/\W/g, '')}`;
  return (
    <div className={styles.picker}>
      <label htmlFor={id} className={styles.subLegend}>
        {label}
      </label>
      {selected.length > 0 && (
        <div className={styles.chips}>
          {selected.map((s) => (
            <button key={s} type="button" className={`chip ${exclude ? 'chip--exclude' : ''}`} data-on="true" onClick={() => onChange(selected.filter((x) => x !== s))} aria-label={`Remove ${name(s)}`}>
              {exclude ? 'No ' : ''}
              {name(s)} <Icon name="close" size={14} />
            </button>
          ))}
        </div>
      )}
      <div className={styles.pickBox}>
        <input
          id={id}
          className="input"
          value={q}
          placeholder={exclude ? 'e.g. tobacco, oud' : 'e.g. vanilla, fig'}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={matches.length ? listId : undefined}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault();
              onChange([...selected, matches[0].slug]);
              setQ('');
            }
          }}
        />
        {matches.length > 0 && (
          <ul role="list" id={listId} className={styles.pickList}>
            {matches.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...selected, m.slug]);
                    setQ('');
                  }}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
