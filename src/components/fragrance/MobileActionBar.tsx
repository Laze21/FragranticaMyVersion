'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useVotes } from './VoteProvider';
import styles from './MobileActionBar.module.css';

/** On phones the essentials stay under the thumb while you scroll a long page. */
export function MobileActionBar({ slug }: { slug: string }) {
  const { open } = useVotes();
  // Only appears once the hero's own buttons have scrolled away, so two bars never compete.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById('hero-actions');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={styles.bar} role="toolbar" aria-label="Quick actions" data-show={show || undefined} aria-hidden={!show || undefined}>
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
