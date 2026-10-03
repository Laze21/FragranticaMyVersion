'use client';

import { useVotes, type VoteKind } from './VoteProvider';

/** Opens one of the page's vote sheets. Shows "Edit your answer" once the viewer has voted. */
export function VoteButton({ kind, label, editedLabel }: { kind: VoteKind; label: string; editedLabel?: string }) {
  const { open, mine } = useVotes();
  const voted =
    !!mine &&
    ((kind === 'perceived' && mine.perceived.length > 0) ||
      (kind === 'performance' && !!mine.performance) ||
      (kind === 'wear' && Object.keys(mine.wear).length > 0) ||
      (kind === 'rating' && !!mine.rating) ||
      (kind === 'character' && Object.keys(mine.character).length > 0));
  return (
    <button type="button" className="btn btn--quiet" onClick={() => open(kind)}>
      {voted ? editedLabel ?? 'Change your answer' : label}
    </button>
  );
}
