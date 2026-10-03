'use client';

import { useRef, useState } from 'react';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { Ledge } from '@/components/scent/Ledge';
import type { SimilarGroups } from '@/lib/data/similar';
import styles from './Similar.module.css';

const TABS: Array<{ key: keyof SimilarGroups; label: string }> = [
  { key: 'similar', label: 'Smells similar' },
  { key: 'cheaper', label: 'Cheaper' },
  { key: 'higherRated', label: 'Rated higher' },
  { key: 'fresher', label: 'Fresher' },
  { key: 'sweeter', label: 'Sweeter' },
  { key: 'darker', label: 'Darker' },
  { key: 'stronger', label: 'Stronger' },
  { key: 'subtler', label: 'Quieter' },
];
const IN_PRODUCTION = new Set(['current', 'reformulated', 'limited']);

/**
 * If you like this: the directions as the row's header (a list beside the shelf from 840 up,
 * chips above it on phones) and one shelf of bottles on a ledge, scroll-snapped, at real scale.
 * Arrow keys move between directions; Tab moves onto the shelf. A discontinued fragrance opens
 * on in-production matches, since the point is something you can still buy.
 */
export function Similar({ groups, name, status }: { groups: SimilarGroups; name: string; status?: string }) {
  const tabs = TABS.filter((t) => t.key === 'similar' || groups[t.key].length > 0);
  const [active, setActive] = useState(tabs[0].key);
  const [inProduction, setInProduction] = useState(status === 'discontinued');
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const all = groups[active];
  const items = inProduction ? all.filter((it) => IN_PRODUCTION.has(it.card.status)) : all;

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label={`Fragrances related to ${name}`}>
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={active === t.key}
            aria-controls="similar-panel"
            tabIndex={active === t.key ? 0 : -1}
            className={styles.tab}
            onClick={() => setActive(t.key)}
            onKeyDown={(e) => {
              const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
              if (!dir) return;
              e.preventDefault();
              const next = (i + dir + tabs.length) % tabs.length;
              setActive(tabs[next].key);
              refs.current[next]?.focus();
            }}
          >
            <span className={styles.tabLabel}>{t.label}</span>
            <span className={`${styles.count} tnum`}>{groups[t.key].length}</span>
          </button>
        ))}
        {status === 'discontinued' && (
          <label className={styles.filter}>
            <input type="checkbox" checked={inProduction} onChange={(e) => setInProduction(e.target.checked)} /> In production only
          </label>
        )}
      </div>
      <div id="similar-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className={styles.panel}>
        {items.length ? (
          <Ledge className={styles.shelf}>
            {items.map((it, i) => (
              <div key={it.card.slug} className={styles.item}>
                <FragranceCard card={it.card} sizes="164px" loading={i < 4 ? 'eager' : 'lazy'} reason={it.why} />
              </div>
            ))}
          </Ledge>
        ) : (
          <p className={styles.none}>{inProduction ? 'Nothing in production is close enough yet.' : 'Nothing close enough yet.'}</p>
        )}
        <p className={styles.note}>Matched on character, the notes people smell, “smells similar” votes and shared shelves. Close matches are not copies; skin decides.</p>
      </div>
    </div>
  );
}
