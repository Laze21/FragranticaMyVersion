import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { getShelf, shelfInsights } from '@/lib/data/shelf';
import { getCards } from '@/lib/data/catalog';
import { ShelfView } from '@/components/shelf/ShelfView';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { Ledge } from '@/components/scent/Ledge';
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
        <div className={styles.intro}>
          <h1 className={`t-display ${styles.title}`}>Your shelf</h1>
          <p className={styles.lede}>
            What you own, what you’re testing, what you want to sample and what you’ve moved on from. Sizes, decants, batch codes, what you paid:
            the things people keep in spreadsheets, without the spreadsheet.
          </p>
          <p className={`cluster ${styles.actions}`}>
            <Link href="/sign-in?next=/shelf" className="btn">
              Sign in to start your shelf
            </Link>
            <Link href="/sign-up?next=/shelf" className="btn btn--quiet">
              Create an account
            </Link>
          </p>
        </div>
        <section aria-labelledby="starters" className={styles.starters}>
          <h2 id="starters" className="t-h3">
            Popular places to start
          </h2>
          <Ledge slots={picks.length} minSlot={150} className={styles.ledge}>
            {picks.map((c) => (
              <FragranceCard key={c.id} card={c} sizes="(max-width: 719px) 50vw, 300px" />
            ))}
          </Ledge>
        </section>
      </div>
    );
  }
  const items = await getShelf(viewer.id);
  const insights = await shelfInsights(items);
  return (
    <div className={`page ${styles.page}`}>
      {sp.welcome && (
        <p className={styles.welcome} role="status">
          Welcome. The shelf is empty for now: open any fragrance and use Add to shelf, or add a bottle from here.
        </p>
      )}
      <ShelfView items={items} insights={insights} owner={{ handle: viewer.handle, displayName: viewer.displayName }} editable />
    </div>
  );
}
