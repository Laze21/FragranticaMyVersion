'use client';

import { useViewer } from '@/components/viewer/ViewerProvider';
import { COLLECTION_STATUSES } from '@/lib/scent/vocab';
import styles from './ShelfMark.module.css';

/** A small corner mark on any fragrance tile showing where it sits on your shelf. */
export function ShelfMark({ slug }: { slug: string }) {
  const { shelf } = useViewer();
  const e = shelf[slug];
  if (!e) return null;
  const label = COLLECTION_STATUSES.find((s) => s.key === e.status)?.label ?? e.status;
  return (
    <span className={styles.mark} data-status={e.status}>
      {e.favorite ? '♥ ' : ''}
      {label}
    </span>
  );
}
