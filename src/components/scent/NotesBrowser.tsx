'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Blotter } from './Blotter';
import styles from './NotesBrowser.module.css';

export interface IndexNote {
  slug: string;
  name: string;
  hue: string;
  kind: 'material' | 'accord' | 'descriptor';
  listed: number;
  smellsLike: string | null;
}
export interface FamilyGroup {
  family: string;
  label: string;
  /** the strip's label, short enough for sixteen of them to share one line */
  short: string;
  hue: string;
  notes: IndexNote[];
}

const LEADS = 3;
const PHONE = '(max-width: 719px)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
/* The server renders the desktop shape (everything open); phones collapse after hydration, before anyone has scrolled. */
function usePhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

function listedLine(n: IndexNote) {
  if (n.kind === 'descriptor') return 'a word for what people smell';
  if (!n.listed) return 'not listed yet';
  return n.listed === 1 ? 'in 1 fragrance' : `in ${n.listed} fragrances`;
}

function byListed(a: IndexNote, b: IndexNote) {
  return b.listed - a.listed || a.name.localeCompare(b.name);
}

/**
 * The index: a sticky strip of families with their blotter swatches, each family led by its
 * three most-listed notes with a line of description, then the rest as compact 40px rows.
 * Phones get the families as <details> with the first two open and the strip as a select.
 */
export function NotesBrowser({ families, total }: { families: FamilyGroup[]; total: number }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'family' | 'az'>('family');
  const [showDesc, setShowDesc] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(() => new Set(families.slice(0, 2).map((f) => f.family)));
  const phone = usePhone();
  const barRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLElement>(null);

  const term = q.trim().toLowerCase();
  const all = useMemo(() => families.flatMap((f) => f.notes).sort((a, b) => a.name.localeCompare(b.name)), [families]);
  const matches = useMemo(
    () => (term ? all.filter((n) => n.name.toLowerCase().includes(term) || (n.smellsLike ?? '').toLowerCase().includes(term)) : null),
    [term, all],
  );
  const letters = useMemo(() => {
    const groups = new Map<string, IndexNote[]>();
    for (const n of all) {
      const k = n.name[0].toUpperCase();
      groups.set(k, [...(groups.get(k) ?? []), n]);
    }
    return [...groups.entries()];
  }, [all]);

  /* Scroll-spy: the family whose head has passed under the strip is the current one. */
  useEffect(() => {
    if (matches || mode !== 'family') return;
    let raf = 0;
    const read = () => {
      raf = 0;
      // a family lands a few pixels under the strip after a jump (its scroll margin), so the probe sits a little lower
      const barBottom = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 28;
      let current: string | null = null;
      for (const f of families) {
        const el = document.getElementById(`fam-${f.family}`);
        if (el && el.getBoundingClientRect().top <= barBottom) current = f.family;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [families, matches, mode]);

  /* Keep the current family visible when the strip scrolls sideways (481 to 719px). */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !active) return;
    const link = strip.querySelector<HTMLElement>(`[data-family="${active}"]`);
    if (!link) return;
    const left = link.offsetLeft - 16;
    if (left < strip.scrollLeft || link.offsetLeft + link.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left, behavior: 'auto' });
  }, [active]);

  const open = (family: string) => setOpened((s) => (s.has(family) ? s : new Set(s).add(family)));
  const jump = (family: string) => {
    open(family);
    requestAnimationFrame(() => document.getElementById(`fam-${family}`)?.scrollIntoView({ block: 'start' }));
  };

  const row = (n: IndexNote, withDesc: boolean) => (
    <li key={n.slug}>
      <Link href={`/notes/${n.slug}`} className={styles.row} data-desc={withDesc || undefined}>
        <Blotter hue={n.hue} className={styles.glyph} />
        <span className={styles.rowText}>
          <span className={styles.rowLine}>
            <span className={styles.name}>{n.name}</span>
            {n.kind === 'descriptor' ? <span className={styles.flag}>descriptor</span> : <span className={`tnum ${styles.listed}`}>{listedLine(n)}</span>}
          </span>
          {withDesc && n.smellsLike && <span className={styles.desc}>{n.smellsLike}</span>}
        </span>
      </Link>
    </li>
  );

  const lead = (n: IndexNote) => (
    <li key={n.slug}>
      <Link href={`/notes/${n.slug}`} className={styles.lead}>
        <Blotter hue={n.hue} size="strip" className={styles.leadStrip} />
        <span className={styles.leadText}>
          <span className={styles.leadName}>{n.name}</span>
          <span className={`tnum ${styles.listed}`}>{n.kind === 'descriptor' ? 'descriptor' : listedLine(n)}</span>
          {n.smellsLike && <span className={styles.leadDesc}>{n.smellsLike}</span>}
        </span>
      </Link>
    </li>
  );

  const familySection = (f: FamilyGroup) => {
    const sorted = [...f.notes].sort(byListed);
    const leads = sorted.slice(0, LEADS);
    const rest = sorted.slice(LEADS).sort((a, b) => a.name.localeCompare(b.name));
    const isOpen = phone ? opened.has(f.family) : true;
    return (
      <details
        key={f.family}
        id={`fam-${f.family}`}
        className={styles.family}
        open={isOpen}
        onToggle={(e) => {
          if (!phone) return;
          const now = e.currentTarget.open;
          setOpened((s) => {
            const next = new Set(s);
            if (now) next.add(f.family);
            else next.delete(f.family);
            return next;
          });
        }}
      >
        <summary
          className={styles.head}
          tabIndex={phone ? undefined : -1}
          onClick={(e) => {
            if (!phone) e.preventDefault();
          }}
        >
          <span className={styles.headText}>
            <span className={styles.h2} role="heading" aria-level={2}>
              {f.label}
            </span>
            <span className={`tnum ${styles.famCount}`}>{f.notes.length === 1 ? '1 note' : `${f.notes.length} notes`}</span>
          </span>
        </summary>
        <ul role="list" className={styles.leads}>
          {leads.map(lead)}
        </ul>
        {rest.length > 0 && (
          <ul role="list" className={styles.rows}>
            {rest.map((n) => row(n, showDesc))}
          </ul>
        )}
      </details>
    );
  };

  return (
    <div className={styles.browser}>
      <div className={styles.find}>
        <label htmlFor="note-filter" className="visually-hidden">
          Find a note
        </label>
        <input
          id="note-filter"
          className="input"
          placeholder="Find a note, or a smell: “salty”, “rain”, “soap”"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={styles.tools}>
          <div role="group" aria-label="Order" className={styles.seg}>
            <button type="button" aria-pressed={mode === 'family'} onClick={() => setMode('family')}>
              By family
            </button>
            <button type="button" aria-pressed={mode === 'az'} onClick={() => setMode('az')}>
              A–Z
            </button>
          </div>
          <button type="button" className={styles.descToggle} aria-pressed={showDesc} onClick={() => setShowDesc((v) => !v)}>
            {showDesc ? 'Hide descriptions' : 'Show descriptions'}
          </button>
        </div>
      </div>

      <div ref={barRef} className={styles.bar} data-hidden={matches ? '' : undefined}>
        {mode === 'family' ? (
          <>
            <nav ref={stripRef} aria-label="Families" className={styles.strip}>
              {families.map((f) => (
                <a
                  key={f.family}
                  href={`#fam-${f.family}`}
                  data-family={f.family}
                  aria-current={active === f.family ? 'true' : undefined}
                  className={styles.stripLink}
                  onClick={(e) => {
                    if (phone) {
                      e.preventDefault();
                      jump(f.family);
                    }
                  }}
                >
                  <Blotter hue={f.hue} size="strip" />
                  <span>{f.short}</span>
                </a>
              ))}
            </nav>
            <label className={styles.select}>
              <span className="visually-hidden">Jump to a family</span>
              <select
                className="input"
                value={active ?? ''}
                onChange={(e) => {
                  if (e.target.value) jump(e.target.value);
                }}
              >
                <option value="">Jump to a family</option>
                {families.map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.label} ({f.notes.length})
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <nav aria-label="Letters" className={styles.strip}>
            {letters.map(([k]) => (
              <a key={k} href={`#az-${k}`} className={`${styles.stripLink} ${styles.letterLink}`}>
                {k}
              </a>
            ))}
          </nav>
        )}
      </div>

      <p className={styles.live} aria-live="polite">
        {matches ? (matches.length ? `${matches.length} of ${total} notes match “${q.trim()}”` : `No note matches “${q.trim()}”. Try a plainer word.`) : ''}
      </p>

      {matches ? (
        <ul role="list" className={styles.rows}>
          {matches.map((n) => row(n, true))}
        </ul>
      ) : mode === 'family' ? (
        families.map(familySection)
      ) : (
        letters.map(([k, ns]) => (
          <section key={k} id={`az-${k}`} className={styles.letter} aria-label={`Notes starting with ${k}`}>
            <p className={styles.letterMark} aria-hidden="true">
              {k}
            </p>
            <ul role="list" className={styles.rows}>
              {ns.map((n) => row(n, showDesc))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
