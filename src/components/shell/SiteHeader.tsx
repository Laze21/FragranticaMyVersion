import Link from 'next/link';
import { APP_NAME } from '@/lib/config';
import { SearchBox } from '@/components/search/SearchBox';
import { AccountButton } from './AccountButton';
import { NavLinks } from './NavLinks';
import { TrailMark } from './TrailMark';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`page ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label={`${APP_NAME} home`}>
          <TrailMark className={styles.mark} />
          <span className={styles.wordmark}>{APP_NAME}</span>
        </Link>
        <div className={styles.search}>
          <SearchBox />
        </div>
        <NavLinks />
        <AccountButton />
      </div>
    </header>
  );
}
