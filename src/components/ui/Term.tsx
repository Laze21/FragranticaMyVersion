import Link from 'next/link';
import { GLOSSARY_BY_SLUG } from '@/lib/glossary';
import { Popover } from './Popover';
import styles from './Term.module.css';

/**
 * Inline explanation for fragrance vocabulary. Dotted underline, tap for a one-line meaning and a
 * link to the full entry. Server component: only the terms used on a page are shipped.
 */
export function Term({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const t = GLOSSARY_BY_SLUG[slug];
  if (!t) return <>{children}</>;
  return (
    <Popover label={`What “${t.term}” means`} triggerClassName={styles.term} trigger={children ?? t.term}>
      <span className={styles.head}>{t.term}</span>
      <span className={styles.body}>{t.short}</span>
      <Link href={`/learn/${t.slug}`} className={styles.more}>
        More about {t.term.toLowerCase()}
      </Link>
    </Popover>
  );
}
