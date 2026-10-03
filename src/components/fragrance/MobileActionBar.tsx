'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { useVotes } from './VoteProvider';
import styles from './MobileActionBar.module.css';

/** On phones the essentials stay under the thumb while you scroll a long page. */
export function MobileActionBar({ slug }: { slug: string }) {
  const { open } = useVotes();
  return (
    <div className={styles.bar} role="toolbar" aria-label="Quick actions">
      <button type="button" onClick={() => open('rating')}>
        <Icon name="check" size={18} /> Rate
      </button>
      <button type="button" onClick={() => open('perceived')}>
        <Icon name="strip" size={18} /> I smell…
      </button>
      <Link href={`/fragrance/${slug}/review`}>
        <Icon name="edit" size={18} /> Review
      </Link>
    </div>
  );
}
