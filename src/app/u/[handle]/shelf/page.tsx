import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { getProfileByHandle, getShelf, shelfInsights } from '@/lib/data/shelf';
import { ShelfView } from '@/components/shelf/ShelfView';
import { PrivateProfile } from '@/components/shelf/PrivateProfile';
import styles from '../../../shelf/page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: PageProps<'/u/[handle]/shelf'>): Promise<Metadata> {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  return { title: p ? `${p.display_name}’s shelf` : 'Shelf' };
}

export default async function PublicShelf(props: PageProps<'/u/[handle]/shelf'>) {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  if (!p) notFound();
  const viewer = await getViewer();
  const mine = viewer?.id === p.id;
  if (p.is_private && !mine) return <PrivateProfile name={String(p.display_name)} />;
  const items = await getShelf(String(p.id));
  return (
    <div className={`page ${styles.page}`}>
      <ShelfView items={items} insights={await shelfInsights(items)} owner={{ handle: String(p.handle), displayName: String(p.display_name) }} editable={mine} />
    </div>
  );
}
