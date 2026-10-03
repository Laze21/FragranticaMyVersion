'use client';

import { useEffect, useState } from 'react';
import styles from './Toaster.module.css';

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; text: string; tone?: 'default' | 'error'; action?: ToastAction };
let push: ((t: Omit<Toast, 'id'>) => void) | null = null;

/** Fire-and-forget confirmation, optionally with one action (Undo). Announced politely. */
export function toast(text: string, tone: Toast['tone'] = 'default', action?: ToastAction) {
  push?.({ text, tone, action });
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    push = (t) => {
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.action ? 6000 : 3600);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {items.map((t) => (
        <p key={t.id} className={styles.toast} data-tone={t.tone}>
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                setItems((xs) => xs.filter((x) => x.id !== t.id));
              }}
            >
              {t.action.label}
            </button>
          )}
        </p>
      ))}
    </div>
  );
}
