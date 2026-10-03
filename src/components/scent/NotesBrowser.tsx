'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from './NotesBrowser.module.css';

interface N {
  slug: string;
  name: string;
  hue: string;
  kind: string;
  listed: number;
  smellsLike: string | null;
}
const LABEL: Record<string, string> = {
  citrus: 'Citrus',
  aromatic: 'Aromatic herbs',
  green: 'Green',
  marine: 'Marine & watery',
  floral: 'Floral',
  fruity: 'Fruity',
  spice: 'Spice',
  gourmand: 'Gourmand',
  tea: 'Tea',
  woody: 'Woods',
  resinous: 'Resins & amber',
  earthy: 'Earth & moss',
  musk: 'Musks & clean',
  leather: 'Leather & animalic',
  smoky: 'Smoke & tobacco',
  mineral: 'Mineral',
};

export function NotesBrowser({ families }: { families: Array<{ family: string; notes: N[] }> }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return families;
    return families.map((f) => ({ ...f, notes: f.notes.filter((n) => n.name.toLowerCase().includes(t) || (n.smellsLike ?? '').toLowerCase().includes(t)) })).filter((f) => f.notes.length);
  }, [q, families]);
  const total = shown.reduce((a, f) => a + f.notes.length, 0);
  return (
    <div>
      <div className={styles.bar}>
        <label htmlFor="note-filter" className="visually-hidden">
          Find a note
        </label>
        <input id="note-filter" className="input" placeholder="Find a note, or a smell: “salty”, “rain”, “soap”" value={q} onChange={(e) => setQ(e.target.value)} />
        <nav aria-label="Families" className={styles.jump}>
          {shown.map((f) => (
            <a key={f.family} href={`#fam-${f.family}`}>
              {LABEL[f.family] ?? f.family}
            </a>
          ))}
        </nav>
      </div>
      <p className="t-meta" aria-live="polite">
        {total} notes
      </p>
      {shown.map((f) => (
        <section key={f.family} id={`fam-${f.family}`} className={styles.family} aria-labelledby={`h-${f.family}`}>
          <h2 id={`h-${f.family}`} className={styles.h2}>
            {LABEL[f.family] ?? f.family}
          </h2>
          <ul role="list" className={styles.list}>
            {f.notes.map((n) => (
              <li key={n.slug}>
                <Link href={`/notes/${n.slug}`} className={styles.note}>
                  <span className={styles.strip} style={{ ['--hue' as string]: n.hue }} aria-hidden />
                  <span className={styles.text}>
                    <span className={styles.name}>
                      {n.name}
                      {n.kind === 'descriptor' && <em> descriptor</em>}
                    </span>
                    <span className={styles.desc}>{n.smellsLike}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!shown.length && <p className={styles.none}>No note matches “{q}”. Try a plainer word.</p>}
    </div>
  );
}
