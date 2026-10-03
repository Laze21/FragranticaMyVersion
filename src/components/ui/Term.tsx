import Link from 'next/link';
import { cache } from 'react';
import { GLOSSARY_BY_SLUG } from '@/lib/glossary';
import { NOTES } from '@/seed/notes';
import { Popover } from './Popover';
import styles from './Term.module.css';

/*
 * One dotted underline per term per page. `cache` is scoped to the request on the server, so
 * the Set is this page's and nothing else's; later occurrences keep the popover but lose the
 * line, the way a magazine footnotes a word once.
 */
const seenOnThisPage = cache(() => new Set<string>());
const NOTE_BY_SLUG = new Map(NOTES.map((n) => [n.slug, n]));

/**
 * Inline explanation for fragrance vocabulary. Dotted underline, tap for the meaning, what it
 * smells like when the term is a note, and a link to the full entry. Server component: only
 * the terms used on a page are shipped. `quiet` is for small labels (a definition list's dt),
 * where the line appears only on hover or focus.
 */
export function Term({ slug, children, quiet }: { slug: string; children?: React.ReactNode; quiet?: boolean }) {
  const t = GLOSSARY_BY_SLUG[slug];
  if (!t) return <>{children}</>;
  const seen = seenOnThisPage();
  const repeat = seen.has(slug);
  seen.add(slug);
  const note = NOTE_BY_SLUG.get(slug);
  const href = note ? `/notes/${note.slug}` : `/learn/${t.slug}`;
  return (
    <Popover label={`What “${t.term}” means`} triggerClassName={styles.term} trigger={<span data-repeat={repeat || undefined} data-quiet={quiet || undefined}>{children ?? t.term}</span>}>
      <span className={styles.head}>{t.term}</span>
      <span className={styles.body}>{t.short}</span>
      {/* Handoff: `noteSummary()` (WP11a) adds "Often with" and "Prominent in" here once it exists. */}
      {note && (
        <span className={styles.row}>
          <span className={styles.rowLabel}>Smells like</span>
          <span className={styles.rowBody}>{note.smellsLike}</span>
        </span>
      )}
      <Link href={href} className={styles.more}>
        {note ? `All about ${note.name.toLowerCase()}` : `More about ${t.term.toLowerCase()}`}
      </Link>
    </Popover>
  );
}
