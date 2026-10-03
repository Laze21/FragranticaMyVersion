'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { signOutAction } from '@/app/actions/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Sheet } from '@/components/ui/Sheet';
import { usePresence } from '@/components/ui/usePresence';
import { BROWSE_LINKS, isCurrent } from './NavLinks';
import styles from './SiteHeader.module.css';

/* A book: the glyph for browsing the site. Drawn here until the icon set carries one. */
function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a1 1 0 0 1 1 1v15a1 1 0 0 0-1-1H5.5A1.5 1.5 0 0 1 4 17.5V5.5ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13a1 1 0 0 0-1 1v15a1 1 0 0 1 1-1h5.5a1.5 1.5 0 0 0 1.5-1.5V5.5Z" />
    </svg>
  );
}

/**
 * From 720 up: Sign in, or the avatar with its menu. On phones the tab bar carries Sign in and
 * You, so the header's control becomes Browse: a sheet listing the parts of the site the five
 * tabs cannot reach, plus the account items when signed in.
 */
export function AccountButton() {
  const { viewer, loaded } = useViewer();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const present = usePresence(open);

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

  // Navigating closes the sheet; the pathname is the signal.
  useEffect(() => {
    setBrowse(false);
    setOpen(false);
  }, [path]);

  const staff = viewer && (viewer.role === 'admin' || viewer.role === 'moderator');

  const browseControl = (
    <>
      <button type="button" className={styles.browse} aria-label="Browse" aria-haspopup="dialog" aria-expanded={browse} onClick={() => setBrowse(true)}>
        <BookIcon />
      </button>
      <Sheet open={browse} onClose={() => setBrowse(false)} title="Browse">
        <ul className={styles.browseList} role="list">
          <li className={styles.browseGroup}>
            <p className={`t-label ${styles.browseLabel}`}>Explore</p>
            {BROWSE_LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={isCurrent(path, l.href) ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}
          </li>
          {viewer && (
            <li className={styles.browseGroup}>
              <p className={`t-label ${styles.browseLabel}`}>Yours</p>
              <Link href={`/u/${viewer.handle}`}>Profile</Link>
              <Link href="/shelf">Shelf</Link>
              <Link href="/diary">Wear diary</Link>
              <Link href="/contribute">Suggest a fragrance or fix</Link>
              {staff && <Link href="/admin">Moderation</Link>}
              <form action={signOutAction}>
                <button type="submit" className={styles.browseSignOut}>
                  Sign out
                </button>
              </form>
            </li>
          )}
          <li className={styles.browseGroup}>
            <p className={`t-label ${styles.browseLabel}`}>How this works</p>
            <Link href="/about/data">Where our data comes from</Link>
            <Link href="/contribute">Suggest a fragrance</Link>
          </li>
        </ul>
      </Sheet>
    </>
  );

  if (!loaded)
    return (
      <>
        <span className={`${styles.account} skeleton`} style={{ width: 36, height: 36, borderRadius: '50%' }} aria-hidden />
        {browseControl}
      </>
    );
  if (!viewer)
    return (
      <>
        <Link href="/sign-in" className={`btn btn--quiet btn--small ${styles.signin}`}>
          Sign in
        </Link>
        {browseControl}
      </>
    );

  return (
    <>
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
        {present && (
          <div className={styles.menu} role="menu" data-open={open || undefined}>
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
            {staff && (
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
      {browseControl}
    </>
  );
}
