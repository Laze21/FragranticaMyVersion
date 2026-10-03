import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { diaryObservations, getDiary, groupByWeek, shelfOptions } from '@/lib/data/diary';
import { DiaryView } from '@/components/diary/DiaryView';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Wear diary', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DiaryPage(props: PageProps<'/diary'>) {
  const sp = await props.searchParams;
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={styles.intro}>
          <h1 className={`t-display ${styles.title}`}>Wear diary</h1>
          <p className={styles.lede}>
            Log what you wore, in one tap. After a few weeks the diary shows your real rotation and which bottles have not left the shelf.
          </p>
          <p className={`cluster ${styles.actions}`}>
            <Link href="/sign-in?next=/diary" className="btn">
              Sign in to start a diary
            </Link>
            <Link href="/sign-up?next=/diary" className="btn btn--quiet">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const [entries, options] = await Promise.all([getDiary(viewer.id), shelfOptions(viewer.id)]);
  return (
    <div className={`page ${styles.page}`}>
      <DiaryView
        entries={entries}
        weeks={groupByWeek(entries)}
        observations={diaryObservations(entries, options, today)}
        options={options}
        openLog={sp.log === '1'}
        today={today}
      />
    </div>
  );
}
