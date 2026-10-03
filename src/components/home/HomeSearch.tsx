'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './HomeSearch.module.css';

const EXAMPLES = ['vanilla without tobacco', 'fresh that lasts 8 hours', 'woody date night under $100', 'like Sauvage but less common', 'summer, not citrus-heavy'];

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
        <input id="home-q" className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe it, or type a name" enterKeyHint="search" />
        <button type="submit" className={styles.go} aria-label="Search">
          <Icon name="arrow-right" size={22} />
        </button>
      </form>
      <ul role="list" className={styles.examples} aria-label="Try one of these">
        {EXAMPLES.map((ex) => (
          <li key={ex}>
            <Link href={`/discover?q=${encodeURIComponent(ex)}`}>{ex}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
