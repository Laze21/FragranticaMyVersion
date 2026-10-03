'use client';

import { useLayoutEffect, useRef } from 'react';
import styles from './FoldOnPhone.module.css';

/**
 * A `<details>` that is open everywhere except on phones, where it starts closed under its
 * summary ("Listed by Dior · 12 notes"). The server renders it open so nothing is hidden from
 * crawlers or from a reader without script; the phone closes it before first paint.
 */
export function FoldOnPhone({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && window.matchMedia('(max-width: 719px)').matches) el.open = false;
  }, []);
  return (
    <details ref={ref} open className={styles.fold}>
      <summary className={styles.summary}>{summary}</summary>
      {children}
    </details>
  );
}
