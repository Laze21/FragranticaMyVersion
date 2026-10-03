'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { activeFilterCount, EMPTY_FILTERS, filtersToSearch, type Filters, type SortKey } from '@/lib/search/filters';
import { CONCENTRATION_LABEL, DIMENSIONS, DIMENSION_META, PRICE_BANDS, WEAR_CONTEXTS, type Dimension } from '@/lib/scent/vocab';
import styles from './DiscoverControls.module.css';

interface Props {
  filters: Filters;
  originalQuery: string | null;
  understood: Array<{ kind: string; label: string }>;
  notes: Array<{ slug: string; name: string }>;
  decades: number[];
  brands: Array<{ slug: string; name: string }>;
  noteNames: Record<string, string>;
  similarName: string | null;
  total: number;
  children: React.ReactNode;
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

export function DiscoverControls(props: Props) {
  const { filters } = props;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(props.originalQuery ?? filters.q);
  const [sheet, setSheet] = useState(false);

  useEffect(() => setQ(props.originalQuery ?? filters.q), [props.originalQuery, filters.q]);

  const go = (next: Filters) => start(() => router.push(`/discover${filtersToSearch(next)}`, { scroll: false }));
  const count = activeFilterCount(filters);
  const chips = describe(filters, props.noteNames, props.similarName);

  const panel = <FilterPanel {...props} onChange={go} />;

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
          Describe what you’re looking for
        </label>
        <Icon name="search" className={styles.qIcon} />
        <input id="discover-q" className={styles.qInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder="vanilla without tobacco, under $100" enterKeyHint="search" />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {props.understood.length > 0 && (
        <div className={styles.understood} aria-live="polite">
          <span className={styles.readAs}>We read that as</span>
          <ul role="list" className="cluster">
            {props.understood.map((u, i) => (
              <li key={i} className={styles.read} data-kind={u.kind}>
                {u.label}
              </li>
            ))}
          </ul>
          <Link href={`/discover?q=${encodeURIComponent(props.originalQuery ?? '')}&raw=1`} className={styles.rawLink}>
            Search the exact words instead
          </Link>
        </div>
      )}

      <div className={styles.toolbar}>
        <button type="button" className={`btn btn--quiet ${styles.filterBtn}`} onClick={() => setSheet(true)} aria-haspopup="dialog">
          <Icon name="sliders" size={18} /> Filters{count ? ` (${count})` : ''}
        </button>
        {chips.length > 0 && (
          <ul role="list" className={styles.active} aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.label}>
                <button type="button" className="chip" data-on="true" onClick={() => go(c.remove)} aria-label={`Remove filter: ${c.label}`}>
                  {c.label} <Icon name="close" size={14} />
                </button>
              </li>
            ))}
            <li>
              <button type="button" className={styles.clear} onClick={() => go({ ...EMPTY_FILTERS })}>
                Clear all
              </button>
            </li>
          </ul>
        )}
        <label className={styles.sort}>
          <span className="t-meta">Sort</span>
          <select className="select" value={filters.sort} onChange={(e) => go({ ...filters, sort: e.target.value as SortKey })}>
            {SORTS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.layout}>
        <aside className={styles.rail} aria-label="Filters">
          {panel}
        </aside>
        <div className={styles.results} aria-busy={pending} data-pending={pending || undefined}>
          {props.children}
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<button className="btn" type="button" onClick={() => setSheet(false)}>Show {props.total} results</button>}>
        {panel}
      </Sheet>
    </div>
  );
}

function describe(f: Filters, names: Record<string, string>, similarName: string | null) {
  const out: Array<{ label: string; remove: Filters }> = [];
  const drop = <K extends keyof Filters>(k: K, v: Filters[K]) => ({ ...f, [k]: v });
  const label = (k: string) => WEAR_CONTEXTS.find((c) => c.key === k)?.label ?? k;
  if (f.q) out.push({ label: `“${f.q}”`, remove: drop('q', '') });
  if (f.similarTo) out.push({ label: `Like ${similarName ?? f.similarTo}`, remove: drop('similarTo', null) });
  f.include.forEach((s) => out.push({ label: `With ${names[s] ?? s}`, remove: drop('include', f.include.filter((x) => x !== s)) }));
  f.exclude.forEach((s) => out.push({ label: `No ${names[s] ?? s}`, remove: drop('exclude', f.exclude.filter((x) => x !== s)) }));
  f.excludeFamilies.forEach((s) => out.push({ label: `Not ${s}-heavy`, remove: drop('excludeFamilies', f.excludeFamilies.filter((x) => x !== s)) }));
  f.dims.forEach((d) => out.push({ label: DIMENSION_META[d]?.label ?? d, remove: drop('dims', f.dims.filter((x) => x !== d)) }));
  f.avoidDims.forEach((d) => out.push({ label: `Not too ${DIMENSION_META[d]?.label.toLowerCase() ?? d}`, remove: drop('avoidDims', f.avoidDims.filter((x) => x !== d)) }));
  for (const k of ['seasons', 'times', 'weather', 'occasions'] as const) f[k].forEach((s) => out.push({ label: label(s), remove: drop(k, f[k].filter((x) => x !== s)) }));
  if (f.longevityMin !== null) out.push({ label: `Lasts ${f.longevityMin}h+`, remove: drop('longevityMin', null) });
  if (f.projectionMin !== null) out.push({ label: 'Noticeable', remove: drop('projectionMin', null) });
  if (f.projectionMax !== null) out.push({ label: 'Stays close', remove: drop('projectionMax', null) });
  if (f.priceMax !== null) out.push({ label: `Under $${f.priceMax}`, remove: drop('priceMax', null) });
  f.priceBands.forEach((b) => out.push({ label: PRICE_BANDS[b as keyof typeof PRICE_BANDS]?.label ?? b, remove: drop('priceBands', f.priceBands.filter((x) => x !== b)) }));
  f.brandKinds.forEach((b) => out.push({ label: b[0].toUpperCase() + b.slice(1), remove: drop('brandKinds', f.brandKinds.filter((x) => x !== b)) }));
  f.brands.forEach((b) => out.push({ label: b, remove: drop('brands', f.brands.filter((x) => x !== b)) }));
  f.decades.forEach((d) => out.push({ label: `${d}s`, remove: drop('decades', f.decades.filter((x) => x !== d)) }));
  f.concentrations.forEach((c) => out.push({ label: CONCENTRATION_LABEL[c]?.short ?? c, remove: drop('concentrations', f.concentrations.filter((x) => x !== c)) }));
  if (f.ratingMin !== null) out.push({ label: `Rated ${f.ratingMin}+`, remove: drop('ratingMin', null) });
  if (f.available) out.push({ label: 'Available now', remove: drop('available', false) });
  if (f.noteMatch !== 'any') out.push({ label: f.noteMatch === 'listed' ? 'Listed notes only' : 'Strongly smelled only', remove: drop('noteMatch', 'any') });
  return out;
}

function FilterPanel({ filters, notes, decades, onChange }: Props & { onChange: (f: Filters) => void }) {
  const toggle = <K extends 'seasons' | 'times' | 'weather' | 'occasions' | 'priceBands' | 'brandKinds' | 'concentrations' | 'dims'>(k: K, v: string) => {
    const arr = filters[k] as string[];
    onChange({ ...filters, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };

  return (
    <div className={styles.panel}>
      <Group title="Notes">
        <NotePicker label="Must have" notes={notes} selected={filters.include} onChange={(include) => onChange({ ...filters, include })} />
        <NotePicker label="Must not have" notes={notes} selected={filters.exclude} exclude onChange={(exclude) => onChange({ ...filters, exclude })} />
        <div className={styles.match} role="radiogroup" aria-label="How notes must match">
          {(
            [
              ['any', 'Listed or smelled'],
              ['listed', 'Officially listed'],
              ['perceived', 'People smell it'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={filters.noteMatch === k} onClick={() => onChange({ ...filters, noteMatch: k })}>
              {l}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Character">
        <div className={styles.chips}>
          {DIMENSIONS.map((d: Dimension) => (
            <Chip key={d} on={filters.dims.includes(d)} onClick={() => toggle('dims', d)}>
              <i className={styles.swatch} style={{ background: DIMENSION_META[d].hue }} aria-hidden />
              {DIMENSION_META[d].label}
            </Chip>
          ))}
        </div>
      </Group>
      {(['season', 'time', 'weather', 'occasion'] as const).map((grp) => {
        const key = grp === 'season' ? 'seasons' : grp === 'time' ? 'times' : grp === 'weather' ? 'weather' : 'occasions';
        return (
          <Group key={grp} title={grp === 'season' ? 'Season' : grp === 'time' ? 'Time of day' : grp === 'weather' ? 'Weather' : 'Occasion'}>
            <div className={styles.chips}>
              {WEAR_CONTEXTS.filter((c) => c.grp === grp).map((c) => (
                <Chip key={c.key} on={filters[key].includes(c.key)} onClick={() => toggle(key, c.key)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </Group>
        );
      })}
      <Group title="Lasts at least">
        <div className={styles.seg} role="radiogroup" aria-label="Minimum longevity">
          {[null, 4, 6, 8, 10].map((h) => (
            <button key={String(h)} type="button" role="radio" aria-checked={filters.longevityMin === h} onClick={() => onChange({ ...filters, longevityMin: h })}>
              {h === null ? 'Any' : `${h}h`}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Projection">
        <div className={styles.seg} role="radiogroup" aria-label="Projection">
          {(
            [
              ['any', 'Any'],
              ['close', 'Stays close'],
              ['loud', 'Noticeable'],
            ] as const
          ).map(([k, l]) => {
            const on = k === 'any' ? filters.projectionMin === null && filters.projectionMax === null : k === 'close' ? filters.projectionMax !== null : filters.projectionMin !== null;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...filters, projectionMin: k === 'loud' ? 3.4 : null, projectionMax: k === 'close' ? 2.8 : null })}
              >
                {l}
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="Price">
        <div className={styles.chips}>
          {Object.entries(PRICE_BANDS).map(([k, v]) => (
            <Chip key={k} on={filters.priceBands.includes(k)} onClick={() => toggle('priceBands', k)}>
              {v.label} <small>{v.range}</small>
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="House">
        <div className={styles.chips}>
          {['designer', 'niche', 'heritage', 'regional', 'indie', 'mass'].map((k) => (
            <Chip key={k} on={filters.brandKinds.includes(k)} onClick={() => toggle('brandKinds', k)}>
              {k === 'mass' ? 'High street' : k === 'regional' ? 'Middle Eastern & regional' : k[0].toUpperCase() + k.slice(1)}
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Released">
        <div className={styles.chips}>
          {decades.map((d) => (
            <Chip key={d} on={filters.decades.includes(d)} onClick={() => onChange({ ...filters, decades: filters.decades.includes(d) ? filters.decades.filter((x) => x !== d) : [...filters.decades, d] })}>
              {d}s
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Concentration">
        <div className={styles.chips}>
          {['cologne', 'edt', 'edp', 'parfum', 'extrait', 'body_mist'].map((c) => (
            <Chip key={c} on={filters.concentrations.includes(c)} onClick={() => toggle('concentrations', c)}>
              {CONCENTRATION_LABEL[c].short}
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Community">
        <div className={styles.seg} role="radiogroup" aria-label="Minimum rating">
          {[null, 7, 7.5, 8].map((r) => (
            <button key={String(r)} type="button" role="radio" aria-checked={filters.ratingMin === r} onClick={() => onChange({ ...filters, ratingMin: r })}>
              {r === null ? 'Any rating' : `${r}+`}
            </button>
          ))}
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={filters.available} onChange={(e) => onChange({ ...filters, available: e.target.checked })} />
          Hide discontinued and unreleased
        </label>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Chip({ on, onClick, children, exclude }: { on: boolean; onClick: () => void; children: React.ReactNode; exclude?: boolean }) {
  return (
    <button type="button" className={`chip ${exclude ? 'chip--exclude' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function NotePicker({ label, notes, selected, onChange, exclude }: { label: string; notes: Array<{ slug: string; name: string }>; selected: string[]; onChange: (s: string[]) => void; exclude?: boolean }) {
  const [q, setQ] = useState('');
  const matches = q.length >= 1 ? notes.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()) && !selected.includes(n.slug)).slice(0, 6) : [];
  const name = (s: string) => notes.find((n) => n.slug === s)?.name ?? s;
  const id = `np-${label.replace(/\W/g, '')}`;
  return (
    <div className={styles.picker}>
      <label htmlFor={id} className={styles.pickLabel}>
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
          <ul role="list" className={styles.pickList}>
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
