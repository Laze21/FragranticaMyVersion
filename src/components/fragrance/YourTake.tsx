'use client';

import Link from 'next/link';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { COLLECTION_STATUSES, LONGEVITY_BUCKETS } from '@/lib/scent/vocab';
import { useVotes } from './VoteProvider';
import styles from './YourTake.module.css';

/**
 * Your take, as a ruled typographic aside at the foot of the rail: where this fragrance sits in
 * your life and the three quickest ways to add to the shared picture. Signed out it is one line.
 */
export function YourTake({ slug, name }: { slug: string; name: string }) {
  const { viewer, loaded } = useViewer();
  const { open, mine, loading } = useVotes();

  if (!loaded) return <div className={styles.aside} aria-busy="true" style={{ minHeight: 120 }} />;
  if (!viewer)
    return (
      <aside className={styles.aside} aria-label="Your take">
        <p className={styles.line}>
          <Link href={`/sign-in?next=/fragrance/${slug}`}>Sign in</Link> to log a wear, rate it, or say what you smell.
        </p>
      </aside>
    );

  const status = mine?.shelf ? COLLECTION_STATUSES.find((s) => s.key === mine.shelf!.status) : null;
  const lon = mine?.performance?.longevity ? LONGEVITY_BUCKETS.find((b) => b.key === mine.performance!.longevity)?.label : null;
  const rows: Array<{
    k: Parameters<typeof open>[0];
    label: string;
    value: string | null;
  }> = [
    {
      k: 'rating',
      label: 'Your rating',
      value: mine?.rating?.overall ? `${mine.rating.overall}/10` : null,
    },
    {
      k: 'perceived',
      label: 'Your notes',
      value: mine?.perceived.length ? `${mine.perceived.length} picked` : null,
    },
    { k: 'performance', label: 'On your skin', value: lon ?? null },
  ];
  const last = mine?.wears.last
    ? new Date(mine.wears.last).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <aside className={styles.aside} aria-label="Your take" aria-busy={loading || undefined}>
      <h2 className={styles.title}>Your take</h2>
      <p className={styles.where}>
        {status ? status.verb : 'Not on your shelf'}
        {mine?.wears.count ? ` · worn ${mine.wears.count === 1 ? 'once' : `${mine.wears.count} times`}` : ''}
        {last ? `, last ${last}` : ''}
      </p>
      <ul role="list" className={styles.rows}>
        {rows.map((r) => (
          <li key={r.k}>
            <button type="button" onClick={() => open(r.k)}>
              <span>{r.label}</span>
              <b data-empty={r.value ? undefined : ''}>{loading ? '…' : (r.value ?? 'Add')}</b>
            </button>
          </li>
        ))}
      </ul>
      <Link href={`/fragrance/${slug}/review`} className={styles.review}>
        {mine?.reviewId ? 'Edit your review' : `Write about ${name}`}
      </Link>
    </aside>
  );
}
