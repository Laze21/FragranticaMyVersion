'use client';

import { useVotes, type VoteKind } from './VoteProvider';
import styles from './sections.module.css';

function hasVoted(mine: ReturnType<typeof useVotes>['mine'], kind: VoteKind) {
  if (!mine) return false;
  switch (kind) {
    case 'perceived':
      return mine.perceived.length > 0;
    case 'performance':
      return !!mine.performance;
    case 'wear':
      return Object.keys(mine.wear).length > 0;
    case 'rating':
      return !!mine.rating;
    case 'character':
      return Object.keys(mine.character).length > 0;
  }
}

/** Opens one of the page's vote sheets. Reads "Change your answer" once the viewer has voted. */
export function VoteButton({ kind, label, editedLabel, className }: { kind: VoteKind; label: string; editedLabel?: string; className?: string }) {
  const { open, mine } = useVotes();
  return (
    <button type="button" className={className ?? 'btn btn--quiet'} onClick={() => open(kind)}>
      {hasVoted(mine, kind) ? (editedLabel ?? 'Change your answer') : label}
    </button>
  );
}

/** The same prompt as a text link, for a section's meta line on phones and tablets. */
export function VoteLink({ kind, label, editedLabel }: { kind: VoteKind; label: string; editedLabel?: string }) {
  const { open, mine } = useVotes();
  return (
    <button type="button" className={styles.voteLink} onClick={() => open(kind)}>
      {hasVoted(mine, kind) ? (editedLabel ?? 'Change yours') : label}
    </button>
  );
}
