'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { signOutAction } from '@/app/actions/auth';
import { Avatar } from '@/components/ui/Avatar';
import styles from './SiteHeader.module.css';

export function AccountButton() {
  const { viewer, loaded } = useViewer();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!loaded) return <span className={`${styles.account} skeleton`} style={{ width: 36, height: 36, borderRadius: '50%' }} aria-hidden />;
  if (!viewer)
    return (
      <Link href="/sign-in" className={`btn btn--quiet btn--small ${styles.signin}`}>
        Sign in
      </Link>
    );

  return (
    <div className={styles.account} ref={ref}>
      <button
        type="button"
        className={styles.avatarBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${viewer.displayName}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={viewer.displayName} hue={viewer.avatarHue} size={34} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.menuHead}>
            <strong>{viewer.displayName}</strong>
            <span>@{viewer.handle}</span>
          </p>
          <Link role="menuitem" href={`/u/${viewer.handle}`} onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link role="menuitem" href="/shelf" onClick={() => setOpen(false)}>
            Shelf
          </Link>
          <Link role="menuitem" href="/diary" onClick={() => setOpen(false)}>
            Wear diary
          </Link>
          <Link role="menuitem" href="/contribute" onClick={() => setOpen(false)}>
            Suggest a fragrance or fix
          </Link>
          {(viewer.role === 'admin' || viewer.role === 'moderator') && (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)}>
              Moderation
            </Link>
          )}
          <form action={signOutAction}>
            <button role="menuitem" type="submit">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
