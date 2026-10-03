import Link from 'next/link';
import { APP_NAME } from '@/lib/config';
import { TrailMark } from './TrailMark';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.grid}`}>
        <div className={styles.about}>
          <p className={styles.brand}>
            <TrailMark className={styles.mark} />
            {APP_NAME}
          </p>
          <p className={styles.blurb}>
            A fragrance database you can read in ten seconds or study for an hour. Official notes and what people actually smell, kept
            apart and sourced.
          </p>
        </div>
        <nav aria-label="Explore" className={styles.col}>
          <p className="t-label">Explore</p>
          <Link href="/discover">Discover</Link>
          <Link href="/notes">Notes</Link>
          <Link href="/learn">Learn the words</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/lists">Lists</Link>
        </nav>
        <nav aria-label="You" className={styles.col}>
          <p className="t-label">Yours</p>
          <Link href="/shelf">Shelf</Link>
          <Link href="/diary">Wear diary</Link>
          <Link href="/contribute">Suggest a fragrance</Link>
        </nav>
        <nav aria-label="About" className={styles.col}>
          <p className="t-label">How this works</p>
          <Link href="/about/data">Where our data comes from</Link>
          <Link href="/about/moderation">Moderation log</Link>
          <Link href="/about/ads">Ads and affiliate links</Link>
        </nav>
      </div>
      <div className={`page ${styles.base}`}>
        <p>
          Prototype. Facts are editorial and still being checked against house pages. Brand names belong to their owners.
        </p>
      </div>
    </footer>
  );
}
