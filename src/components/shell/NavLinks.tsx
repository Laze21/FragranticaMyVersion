'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SiteHeader.module.css';

const LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/notes', label: 'Notes' },
  { href: '/compare', label: 'Compare' },
  { href: '/shelf', label: 'Shelf' },
  { href: '/diary', label: 'Diary' },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      <ul role="list">
        {LINKS.map((l) => {
          const active = path === l.href || path.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={active ? 'page' : undefined} className={styles.navLink}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
