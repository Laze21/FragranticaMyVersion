'use client';

import { useEffect, useId, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { duration } from '@/lib/motion';
import { usePresence } from './usePresence';
import styles from './Sheet.module.css';

/**
 * Modal sheet on the native <dialog> element: focus trapping, Escape and the inert background
 * come from the platform. Bottom sheet on phones (thumb reach), centred panel on larger screens.
 * The page never has its overflow toggled: a modal dialog already inerts it, the scrollbar
 * gutter is reserved globally, and the body contains its own overscroll.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const id = useId();
  // The phone sheet slides out over the standard duration, so the content stays for that long.
  const present = usePresence(open, duration('standard'));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Screen readers hear the title and description first, not "Close".
      body.current?.focus({ preventScroll: true });
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      data-wide={wide || undefined}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {present && (
        <div className={styles.inner}>
          <header className={styles.head}>
            <div>
              <h2 id={`${id}-title`} className={styles.title}>
                {title}
              </h2>
              {description && (
                <p id={`${id}-desc`} className={styles.desc}>
                  {description}
                </p>
              )}
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          <div className={styles.body} ref={body} tabIndex={-1}>
            {children}
          </div>
          {footer && <footer className={styles.foot}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
