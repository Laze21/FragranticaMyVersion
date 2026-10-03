import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getFragrance, getNoteIndex } from '@/lib/data/catalog';
import { sql } from '@/lib/db';
import type { FragranceDetail } from '@/lib/data/types';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { ComparePicker } from '@/components/compare/ComparePicker';
import { Term } from '@/components/ui/Term';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { CONCENTRATION_LABEL, DIMENSION_META, PRICE_BANDS, WEAR_CONTEXTS, type Dimension, type PriceBand } from '@/lib/scent/vocab';
import { histAvg, longevityRange, projectionLabel, topDims } from '@/lib/scent/read';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Compare fragrances',
  description: 'Put two to four fragrances side by side: notes, what people smell, longevity, projection, seasons, price and ratings.',
};

const LETTERS = ['A', 'B', 'C', 'D'];

export default async function ComparePage(props: PageProps<'/compare'>) {
  const sp = await props.searchParams;
  const slugs = String(sp.f ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 4);
  const items = (await Promise.all(slugs.map((s) => getFragrance(s)))).filter(Boolean) as FragranceDetail[];
  const noteIndex = await getNoteIndex();

  if (items.length === 0) {
    return (
      <div className={`page ${styles.page}`}>
        <h1 className={styles.title}>Compare</h1>
        <p className={styles.lede}>Pick two to four fragrances. You’ll see notes, what people actually smell, how long they last and what they cost, side by side.</p>
        <div className={styles.startPicker}>
          <ComparePicker current={[]} />
        </div>
        <p className={styles.try}>
          Or try <Link href="/compare?f=dior-sauvage,bleu-de-chanel-edp,ysl-y-edp">three famous blue fragrances</Link>, or{' '}
          <Link href="/compare?f=tobacco-vanille,khamrah,jazz-club">three tobacco-sweet ones</Link>.
        </p>
      </div>
    );
  }

  // Shared notes across the comparison: officially listed or strongly perceived by 2+ fragrances.
  const noteSets = items.map((f) => new Set([...(f.notes ? Object.values(f.notes).flat().map((n) => n.slug) : []), ...Object.entries(f.stats.perceived).filter(([, v]) => v >= 0.35).map(([k]) => k)]));
  const shared = new Set([...noteSets.flatMap((s) => [...s])].filter((n) => noteSets.filter((s) => s.has(n)).length >= 2));

  // Shelf overlap: of people who own the first, how many also own each other one.
  const overlap = items.length > 1 ? await shelfOverlap(items.map((i) => i.id)) : new Map<string, number>();

  const rows: Array<{ label: React.ReactNode; render: (f: FragranceDetail, i: number) => React.ReactNode; note?: React.ReactNode }> = [
    { label: 'Smells like', render: (f) => <p className={styles.summary}>{f.summary ?? '—'}</p> },
    {
      label: 'Trail',
      note: 'Same time scale for all: longer means it lasts, thicker means it projects.',
      render: (f) => (
        <TrailThumb
          input={{
            character: f.stats.character,
            longevityHrs: f.stats.longevityMedian,
            projectionOpening: histAvg(f.stats.projectionOpeningHist),
            projectionLater: histAvg(f.stats.projectionLaterHist),
            heartAtMin: f.heartAtMin,
            drydownAtMin: f.drydownAtMin,
          }}
          width={280}
          height={56}
          className={styles.trail}
        />
      ),
    },
    {
      label: 'Character',
      render: (f) => (
        <ul role="list" className={styles.dims}>
          {topDims(f.stats.character.overall, 4, 0.1).map((d: Dimension) => (
            <li key={d}>
              <i style={{ background: DIMENSION_META[d].hue }} aria-hidden />
              {DIMENSION_META[d].label}
              <span className={styles.dimBar} aria-hidden>
                <span style={{ width: `${Math.min(100, (f.stats.character.overall[d] ?? 0) * 140)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: <Term slug="note-pyramid">Listed notes</Term>,
      note: 'Bold: shared with another fragrance in this comparison.',
      render: (f) =>
        f.notes ? (
          <p className={styles.notes}>
            {Object.values(f.notes)
              .flat()
              .map((n, i) => (
                <span key={n.slug + i}>
                  {i > 0 && ', '}
                  {shared.has(n.slug) ? <b>{n.name}</b> : n.name}
                </span>
              ))}
          </p>
        ) : (
          <span className="t-meta">Not published</span>
        ),
    },
    {
      label: 'People smell',
      render: (f) => (
        <p className={styles.notes}>
          {Object.entries(f.stats.perceived)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .filter(([s]) => noteIndex[s])
            .map(([s, v], i) => (
              <span key={s}>
                {i > 0 && ', '}
                {shared.has(s) ? <b>{noteIndex[s].name}</b> : noteIndex[s].name} <span className="t-meta">{Math.round(v * 100)}%</span>
              </span>
            ))}
        </p>
      ),
    },
    { label: <Term slug="longevity">Lasts</Term>, render: (f) => (f.stats.perfVotes >= 5 ? longevityRange(f.stats.longevityHist)?.text ?? '—' : 'Too few votes') },
    {
      label: <Term slug="projection">Projection</Term>,
      render: (f) => {
        const a = histAvg(f.stats.projectionOpeningHist);
        const b = histAvg(f.stats.projectionLaterHist);
        return f.stats.perfVotes >= 5 ? `${projectionLabel(a)} → ${projectionLabel(b).toLowerCase()}` : 'Too few votes';
      },
    },
    {
      label: 'Seasons',
      render: (f) => (
        <div className={styles.seasons}>
          {['spring', 'summer', 'autumn', 'winter'].map((s) => (
            <span key={s} title={`${s}: ${Math.round((f.stats.wear[s] ?? 0) * 100)}%`}>
              <i style={{ height: `${Math.round((f.stats.wear[s] ?? 0) * 100)}%` }} aria-hidden />
              <small>
                {s.slice(0, 3)} {Math.round((f.stats.wear[s] ?? 0) * 100)}
              </small>
            </span>
          ))}
        </div>
      ),
    },
    {
      label: 'Best for',
      render: (f) =>
        WEAR_CONTEXTS.filter((c) => c.grp === 'occasion')
          .sort((a, b) => (f.stats.wear[b.key] ?? 0) - (f.stats.wear[a.key] ?? 0))
          .slice(0, 3)
          .map((c) => c.label)
          .join(', '),
    },
    {
      label: 'Rating',
      render: (f) =>
        f.stats.ratingAvg && f.stats.ratingCount >= 5 ? (
          <span>
            <b className={styles.big}>{f.stats.ratingAvg.toFixed(1)}</b>/10 <span className="t-meta">· scent {f.stats.scentAvg?.toFixed(1)} · value {f.stats.valueAvg?.toFixed(1)}</span>
          </span>
        ) : (
          'Too few ratings'
        ),
    },
    {
      label: 'Price',
      render: (f) => (
        <span>
          {f.priceBand ? PRICE_BANDS[f.priceBand as PriceBand].label : '—'}
          {f.priceUsd && f.sizeMl ? <span className="t-meta"> · ~${Math.round(f.priceUsd)} / {f.sizeMl} ml (${(f.priceUsd / f.sizeMl).toFixed(2)}/ml)</span> : null}
        </span>
      ),
    },
    { label: 'Released', render: (f) => `${f.releaseYear ?? '—'}${f.status !== 'current' ? ` · ${f.status}` : ''}` },
    { label: 'Concentration', render: (f) => (f.concentration ? CONCENTRATION_LABEL[f.concentration].long : '—') },
    { label: 'Perfumer', render: (f) => f.perfumers.map((p) => p.name).join(', ') || 'Not disclosed' },
  ];
  if (items.length > 1) {
    rows.push({
      label: 'Shelf overlap',
      note: `Of people who own ${items[0].name}, how many also own each.`,
      render: (f, i) => (i === 0 ? <span className="t-meta">Reference</span> : overlap.has(f.id) ? `${Math.round((overlap.get(f.id) ?? 0) * 100)}%` : '—'),
    });
  }

  return (
    <div className={`page ${styles.page}`}>
      <div className={styles.headRow}>
        <h1 className={styles.title}>Compare</h1>
        {items.some((i) => i.stats.includesBaseline) && <DemoFlag />}
      </div>
      <div className={styles.table} style={{ ['--cols' as string]: items.length }}>
        <div className={styles.sticky} role="presentation">
          <div className={styles.corner}>
            {items.length < 4 && <ComparePicker current={items.map((i) => i.slug)} compact />}
          </div>
          {items.map((f, i) => (
            <div key={f.slug} className={styles.colHead} style={{ ['--scent' as string]: f.accent }}>
              <span className={styles.letter}>{LETTERS[i]}</span>
              <div className={styles.thumb}>{f.poster && <Image src={f.poster} alt="" fill sizes="80px" />}</div>
              <div className={styles.colName}>
                <Link href={`/fragrance/${f.slug}`} className={styles.nameLink}>
                  {f.name}
                </Link>
                <span className="t-meta">{f.brandName}</span>
              </div>
              <Link
                className={styles.remove}
                href={`/compare?f=${items
                  .filter((x) => x.slug !== f.slug)
                  .map((x) => x.slug)
                  .join(',')}`}
                aria-label={`Remove ${f.name} from comparison`}
              >
                ×
              </Link>
            </div>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={ri} className={styles.row}>
            <div className={styles.label}>
              {r.label}
              {r.note && <span className={styles.labelNote}>{r.note}</span>}
            </div>
            {items.map((f, i) => (
              <div key={f.slug} className={styles.cell}>
                <span className={styles.cellLetter} aria-hidden>
                  {LETTERS[i]}
                </span>
                <span className="visually-hidden">{f.name}: </span>
                <div className={styles.cellBody}>{r.render(f, i)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

async function shelfOverlap(ids: string[]): Promise<Map<string, number>> {
  const [base, ...others] = ids;
  const rows = await sql<{ fragrance_id: string; n: string; total: string }>(
    `with owners as (
       select c.user_id from public.collection_items i join public.collections c on c.id = i.collection_id
        where i.fragrance_id = $1 and i.status in ('own', 'had'))
     select i.fragrance_id, count(distinct c.user_id) n, (select count(*) from owners) total
       from public.collection_items i join public.collections c on c.id = i.collection_id
      where i.fragrance_id = any($2::uuid[]) and i.status in ('own', 'had') and c.user_id in (select user_id from owners)
      group by i.fragrance_id`,
    [base, others],
  );
  return new Map(rows.map((r) => [r.fragrance_id, Number(r.total) ? Number(r.n) / Number(r.total) : 0]));
}
