'use client';

import { useEffect, useRef, useState } from 'react';
import { myHelpfulVotes } from '@/app/actions/reviews';
import { useViewer } from '@/components/viewer/ViewerProvider';
import type { ReviewView } from '@/lib/data/types';
import { formatNumber } from '@/lib/scent/read';
import { ReviewItem } from './ReviewItem';
import styles from './ReviewList.module.css';

interface Counts {
  total: number;
  quick: number;
  full: number;
}
const FOCUS = [
  { key: '', label: 'Any angle' },
  { key: 'performance', label: 'Performance' },
  { key: 'scent', label: 'Scent' },
  { key: 'value', label: 'Value' },
  { key: 'beginner', label: 'Beginner view' },
  { key: 'long_term', label: 'Long-term owners' },
  { key: 'first_impression', label: 'First impressions' },
];

/**
 * Reviews you can actually navigate: filter by kind and angle, sort, page. The first page is
 * server-rendered (fast, indexable); everything after loads on demand.
 */
export function ReviewList({ slug, initial, counts, initialHasMore }: { slug: string; initial: ReviewView[]; counts: Counts; initialHasMore: boolean }) {
  const { viewer } = useViewer();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState('helpful');
  const [kind, setKind] = useState('');
  const [focus, setFocus] = useState('');
  const [owners, setOwners] = useState(false);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mineHelpful, setMineHelpful] = useState<string[]>([]);
  const first = useRef(true);
  const now = useRef(Date.now());

  const load = async (p: number, append: boolean) => {
    setState('loading');
    try {
      const qs = new URLSearchParams({ sort, page: String(p) });
      if (kind) qs.set('kind', kind);
      if (focus) qs.set('focus', focus);
      if (owners) qs.set('owners', '1');
      const res = await fetch(`/api/fragrance/${slug}/reviews?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reviews: ReviewView[]; hasMore: boolean };
      setItems((xs) => (append ? [...xs, ...data.reviews] : data.reviews));
      setHasMore(data.hasMore);
      setPage(p);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, kind, focus, owners]);

  useEffect(() => {
    if (viewer && items.length) void myHelpfulVotes(items.map((i) => i.id)).then(setMineHelpful);
  }, [viewer, items]);

  if (counts.total === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No reviews yet.</p>
        <p>Worn it? A two-sentence quick take helps the next person more than you’d think.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.kinds} role="radiogroup" aria-label="Review length">
          {[
            ['', `All ${formatNumber(counts.total)}`],
            ['quick', `Quick takes ${formatNumber(counts.quick)}`],
            ['full', `Full reviews ${formatNumber(counts.full)}`],
          ].map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className="chip" onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className={styles.selects}>
          <label className={styles.select}>
            <span className="visually-hidden">Angle</span>
            <select className="select" value={focus} onChange={(e) => setFocus(e.target.value)}>
              {FOCUS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.select}>
            <span className="visually-hidden">Sort</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="helpful">Most helpful</option>
              <option value="recent">Newest</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={owners} onChange={(e) => setOwners(e.target.checked)} /> Owners only
          </label>
        </div>
      </div>

      <div aria-live="polite" aria-busy={state === 'loading'}>
        {items.length === 0 && state !== 'loading' && <p className={styles.none}>No reviews match those filters.</p>}
        {items.map((r) => (
          <ReviewItem key={r.id} review={r} helpfulByMe={mineHelpful.includes(r.id)} now={now.current} />
        ))}
      </div>
      {state === 'error' && (
        <p className={styles.none}>
          Couldn’t load reviews. <button type="button" className="btn btn--bare btn--small" onClick={() => void load(page, false)}>Try again</button>
        </p>
      )}
      {hasMore && (
        <button type="button" className={`btn btn--quiet ${styles.moreBtn}`} onClick={() => void load(page + 1, true)} disabled={state === 'loading'}>
          {state === 'loading' ? 'Loading…' : 'Show more reviews'}
        </button>
      )}
    </div>
  );
}
