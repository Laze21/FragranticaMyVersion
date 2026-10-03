'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import styles from './Sheet.module.css';

/**
 * Modal sheet on the native <dialog> element: focus trapping, Escape and the inert background
 * come from the platform. Bottom sheet on phones (thumb reach), centred panel on larger screens.
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
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      data-wide={wide || undefined}
      aria-labelledby="sheet-title"
      onClose={() => {
        document.documentElement.style.overflow = '';
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className={styles.inner}>
          <header className={styles.head}>
            <div>
              <h2 id="sheet-title" className={styles.title}>
                {title}
              </h2>
              {description && <p className={styles.desc}>{description}</p>}
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.foot}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
