import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { getShelf, shelfInsights } from '@/lib/data/shelf';
import { getCards } from '@/lib/data/catalog';
import { ShelfView } from '@/components/shelf/ShelfView';
import { FragranceCard } from '@/components/cards/FragranceCard';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Your shelf', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ShelfPage(props: PageProps<'/shelf'>) {
  const sp = await props.searchParams;
  const viewer = await getViewer();
  if (!viewer) {
    const picks = await getCards('true', [], 's.popularity desc nulls last', 4);
    return (
      <div className={`page ${styles.page}`}>
        <h1 className={styles.title}>Your shelf</h1>
        <p className={styles.lede}>
          Keep track of what you own, what you’re testing, what you want to sample and what you’ve moved on from. Sizes, decants, batch codes,
          what you paid: the stuff people keep in spreadsheets, without the spreadsheet.
        </p>
        <p className="cluster" style={{ marginTop: 'var(--s-5)' }}>
          <Link href="/sign-in?next=/shelf" className="btn">
            Sign in to start your shelf
          </Link>
          <Link href="/sign-up?next=/shelf" className="btn btn--quiet">
            Create an account
          </Link>
        </p>
        <h2 className={styles.h2}>Popular places to start</h2>
        <ul role="list" className={styles.grid}>
          {picks.map((c) => (
            <li key={c.id}>
              <FragranceCard card={c} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const items = await getShelf(viewer.id);
  const insights = await shelfInsights(items);
  return (
    <div className={`page ${styles.page}`}>
      {sp.welcome && (
        <p className={styles.welcome} role="status">
          Welcome. Your shelf is empty for now: open any fragrance and use “Add to shelf”.
        </p>
      )}
      <ShelfView items={items} insights={insights} owner={{ handle: viewer.handle, displayName: viewer.displayName }} editable />
    </div>
  );
}
