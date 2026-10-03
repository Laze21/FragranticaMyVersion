import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { getDiary, shelfOptions } from '@/lib/data/diary';
import { DiaryView } from '@/components/diary/DiaryView';
import styles from '../shelf/page.module.css';

export const metadata: Metadata = { title: 'Wear diary', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DiaryPage(props: PageProps<'/diary'>) {
  const sp = await props.searchParams;
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className={`page ${styles.page}`}>
        <h1 className={styles.title}>Wear diary</h1>
        <p className={styles.lede}>
          Log what you wore, in one tap. Over time you’ll see your real rotation, what you reach for when it rains, and which bottles haven’t
          left the shelf in months.
        </p>
        <p className="cluster" style={{ marginTop: 'var(--s-5)' }}>
          <Link href="/sign-in?next=/diary" className="btn">
            Sign in to start a diary
          </Link>
        </p>
      </div>
    );
  }
  const [entries, options] = await Promise.all([getDiary(viewer.id), shelfOptions(viewer.id)]);
  return (
    <div className={`page ${styles.page}`}>
      <DiaryView entries={entries} options={options} openLog={sp.log === '1'} today={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
