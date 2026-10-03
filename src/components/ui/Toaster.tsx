'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { duration, reducedMotion } from '@/lib/motion';
import styles from './Toaster.module.css';

type ToastAction = { label: string; onClick: () => void };
type Tone = 'default' | 'error';
type Toast = { id: number; text: string; tone: Tone; action?: ToastAction; leaving?: boolean };
let push: ((t: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Fire-and-forget confirmation, optionally with one action (Undo). Confirmations time out and
 * are announced politely; errors stay until dismissed and are announced as alerts. Copy is
 * object-first ("Sauvage logged for today.", "Rated 8/10."), never "Thanks."
 */
export function toast(text: string, tone: Tone = 'default', action?: ToastAction) {
  push?.({ text, tone, action });
}

const EXIT_MS = 200;

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  // One countdown per toast; a pointer or focus on the toast pauses it so it can be read.
  const timers = useRef(new Map<number, { handle: ReturnType<typeof setTimeout> | null; remaining: number; started: number }>());

  const remove = useCallback((id: number) => {
    timers.current.delete(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);
  const dismiss = useCallback(
    (id: number) => {
      const ms = reducedMotion() ? 0 : EXIT_MS;
      if (!ms) return remove(id);
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => remove(id), ms + 20);
    },
    [remove],
  );
  const schedule = useCallback(
    (id: number, ms: number) => {
      const entry = timers.current.get(id) ?? { handle: null, remaining: ms, started: Date.now() };
      entry.remaining = ms;
      entry.started = Date.now();
      entry.handle = setTimeout(() => dismiss(id), ms);
      timers.current.set(id, entry);
    },
    [dismiss],
  );
  const pause = (id: number) => {
    const entry = timers.current.get(id);
    if (!entry?.handle) return;
    clearTimeout(entry.handle);
    entry.handle = null;
    entry.remaining = Math.max(1200, entry.remaining - (Date.now() - entry.started));
  };
  const resume = (id: number) => {
    const entry = timers.current.get(id);
    if (!entry || entry.handle) return;
    schedule(id, entry.remaining);
  };

  useEffect(() => {
    let n = 0;
    push = (t) => {
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      if (t.tone !== 'error') schedule(id, t.action ? 6000 : 3600);
    };
    const map = timers.current;
    return () => {
      push = null;
      map.forEach((e) => e.handle && clearTimeout(e.handle));
      map.clear();
    };
  }, [schedule]);

  return (
    <div className={styles.region} aria-live="polite">
      {items.map((t) => (
        <p
          key={t.id}
          className={styles.toast}
          data-tone={t.tone}
          data-leaving={t.leaving || undefined}
          role={t.tone === 'error' ? 'alert' : 'status'}
          style={{ ['--toast-exit' as string]: `${duration('exit') ? EXIT_MS : 0}ms` }}
          onMouseEnter={() => pause(t.id)}
          onMouseLeave={() => resume(t.id)}
          onFocus={() => pause(t.id)}
          onBlur={() => resume(t.id)}
        >
          <span className={styles.text}>{t.text}</span>
          {t.action && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          {t.tone === 'error' && (
            <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <Icon name="close" size={18} />
            </button>
          )}
        </p>
      ))}
    </div>
  );
}
