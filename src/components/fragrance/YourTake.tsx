'use client';

import Link from 'next/link';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { COLLECTION_STATUSES, LONGEVITY_BUCKETS } from '@/lib/scent/vocab';
import { useVotes } from './VoteProvider';
import styles from './YourTake.module.css';

/**
 * The personal panel: where this fragrance sits in your life, and the four quick ways to add
 * your experience to the shared picture. Sticky on desktop.
 */
export function YourTake({ slug, name }: { slug: string; name: string }) {
  const { viewer, loaded } = useViewer();
  const { open, mine, loading } = useVotes();

  if (!loaded) return <div className={`${styles.panel} skeleton`} style={{ height: 280 }} aria-hidden />;
  if (!viewer)
    return (
      <div className={styles.panel}>
        <p className={styles.title}>Worn it?</p>
        <p className={styles.text}>Sign in to log wears, rate it, and say what you actually smell. It takes seconds and shapes what the next person reads.</p>
        <Link className="btn" href={`/sign-in?next=/fragrance/${slug}`}>
          Sign in
        </Link>
      </div>
    );

  const status = mine?.shelf ? COLLECTION_STATUSES.find((s) => s.key === mine.shelf!.status) : null;
  const lon = mine?.performance?.longevity ? LONGEVITY_BUCKETS.find((b) => b.key === mine.performance!.longevity)?.label : null;
  const rows: Array<{ k: Parameters<typeof open>[0]; label: string; value: string | null }> = [
    { k: 'rating', label: 'Your rating', value: mine?.rating?.overall ? `${mine.rating.overall}/10` : null },
    { k: 'perceived', label: 'What you smell', value: mine?.perceived.length ? `${mine.perceived.length} notes` : null },
    { k: 'performance', label: 'How long it lasted', value: lon ?? null },
    { k: 'wear', label: 'When you’d wear it', value: mine && Object.keys(mine.wear).length ? `${Object.values(mine.wear).filter(Boolean).length} moments` : null },
  ];

  return (
    <div className={styles.panel} aria-busy={loading || undefined}>
      <p className={styles.title}>Your take on {name}</p>
      <p className={styles.text}>
        {status ? status.verb : 'Not on your shelf'}
        {mine?.wears.count ? ` · worn ${mine.wears.count} ${mine.wears.count === 1 ? 'time' : 'times'}` : ''}
        {mine?.wears.last ? `, last on ${new Date(mine.wears.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
      </p>
      <ul role="list" className={styles.rows}>
        {rows.map((r) => (
          <li key={r.k}>
            <button type="button" onClick={() => open(r.k)}>
              <span>{r.label}</span>
              <b>{r.value ?? 'Add'}</b>
            </button>
          </li>
        ))}
      </ul>
      <Link href={`/fragrance/${slug}/review`} className="btn btn--quiet" style={{ width: '100%' }}>
        {mine?.reviewId ? 'Edit your review' : 'Write a review'}
      </Link>
    </div>
  );
}
