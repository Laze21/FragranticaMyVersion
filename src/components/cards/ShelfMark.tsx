'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { COLLECTION_STATUSES } from '@/lib/scent/vocab';
import styles from './ShelfMark.module.css';

/**
 * A small mark on any fragrance tile showing where it sits on your shelf. It appears with the
 * shelf-placement settle when the viewer puts the bottle there during this page view; marks that
 * were already on the shelf when the page loaded simply are.
 */
export function ShelfMark({ slug, inline }: { slug: string; inline?: boolean }) {
  const { shelf, loaded } = useViewer();
  const e = shelf[slug];
  const hadLoaded = useRef(false);
  const [settle, setSettle] = useState(false);
  const status = e?.status ?? null;

  useEffect(() => {
    if (status && hadLoaded.current) setSettle(true);
    hadLoaded.current = loaded;
  }, [status, loaded]);

  if (!e) return null;
  const label = COLLECTION_STATUSES.find((s) => s.key === e.status)?.label ?? e.status;
  const outline = e.status === 'want' || e.status === 'want_sample';
  return (
    <span className={styles.mark} data-status={e.status} data-outline={outline || undefined} data-inline={inline || undefined} data-settle={settle || undefined}>
      <Icon name="shelf" size={12} />
      {e.favorite && <Icon name="heart" size={11} label="Favourite" />}
      {label}
    </span>
  );
}
