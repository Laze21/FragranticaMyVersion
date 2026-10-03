import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { getFragrance } from '@/lib/data/catalog';
import { sqlOne } from '@/lib/db';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Write a review', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ReviewPage(props: PageProps<'/fragrance/[slug]/review'>) {
  const { slug } = await props.params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=/fragrance/${slug}/review`);
  const f = await getFragrance(slug);
  if (!f) notFound();
  const existing = await sqlOne<Record<string, unknown>>(
    `select kind, title, body, rating_overall, focus, ownership, gifted, gift_note from public.reviews where user_id = $1 and fragrance_id = $2 and status <> 'deleted'`,
    [viewer.id, f.id],
  );
  const owned = await sqlOne<{ status: string }>(
    `select i.status from public.collection_items i join public.collections c on c.id = i.collection_id where c.user_id = $1 and i.fragrance_id = $2`,
    [viewer.id, f.id],
  );
  const wears = await sqlOne<{ n: string }>(
    `select count(*) n from public.wear_log_items i join public.wear_logs w on w.id = i.wear_log_id where w.user_id = $1 and i.fragrance_id = $2`,
    [viewer.id, f.id],
  );
  return (
    <div className={`page ${styles.page}`} style={{ ['--scent' as string]: f.accent }}>
      <header className={styles.head}>
        <div className={styles.thumb}>{f.poster && <Image src={f.poster} alt="" fill sizes="80px" />}</div>
        <div>
          <p className="t-meta">{existing ? 'Edit your review of' : 'Reviewing'}</p>
          <h1 className={`t-title ${styles.name}`}>
            <Link href={`/fragrance/${f.slug}`}>{f.name}</Link>
          </h1>
          <p className="t-meta">{f.brandName}</p>
        </div>
      </header>
      <ReviewComposer
        slug={f.slug}
        initial={
          existing
            ? {
                kind: existing.kind as 'quick' | 'full',
                title: (existing.title as string) ?? '',
                body: existing.body as string,
                rating: Number(existing.rating_overall),
                focus: (existing.focus as string[]) ?? [],
                ownership: (existing.ownership as string) ?? '',
                gifted: Boolean(existing.gifted),
                giftNote: (existing.gift_note as string) ?? '',
              }
            : null
        }
        suggestedOwnership={owned?.status === 'own' ? 'own' : owned?.status === 'had' ? 'owned' : owned?.status === 'sampled' || owned?.status === 'testing' ? 'sample' : ''}
        wears={Number(wears?.n ?? 0)}
      />
    </div>
  );
}
