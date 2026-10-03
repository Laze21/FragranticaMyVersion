'use client';

import { useEffect, useState } from 'react';
import { usePageChrome } from '@/components/shell/PageChrome';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { ShelfActions } from './ShelfActions';
import styles from './SectionNav.module.css';

/** One vocabulary: the nav says what the section heads say. The tab bar's sheet lists the same eight. */
export const SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'journey', label: 'How it moves' },
  { id: 'notes', label: 'Listed vs. smelled' },
  { id: 'performance', label: 'How long, how loud' },
  { id: 'wear', label: 'When to wear it' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'similar', label: 'If you like this' },
  { id: 'details', label: 'Details' },
];

/**
 * The section bar under the hero. It owns the scroll-spy for the whole page and publishes the
 * section in view through PageChrome, so the rail's list and the tab bar's sheet mark the same
 * item. On desktop it is a static rule under the hero; on tablets it sticks under the header and,
 * once the hero's actions have scrolled away, carries the shelf actions at its left. On phones it
 * is not shown: the tab bar's Sections sheet does the job.
 */
export function SectionNav({ name, slug, upcoming }: { name: string; slug: string; upcoming?: boolean }) {
  const { sectionInView, setSectionInView, contextualActions } = usePageChrome();
  const dir = useScrollDirection();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = SECTIONS.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) {
          setActive(vis[0].target.id);
          setSectionInView(vis[0].target.id);
        }
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      setSectionInView(null);
    };
  }, [setSectionInView]);

  const current = sectionInView ?? active;
  return (
    <nav className={styles.nav} aria-label={`Sections about ${name}`} data-header-hidden={dir === 'down' || undefined} data-actions={contextualActions === 'fragrance' || undefined}>
      <div className={`page ${styles.inner}`}>
        <div className={styles.actions}>
          <ShelfActions slug={slug} name={name} upcoming={upcoming} compact />
        </div>
        <ul role="list" className={styles.list}>
          {SECTIONS.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} aria-current={current === i.id ? 'location' : undefined}>
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
