import { confidence, formatNumber } from '@/lib/scent/read';
import { VoteLink } from './VoteButton';
import type { VoteKind } from './VoteProvider';
import styles from './sections.module.css';

/**
 * One head for every section, with the count as the brightest small text in it: "1,828 people"
 * in tabular ink, the descriptor beside it, the confidence meter after. No demo flag here (the
 * hero and the sources table carry it) and no vote button at the section's foot: from 1100 up
 * the rail holds the one vote prompt, below that it is a text link in this meta line.
 */
export function SectionHead({
  id,
  title,
  lede,
  votes,
  votesLabel = 'people',
  vote,
  children,
}: {
  id: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  votes?: number;
  votesLabel?: string;
  /** The phone's vote prompt for this section. */
  vote?: { kind: VoteKind; label: string; editedLabel?: string };
  /** Section-level actions ("Write a review"), kept in the head. */
  children?: React.ReactNode;
}) {
  const c = votes !== undefined ? confidence(votes) : null;
  const hasMeta = votes !== undefined || vote || children;
  return (
    <div className={styles.head}>
      <div className={styles.headText}>
        <h2 id={id} className={`t-display ${styles.title}`}>
          {title}
        </h2>
        {lede && <p className={styles.lede}>{lede}</p>}
      </div>
      {hasMeta && (
        <div className={styles.meta}>
          {votes !== undefined && (
            <span>
              <span className={styles.count}>{formatNumber(votes)}</span> {votesLabel}
            </span>
          )}
          {c && (
            <span className={styles.conf}>
              <span className={styles.confBars} aria-hidden>
                <i data-on={c.level >= 1 || undefined} />
                <i data-on={c.level >= 2 || undefined} />
                <i data-on={c.level >= 3 || undefined} />
              </span>
              <span className="visually-hidden">How settled this is: </span>
              {c.label}
            </span>
          )}
          {vote && <VoteLink kind={vote.kind} label={vote.label} editedLabel={vote.editedLabel} />}
          {children && <span className={styles.actions}>{children}</span>}
        </div>
      )}
    </div>
  );
}
