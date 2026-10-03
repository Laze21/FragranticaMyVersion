import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { sql, sqlOne } from '@/lib/db';
import { getProfileByHandle, getShelf, shelfInsights } from '@/lib/data/shelf';
import { reviewsByUser } from '@/lib/data/reviews';
import { Avatar } from '@/components/ui/Avatar';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { ReviewItem } from '@/components/reviews/ReviewItem';
import { PrivateProfile } from '@/components/shelf/PrivateProfile';
import { FollowButton } from '@/components/shelf/FollowButton';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { EXPERIENCE_LABEL } from '@/lib/scent/vocab';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: PageProps<'/u/[handle]'>): Promise<Metadata> {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  if (!p) return { title: 'Not found' };
  return { title: `${p.display_name} (@${p.handle})`, robots: p.is_private ? { index: false } : undefined };
}

export default async function ProfilePage(props: PageProps<'/u/[handle]'>) {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  if (!p) notFound();
  const viewer = await getViewer();
  const mine = viewer?.id === p.id;
  if (p.is_private && !mine) return <PrivateProfile name={String(p.display_name)} />;
  const id = String(p.id);
  const [items, reviews, rotation, lists, follow] = await Promise.all([
    getShelf(id),
    reviewsByUser(id, 10),
    sql<{ slug: string; name: string; brand: string; poster: string | null; n: string }>(
      `select f.slug, f.name, b.name brand, a.url poster, count(*) n
         from public.wear_logs w join public.wear_log_items i on i.wear_log_id = w.id
         join public.fragrances f on f.id = i.fragrance_id join public.brands b on b.id = f.brand_id
         left join public.fragrance_assets a on a.fragrance_id = f.id and a.kind = 'poster' and a.is_primary
        where w.user_id = $1 and w.worn_on > current_date - 45
        group by f.slug, f.name, b.name, a.url order by n desc limit 5`,
      [id],
    ),
    sql<{ slug: string; title: string; n: string }>(
      `select l.slug, l.title, count(li.fragrance_id) n from public.lists l left join public.list_items li on li.list_id = l.id
        where l.user_id = $1 and (l.is_public or $2) group by l.id order by l.created_at desc`,
      [id, mine],
    ),
    sqlOne<{ followers: string; following: string; me: boolean }>(
      `select (select count(*) from public.follows where followee_id = $1) followers,
              (select count(*) from public.follows where follower_id = $1) following,
              exists (select 1 from public.follows where followee_id = $1 and follower_id = $2) me`,
      [id, viewer?.id ?? '00000000-0000-0000-0000-000000000000'],
    ),
  ]);
  const insights = await shelfInsights(items);
  const owned = items.filter((i) => i.status === 'own');
  const signature = rotation[0];

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <Avatar name={String(p.display_name)} hue={(p.avatar_hue as string) ?? null} size={72} />
        <div className={styles.id}>
          <h1 className={styles.name}>{String(p.display_name)}</h1>
          <p className={styles.meta}>
            @{String(p.handle)} · {EXPERIENCE_LABEL[String(p.experience_level)]}
            {p.location ? ` · ${p.location}` : ''}
            {p.is_demo ? (
              <>
                {' '}
                · <DemoFlag label="Demo account" />
              </>
            ) : null}
          </p>
          {p.bio ? <p className={styles.bio}>{String(p.bio)}</p> : null}
          <p className={styles.follow}>
            {!mine && viewer && <FollowButton handle={String(p.handle)} initial={Boolean(follow?.me)} />}
            <span className="t-meta">
              {follow?.followers} followers · following {follow?.following}
            </span>
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        <section aria-labelledby="identity" className={styles.identity}>
          <h2 id="identity" className={styles.h2}>
            Scent identity
          </h2>
          {owned.length ? (
            <>
              <p className={styles.line}>
                {owned.length} on the shelf{insights.topNotes[0] ? `, with a soft spot for ${insights.topNotes[0].name.toLowerCase()}` : ''}.
                {signature ? (
                  <>
                    {' '}
                    Lately it’s mostly <Link href={`/fragrance/${signature.slug}`}>{signature.name}</Link>.
                  </>
                ) : null}
              </p>
              <CharacterBars vec={insights.character} limit={5} label={`${p.display_name}'s shelf character`} />
            </>
          ) : (
            <p className="t-meta">Nothing on the shelf yet.</p>
          )}
        </section>
        <section aria-labelledby="rotation">
          <h2 id="rotation" className={styles.h2}>
            Current rotation
          </h2>
          {rotation.length ? (
            <ul role="list" className={styles.rotation}>
              {rotation.map((r) => (
                <li key={r.slug}>
                  <Link href={`/fragrance/${r.slug}`}>
                    <span className={styles.rThumb}>{r.poster && <Image src={r.poster} alt="" fill sizes="80px" />}</span>
                    <span className={styles.rName}>{r.name}</span>
                    <span className="t-meta">
                      {r.brand} · {r.n}× lately
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-meta">No wears logged in the last six weeks.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="shelf" className={styles.section}>
        <div className={styles.rowHead}>
          <h2 id="shelf" className={styles.h2}>
            Shelf
          </h2>
          <Link href={`/u/${p.handle}/shelf`} className="arrow-link">
            See all {items.length} →
          </Link>
        </div>
        <ul role="list" className={styles.shelf}>
          {owned.slice(0, 10).map((i) => (
            <li key={i.card.id}>
              <Link href={`/fragrance/${i.card.slug}`} aria-label={i.card.name}>
                <span className={styles.sThumb}>{i.card.poster && <Image src={i.card.poster} alt="" fill sizes="90px" />}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {lists.length > 0 && (
        <section aria-labelledby="lists" className={styles.section}>
          <h2 id="lists" className={styles.h2}>
            Lists
          </h2>
          <ul role="list" className={styles.lists}>
            {lists.map((l) => (
              <li key={l.slug}>
                <Link href={`/lists/${p.handle}/${l.slug}`}>{l.title}</Link> <span className="t-meta">{l.n} fragrances</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="reviews" className={styles.section}>
        <h2 id="reviews" className={styles.h2}>
          Reviews
        </h2>
        {reviews.length ? reviews.map((r) => <ReviewItem key={r.id} review={r} showFragrance />) : <p className="t-meta">No reviews yet.</p>}
      </section>
    </div>
  );
}
