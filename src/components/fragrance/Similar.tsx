'use client';

import { useRef, useState } from 'react';
import { FragranceCard } from '@/components/cards/FragranceCard';
import type { SimilarGroups } from '@/lib/data/similar';
import styles from './Similar.module.css';

const TABS: Array<{ key: keyof SimilarGroups; label: string; empty: string }> = [
  { key: 'similar', label: 'Smells similar', empty: 'Nothing close enough yet.' },
  { key: 'cheaper', label: 'Cheaper', empty: '' },
  { key: 'higherRated', label: 'Rated higher', empty: '' },
  { key: 'fresher', label: 'Fresher', empty: '' },
  { key: 'sweeter', label: 'Sweeter', empty: '' },
  { key: 'darker', label: 'Darker', empty: '' },
  { key: 'stronger', label: 'Stronger', empty: '' },
  { key: 'subtler', label: 'Quieter', empty: '' },
];

/** Tabs follow the ARIA tabs pattern: arrow keys move between tabs, Tab moves into the panel. */
export function Similar({ groups, name }: { groups: SimilarGroups; name: string }) {
  const tabs = TABS.filter((t) => t.key === 'similar' || groups[t.key].length > 0);
  const [active, setActive] = useState(tabs[0].key);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const items = groups[active];

  return (
    <div>
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
            className="chip"
            data-on={active === t.key || undefined}
            onClick={() => setActive(t.key)}
            onKeyDown={(e) => {
              const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
              if (!dir) return;
              e.preventDefault();
              const next = (i + dir + tabs.length) % tabs.length;
              setActive(tabs[next].key);
              refs.current[next]?.focus();
            }}
          >
            {t.label}
            {t.key !== 'similar' && <span className={styles.count}>{groups[t.key].length}</span>}
          </button>
        ))}
      </div>
      <div id="similar-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className={styles.panel}>
        {items.length ? (
          <ul role="list" className={styles.grid}>
            {items.map((it) => (
              <li key={it.card.slug} className={styles.item}>
                <FragranceCard card={it.card} sizes="(max-width: 719px) 42vw, 220px" />
                <p className={styles.why}>{it.why}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-meta">{TABS.find((t) => t.key === active)?.empty}</p>
        )}
      </div>
      <p className={styles.note}>
        Matched on character, notes people actually smell, community “smells similar” votes and shared shelves. Close matches are not
        copies; skin decides.
      </p>
    </div>
  );
}
