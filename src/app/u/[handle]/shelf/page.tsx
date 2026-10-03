import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { sqlOne } from '@/lib/db';
import { getProfileByHandle, getShelf, shelfInsights } from '@/lib/data/shelf';
import { ShelfView } from '@/components/shelf/ShelfView';
import { PrivateProfile } from '@/components/shelf/PrivateProfile';
import { profileHead } from '@/components/shelf/ProfileHeader';
import { Avatar } from '@/components/ui/Avatar';
import styles from '../../../shelf/page.module.css';

export const dynamic = 'force-dynamic';

const NOBODY = '00000000-0000-0000-0000-000000000000';

export async function generateMetadata(props: PageProps<'/u/[handle]/shelf'>): Promise<Metadata> {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  return { title: p ? `${p.display_name}’s shelf` : 'Shelf', robots: p?.is_private ? { index: false } : undefined };
}

/** Someone's shelf, the same cabinet as /shelf without the edit controls, headed by who it belongs to. */
export default async function PublicShelf(props: PageProps<'/u/[handle]/shelf'>) {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  if (!p) notFound();
  const viewer = await getViewer();
  const mine = viewer?.id === p.id;
  const head = profileHead(p);
  if (p.is_private && !mine) {
    const follow = await sqlOne<{ me: boolean }>(`select exists (select 1 from public.follows where followee_id = $1 and follower_id = $2) me`, [String(p.id), viewer?.id ?? NOBODY]);
    return <PrivateProfile p={head} signedIn={Boolean(viewer)} following={Boolean(follow?.me)} />;
  }
  const items = await getShelf(String(p.id));
  return (
    <div className={`page ${styles.page}`}>
      <p className={styles.owner}>
        <Avatar name={head.displayName} hue={head.hue} size={28} />
        <Link href={`/u/${head.handle}`}>{head.displayName}</Link>
        <span className="t-meta">@{head.handle}</span>
      </p>
      <ShelfView items={items} insights={await shelfInsights(items)} owner={{ handle: head.handle, displayName: head.displayName }} editable={mine} />
    </div>
  );
}
