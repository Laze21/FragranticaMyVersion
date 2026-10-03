import Link from 'next/link';
import { APP_NAME } from '@/lib/config';
import { TrailMark } from './TrailMark';
import styles from './SiteFooter.module.css';

const GROUPS = [
  {
    label: 'Explore',
    links: [
      { href: '/discover', label: 'Discover' },
      { href: '/notes', label: 'Notes' },
      { href: '/house', label: 'Houses' },
      { href: '/perfumer', label: 'Perfumers' },
      { href: '/learn', label: 'Learn the words' },
      { href: '/compare', label: 'Compare' },
      { href: '/lists', label: 'Lists' },
    ],
  },
  {
    label: 'Yours',
    links: [
      { href: '/shelf', label: 'Shelf' },
      { href: '/diary', label: 'Wear diary' },
      { href: '/contribute', label: 'Suggest a fragrance' },
    ],
  },
  {
    label: 'How this works',
    links: [
      { href: '/about/data', label: 'Where our data comes from' },
      { href: '/about/moderation', label: 'Moderation log' },
      { href: '/about/ads', label: 'Ads and affiliate links' },
    ],
  },
];

/**
 * A colophon, not a footer: the blurb on the left, every link in one running line on the
 * right, the legal line beneath. On phones the links fold into two short columns with
 * "How this works" across the bottom.
 */
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
        <div className={styles.links}>
          {GROUPS.map((g) => (
            <nav key={g.label} aria-label={g.label} className={styles.group}>
              <p className={`t-label ${styles.groupLabel}`}>{g.label}</p>
              <ul role="list">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className={styles.legal}>Prototype. Facts are editorial and still being checked against house pages. Brand names belong to their owners.</p>
      </div>
    </footer>
  );
}
