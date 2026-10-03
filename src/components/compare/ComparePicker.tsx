'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './ComparePicker.module.css';

interface Suggestion {
  type: string;
  slug: string;
  label: string;
  sub: string;
}

export function compareHref(slugs: string[]): string {
  return `/compare?f=${slugs.join(',')}`;
}

/**
 * Adds a fragrance to the comparison by name. Two shapes: a 32px chip ("+ Add a fragrance")
 * that expands into the suggest field when pressed and folds back when it loses focus empty,
 * and a plain field for the empty page and the phone sheet's Replace. `replace` swaps one
 * column for the pick instead of appending; the URL is the state, so a pick is a navigation.
 */
export function ComparePicker({
  current,
  variant = 'field',
  replace,
  autoFocus,
  label,
  onPicked,
  onCollapse,
}: {
  current: string[];
  variant?: 'chip' | 'field';
  /** the slug this pick replaces, for the phone sheet */
  replace?: string;
  autoFocus?: boolean;
  label?: string;
  onPicked?: (slug: string) => void;
  onCollapse?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(variant === 'field');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      setActive(-1);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const d = (await res.json()) as { items: Suggestion[] };
        setItems(d.items.filter((i) => i.type === 'fragrance' && !current.includes(i.slug)).slice(0, 6));
        setActive(-1);
      } catch {
        /* a cancelled or failed suggest leaves the previous list; the field still works by Enter */
      }
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, current]);

  useEffect(() => {
    if (open && (variant === 'chip' || autoFocus)) input.current?.focus();
  }, [open, variant, autoFocus]);

  const collapse = () => {
    if (variant !== 'chip') return;
    setOpen(false);
    setQ('');
    setItems([]);
    onCollapse?.();
  };

  const pick = (slug: string) => {
    setQ('');
    setItems([]);
    onPicked?.(slug);
    const next = replace ? current.map((s) => (s === replace ? slug : s)) : [...current, slug];
    router.push(compareHref(next));
    if (variant === 'chip') setOpen(false);
  };

  if (variant === 'chip' && !open) {
    return (
      <button type="button" className={`chip ${styles.chip}`} onClick={() => setOpen(true)} aria-haspopup="listbox">
        <Icon name="plus" size={16} />
        Add a fragrance
      </button>
    );
  }

  const listId = `${id}-list`;
  return (
    <div
      className={styles.wrap}
      data-variant={variant}
      ref={wrap}
      onBlur={(e) => {
        // Leaving the whole control with nothing typed folds the chip back; a pick is a navigation anyway.
        if (variant === 'chip' && !q && !wrap.current?.contains(e.relatedTarget as Node)) collapse();
      }}
    >
      <label htmlFor={`${id}-input`} className={variant === 'chip' ? 'visually-hidden' : styles.label}>
        {label ?? (replace ? 'Replace it with' : current.length ? 'Add another fragrance' : 'Start with a fragrance')}
      </label>
      <input
        ref={input}
        id={`${id}-input`}
        className={`input ${styles.input}`}
        placeholder={current.length ? 'Type a name' : 'Type a name, e.g. Santal 33'}
        value={q}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && items.length) {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === 'ArrowUp' && items.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === 'Enter') {
            const chosen = items[active >= 0 ? active : 0];
            if (chosen) {
              e.preventDefault();
              pick(chosen.slug);
            }
          } else if (e.key === 'Escape') {
            if (q) setQ('');
            else collapse();
          }
        }}
        autoComplete="off"
      />
      <ul role="listbox" id={listId} className={styles.list} hidden={items.length === 0} aria-label="Matching fragrances">
        {items.map((i, n) => (
          <li key={i.slug} id={`${listId}-${n}`} role="option" aria-selected={n === active}>
            <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i.slug)} data-active={n === active || undefined}>
              <span className={styles.name}>{i.label}</span>
              <span className={styles.sub}>{i.sub}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
