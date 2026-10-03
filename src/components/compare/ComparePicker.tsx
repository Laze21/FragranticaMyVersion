'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './ComparePicker.module.css';

interface S {
  type: string;
  slug: string;
  label: string;
  sub: string;
}

/** Add a fragrance to the comparison by typing its name. */
export function ComparePicker({ current, compact }: { current: string[]; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<S[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setItems([]);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
      const d = (await res.json()) as { items: S[] };
      setItems(d.items.filter((i) => i.type === 'fragrance' && !current.includes(i.slug)).slice(0, 6));
    }, 120);
    return () => clearTimeout(t);
  }, [q, current]);
  const add = (slug: string) => {
    setQ('');
    router.push(`/compare?f=${[...current, slug].join(',')}`);
  };
  return (
    <div className={styles.wrap} data-compact={compact || undefined}>
      <label htmlFor="cmp-add" className={compact ? 'visually-hidden' : styles.label}>
        {current.length ? 'Add another fragrance' : 'Start with a fragrance'}
      </label>
      <input
        id="cmp-add"
        className="input"
        placeholder={current.length ? '+ Add a fragrance' : 'Type a name, e.g. Santal 33'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && items[0]) {
            e.preventDefault();
            add(items[0].slug);
          }
        }}
        autoComplete="off"
      />
      {items.length > 0 && (
        <ul role="list" className={styles.list}>
          {items.map((i) => (
            <li key={i.slug}>
              <button type="button" onClick={() => add(i.slug)}>
                <span className={styles.name}>{i.label}</span>
                <span className="t-meta">{i.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
