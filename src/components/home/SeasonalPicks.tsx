'use client';

import Link from 'next/link';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { useViewer } from '@/components/viewer/ViewerProvider';
import type { FragranceCard as Card } from '@/lib/data/types';
import styles from '@/app/page.module.css';

/**
 * "Made for autumn" for everyone; "From your shelf, for today" once the viewer is signed in and
 * at least three of the season's fragrances are on their shelf. The page is static, so the swap
 * happens here, after the shelf map arrives, and the first paint is the public version.
 */
export function SeasonalPicks({ season, seasonKey, cards, show = 6 }: { season: string; seasonKey: string; cards: Card[]; show?: number }) {
  const { shelf, loaded } = useViewer();
  const owned = loaded ? cards.filter((c) => shelf[c.slug] && ['own', 'testing'].includes(shelf[c.slug].status)) : [];
  const yours = owned.length >= 3;
  const list = (yours ? owned : cards).slice(0, show);
  return (
    <>
      <div className={styles.headRow}>
        <h2 id="seasonal" className="t-h3">
          {yours ? 'From your shelf, for today' : `Made for ${season.toLowerCase()}`}
        </h2>
        <p className={styles.sub}>{yours ? `Bottles you have that people say suit ${season.toLowerCase()}.` : `Best rated of the ones people say suit ${season.toLowerCase()}.`}</p>
      </div>
      <ul role="list" className={styles.floorGrid}>
        {list.map((c) => (
          <li key={c.id}>
            <FragranceCard card={c} sizes="(max-width: 719px) 46vw, 220px" />
          </li>
        ))}
      </ul>
      <Link href={`/discover?season=${seasonKey}&sort=rating`} className={styles.more}>
        All {season.toLowerCase()} picks
      </Link>
    </>
  );
}
