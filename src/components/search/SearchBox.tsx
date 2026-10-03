'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './SearchBox.module.css';

interface Suggestion {
  type: 'fragrance' | 'brand' | 'note' | 'perfumer';
  slug: string;
  label: string;
  sub: string;
  poster?: string | null;
  hue?: string | null;
}

const HREF: Record<Suggestion['type'], (s: string) => string> = {
  fragrance: (s) => `/fragrance/${s}`,
  brand: (s) => `/house/${s}`,
  note: (s) => `/notes/${s}`,
  perfumer: (s) => `/perfumer/${s}`,
};
const GROUP: Record<Suggestion['type'], string> = { fragrance: 'Fragrances', brand: 'Houses', note: 'Notes', perfumer: 'Perfumers' };
const EXAMPLES = ['vanilla without tobacco', 'fresh that lasts 8 hours', 'rainy day', 'similar to Sauvage but less common'];

/**
 * Header search: an ARIA 1.2 combobox. Typing shows instant matches across fragrances, houses,
 * notes and perfumers; Enter on free text goes to Discover, which interprets sentences.
 * Press "/" anywhere to focus. On phones it opens as a full-screen sheet.
 */
export function SearchBox() {
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [sheet, setSheet] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const reqRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        if (window.matchMedia('(max-width: 719px)').matches) setSheet(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (sheet) {
      inputRef.current?.focus();
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = '';
      };
    }
  }, [sheet]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setStatus('idle');
      return;
    }
    const n = ++reqRef.current;
    setStatus('loading');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`);
        const data = (await res.json()) as { items: Suggestion[] };
        if (n === reqRef.current) {
          setItems(data.items);
          setActive(-1);
          setStatus('idle');
        }
      } catch {
        if (n === reqRef.current) setStatus('error');
      }
    }, 110);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setSheet(false);
    setQ('');
    router.push(href);
  };
  const submit = () => {
    if (active >= 0 && items[active]) return go(HREF[items[active].type](items[active].slug));
    if (q.trim()) go(`/discover?q=${encodeURIComponent(q.trim())}`);
  };

  const listId = `${id}-list`;
  const showList = open && q.trim().length >= 2;
  let lastGroup = '';

  return (
    <div className={styles.wrap} data-sheet={sheet || undefined}>
      <button type="button" className={styles.trigger} aria-label="Search" onClick={() => setSheet(true)}>
        <Icon name="search" />
      </button>
      <div className={styles.panel}>
        <form
          role="search"
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Icon name="search" className={styles.icon} size={18} />
          <input
            ref={inputRef}
            className={styles.input}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
            aria-label="Search fragrances, notes, houses and perfumers"
            placeholder="Search, or try “vanilla without tobacco”"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              } else if (e.key === 'Escape') {
                if (q) setQ('');
                else {
                  setOpen(false);
                  setSheet(false);
                  inputRef.current?.blur();
                }
              }
            }}
          />
          <kbd className={styles.kbd} aria-hidden>
            /
          </kbd>
          {sheet && (
            <button type="button" className={styles.cancel} onClick={() => setSheet(false)}>
              Cancel
            </button>
          )}
        </form>

        {(showList || sheet) && (
          <div className={styles.dropdown}>
            {q.trim().length < 2 ? (
              <div className={styles.examples}>
                <p className="t-label">Try asking</p>
                <ul role="list">
                  {EXAMPLES.map((ex) => (
                    <li key={ex}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/discover?q=${encodeURIComponent(ex)}`)}>
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul id={listId} role="listbox" aria-label="Suggestions" className={styles.list}>
                {items.map((s, i) => {
                  const heading = GROUP[s.type] !== lastGroup ? GROUP[s.type] : null;
                  lastGroup = GROUP[s.type];
                  return (
                    <li key={`${s.type}-${s.slug}`} role="presentation">
                      {heading && (
                        <span className={styles.group} aria-hidden>
                          {heading}
                        </span>
                      )}
                      <a
                        id={`${id}-opt-${i}`}
                        role="option"
                        aria-selected={i === active}
                        href={HREF[s.type](s.slug)}
                        className={styles.option}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          go(HREF[s.type](s.slug));
                        }}
                        onMouseEnter={() => setActive(i)}
                      >
                        <span className={styles.thumb} style={s.hue ? { background: s.hue } : undefined}>
                          {s.poster ? <Image src={s.poster} alt="" width={30} height={40} /> : null}
                        </span>
                        <span className={styles.text}>
                          <span className={s.type === 'fragrance' ? styles.fragName : styles.label}>{s.label}</span>
                          <span className={styles.sub}>{s.sub}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
                <li role="presentation">
                  <a
                    role="option"
                    id={`${id}-opt-all`}
                    aria-selected={false}
                    href={`/discover?q=${encodeURIComponent(q.trim())}`}
                    className={styles.all}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      go(`/discover?q=${encodeURIComponent(q.trim())}`);
                    }}
                  >
                    {items.length === 0 && status !== 'loading' ? 'No direct matches. ' : ''}
                    Search everything for “{q.trim()}”
                    <Icon name="arrow-right" size={16} />
                  </a>
                </li>
              </ul>
            )}
            {status === 'error' && <p className={styles.error}>Search is having trouble connecting. Try again in a moment.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
