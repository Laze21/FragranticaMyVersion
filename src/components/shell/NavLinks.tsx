'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SiteHeader.module.css';

export const NAV_LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/notes', label: 'Notes' },
  { href: '/compare', label: 'Compare' },
  { href: '/shelf', label: 'Shelf' },
  { href: '/diary', label: 'Diary' },
];

/** The phone Browse sheet lists the whole site; the header nav carries the five daily ones. */
export const BROWSE_LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/notes', label: 'Notes' },
  { href: '/learn', label: 'Learn the words' },
  { href: '/compare', label: 'Compare' },
  { href: '/lists', label: 'Lists' },
];

export function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      <ul role="list">
        {NAV_LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={isCurrent(path, l.href) ? 'page' : undefined} className={styles.navLink}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
