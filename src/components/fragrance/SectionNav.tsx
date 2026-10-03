'use client';

import { useEffect, useState } from 'react';
import styles from './SectionNav.module.css';

const ITEMS = [
  { id: 'journey', label: 'How it moves' },
  { id: 'notes', label: 'Listed vs. smelled' },
  { id: 'performance', label: 'Performance' },
  { id: 'wear', label: 'When to wear' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'similar', label: 'Similar' },
  { id: 'details', label: 'Sources' },
];

/** Sticky in-page navigation with scroll-spy. On phones it scrolls sideways on purpose. */
export function SectionNav({ name }: { name: string }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = ITEMS.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav className={styles.nav} aria-label={`Sections about ${name}`}>
      <ul role="list" className="page">
        {ITEMS.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? 'location' : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
