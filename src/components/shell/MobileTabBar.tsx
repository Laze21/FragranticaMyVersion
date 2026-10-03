'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import { useViewer } from '@/components/viewer/ViewerProvider';
import styles from './MobileTabBar.module.css';

/** Phones get a thumb-reach tab bar. "Wear" sits in the middle: logging today's scent is the daily habit. */
export function MobileTabBar() {
  const path = usePathname();
  const { viewer } = useViewer();
  const tabs: Array<{ href: string; label: string; icon: IconName; primary?: boolean }> = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/discover', label: 'Discover', icon: 'search' },
    { href: '/diary?log=1', label: 'Wear', icon: 'atomizer', primary: true },
    { href: '/shelf', label: 'Shelf', icon: 'shelf' },
    { href: viewer ? `/u/${viewer.handle}` : '/sign-in', label: viewer ? 'You' : 'Sign in', icon: 'user' },
  ];
  return (
    <nav className={styles.bar} aria-label="Primary">
      {tabs.map((t) => {
        const base = t.href.split('?')[0];
        const active = base === '/' ? path === '/' : path.startsWith(base);
        return (
          <Link key={t.label} href={t.href} className={styles.tab} data-primary={t.primary || undefined} aria-current={active ? 'page' : undefined}>
            <span className={styles.icon}>
              <Icon name={t.icon} size={22} />
            </span>
            <span className={styles.label}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
