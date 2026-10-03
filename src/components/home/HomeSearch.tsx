'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './HomeSearch.module.css';

/* The first two are the phone's pair; the rest show from tablet up. */
const EXAMPLES = ['vanilla without tobacco', 'fresh that lasts 8 hours', 'woody date night under $100', 'like Sauvage but less common', 'summer, not citrus-heavy'];

/** The loud element of the front page: one serif line to type into, and the arrow that sends it. */
export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <div className={styles.wrap}>
      <form
        role="search"
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/discover?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <label htmlFor="home-q" className="visually-hidden">
          Describe a fragrance or search by name
        </label>
        <input id="home-q" className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe it, or type a name" enterKeyHint="search" autoComplete="off" />
        <button type="submit" className={styles.go} aria-label="Search">
          <Icon name="arrow-right" size={22} />
        </button>
      </form>
      <p className={styles.examples}>
        <span className={styles.try}>Try:</span>
        {EXAMPLES.map((ex, i) => (
          <Link key={ex} href={`/discover?q=${encodeURIComponent(ex)}`} className={styles.example} data-extra={i >= 2 || undefined}>
            {ex}
          </Link>
        ))}
      </p>
    </div>
  );
}
