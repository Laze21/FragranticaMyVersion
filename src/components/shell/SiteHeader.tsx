'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/config';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { SearchBox } from '@/components/search/SearchBox';
import { AccountButton } from './AccountButton';
import { NavLinks } from './NavLinks';
import { TrailMark } from './TrailMark';
import styles from './SiteHeader.module.css';

/**
 * The masthead. Under 1100px it hides on scroll-down and returns on scroll-up so a phone keeps
 * its reading window; from 1100 up it stays, because the fragrance rail is sticky against its
 * height. On /discover the page's own input is the single search, so the header carries only
 * the wordmark and the nav.
 */
export function SiteHeader() {
  const path = usePathname();
  const dir = useScrollDirection();
  const onDiscover = path === '/discover';
  return (
    <header className={styles.header} data-hidden={dir === 'down' || undefined}>
      <div className={`page ${styles.inner}`} data-search={!onDiscover || undefined}>
        <Link href="/" className={styles.brand} aria-label={`${APP_NAME} home`}>
          <TrailMark className={styles.mark} />
          <span className={styles.wordmark}>{APP_NAME}</span>
        </Link>
        {!onDiscover && (
          <div className={styles.search}>
            <SearchBox />
          </div>
        )}
        <NavLinks />
        <AccountButton />
      </div>
    </header>
  );
}
