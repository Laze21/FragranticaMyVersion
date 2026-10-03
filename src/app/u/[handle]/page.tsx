import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { sql, sqlOne } from '@/lib/db';
import { getProfileByHandle, getShelf, identityLine, shelfInsights } from '@/lib/data/shelf';
import { getCardsBySlugs } from '@/lib/data/catalog';
import { reviewsByUser } from '@/lib/data/reviews';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { Ledge } from '@/components/scent/Ledge';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { TrailMark } from '@/components/shell/TrailMark';
import { ReviewItem } from '@/components/reviews/ReviewItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrivateProfile } from '@/components/shelf/PrivateProfile';
import { FollowButton } from '@/components/shelf/FollowButton';
import { ProfileHeader, profileHead } from '@/components/shelf/ProfileHeader';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const NOBODY = '00000000-0000-0000-0000-000000000000';

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
  const id = String(p.id);
  const head = profileHead(p);
  const follow = await sqlOne<{ followers: string; following: string; me: boolean }>(
    `select (select count(*) from public.follows where followee_id = $1) followers,
            (select count(*) from public.follows where follower_id = $1) following,
            exists (select 1 from public.follows where followee_id = $1 and follower_id = $2) me`,
    [id, viewer?.id ?? NOBODY],
  );
  if (p.is_private && !mine) return <PrivateProfile p={head} signedIn={Boolean(viewer)} following={Boolean(follow?.me)} />;

  const [items, reviews, rotationRows, lists] = await Promise.all([
    getShelf(id),
    reviewsByUser(id, 10),
    sql<{ slug: string; n: string }>(
      `select f.slug, count(*) n
         from public.wear_logs w join public.wear_log_items i on i.wear_log_id = w.id
         join public.fragrances f on f.id = i.fragrance_id
        where w.user_id = $1 and w.worn_on > current_date - 45
        group by f.slug order by n desc, f.slug limit 5`,
      [id],
    ),
    sql<{ slug: string; title: string; n: string }>(
      `select l.slug, l.title, count(li.fragrance_id) n from public.lists l left join public.list_items li on li.list_id = l.id
        where l.user_id = $1 and (l.is_public or $2) group by l.id order by l.created_at desc`,
      [id, mine],
    ),
  ]);
  const insights = await shelfInsights(items);
  const rotationCards = await getCardsBySlugs(rotationRows.map((r) => r.slug));
  const rotation = rotationRows.map((r) => ({ n: Number(r.n), card: rotationCards.find((c) => c.slug === r.slug) })).filter((r) => r.card);
  const owned = items.filter((i) => i.status === 'own');
  const wanted = items.filter((i) => i.status === 'want' || i.status === 'want_sample').length;
  const name = head.displayName;
  const identity = identityLine(insights, rotation[0]?.card?.name ?? null);
  const whose = mine ? 'Your' : `${name}’s`;
  // The insight sentences are written to the owner; a visitor reads them in the third person.
  const prose = mine ? insights.sentences : insights.sentences.map((t) => t.replace(/^You own/, `${name} owns`).replace(/\byour\b/g, 'their'));
  const shelfLine = [`${owned.length} on the shelf`, wanted ? `${wanted} wanted` : null].filter(Boolean).join(' · ');
  const firstOwned = owned[0]?.card.slug;

  return (
    <div className={`page ${styles.page}`}>
      <ProfileHeader
        p={head}
        identity={identity}
        followers={Number(follow?.followers ?? 0)}
        following={Number(follow?.following ?? 0)}
        action={!mine && viewer ? <FollowButton handle={head.handle} name={name} initial={Boolean(follow?.me)} /> : undefined}
      />

      <div className={styles.body}>
        <section aria-labelledby="identity" className={styles.identity}>
          <h2 id="identity" className={`t-display ${styles.h2}`}>
            Scent identity
          </h2>
          {owned.length ? (
            <>
              {insights.trail && (
                <figure className={styles.trail}>
                  <TrailThumb input={insights.trail} size="feature" width={320} height={64} />
                  <figcaption className={styles.trailCap}>
                    <TrailMark className={styles.trailMark} />
                    {whose} shelf’s trail
                  </figcaption>
                </figure>
              )}
              {prose.length > 0 && (
                <div className={styles.prose}>
                  {prose.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                  {insights.seasonsLine && <p>{insights.seasonsLine.replace('Leans', 'The shelf leans')}.</p>}
                </div>
              )}
              <CharacterBars vec={insights.character} limit={5} label={`${name}'s shelf character`} />
            </>
          ) : mine ? (
            <EmptyState
              variant="yours"
              title="Nothing on the shelf yet."
              line="A shelf with a bottle on it gets a trail, a character and a sentence here."
              action={
                <Link href="/discover" className="btn">
                  Find something to put on it
                </Link>
              }
            />
          ) : (
            <p className={styles.quiet}>Nothing on {name}’s shelf yet, so no trail to draw.</p>
          )}
        </section>

        <section aria-labelledby="rotation" className={styles.rotation}>
          <h2 id="rotation" className={`t-display ${styles.h2}`}>
            Current rotation
          </h2>
          {rotation.length ? (
            <>
              <div className={styles.rotationScroll}>
                <Ledge slots={rotation.length} className={styles.rotationLedge}>
                  {rotation.map((r) => (
                    <Link key={r.card!.slug} href={`/fragrance/${r.card!.slug}`} className={styles.rSlot} style={{ ['--scent' as string]: r.card!.accent }} aria-label={`${r.card!.name}, worn ${r.n} times lately`}>
                      <span className={styles.rThumb}>{r.card!.poster && <Image src={r.card!.poster} alt="" fill sizes="96px" className={styles.rImg} />}</span>
                      <span className={`t-figure ${styles.rCount}`} aria-hidden="true">
                        {r.n}×
                      </span>
                    </Link>
                  ))}
                </Ledge>
                <ul role="list" className={styles.rCaptions} style={{ ['--slots' as string]: rotation.length }}>
                  {rotation.map((r) => (
                    <li key={r.card!.slug}>
                      <span className={styles.rName}>{r.card!.name}</span>
                      <span className={styles.rHouse}>{r.card!.brandName}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className={styles.rNote}>Wears logged in the last six weeks.</p>
            </>
          ) : (
            <p className={styles.quiet}>{mine ? 'No wears logged in the last six weeks. The diary keeps them.' : 'No wears logged in the last six weeks.'}</p>
          )}

          {owned.length > 0 && (
            <div className={styles.shelfBlock}>
              <div className={styles.shelfScroll}>
                <Ledge slots={Math.min(owned.length, 6) + 1} className={styles.shelfLedge} label="On the shelf">
                  {owned.slice(0, 6).map((i) => (
                    <Link key={i.card.id} href={`/fragrance/${i.card.slug}`} aria-label={i.card.name} className={styles.sSlot} style={{ ['--scent' as string]: i.card.accent }}>
                      <span className={styles.sThumb}>{i.card.poster && <Image src={i.card.poster} alt="" fill sizes="96px" className={styles.rImg} />}</span>
                    </Link>
                  ))}
                  <span className={styles.sTick} aria-hidden="true" />
                </Ledge>
              </div>
              <Link href={`/u/${head.handle}/shelf`} className={`arrow-link ${styles.shelfLink}`}>
                {shelfLine} · see the shelf
              </Link>
            </div>
          )}
        </section>
      </div>

      {lists.length > 0 && (
        <section aria-labelledby="lists" className={styles.section}>
          <h2 id="lists" className={`t-display ${styles.h2}`}>
            Lists
          </h2>
          <ul role="list" className={styles.lists}>
            {lists.map((l) => (
              <li key={l.slug}>
                <Link href={`/lists/${head.handle}/${l.slug}`}>{l.title}</Link>{' '}
                <span className={`t-meta tnum`}>
                  {l.n} {Number(l.n) === 1 ? 'fragrance' : 'fragrances'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="reviews" className={styles.section}>
        <h2 id="reviews" className={`t-display ${styles.h2}`}>
          Reviews
        </h2>
        {reviews.length ? (
          <div className={styles.reviews}>
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} showFragrance />
            ))}
          </div>
        ) : (
          <div className={styles.noReviews}>
            <p className={styles.noReviewsLine}>
              {mine
                ? 'Nothing written yet. A review here is read next to your wear count, so people can see how well you know the bottle.'
                : `${name} hasn’t written a review yet. When they do, it reads here next to how often they have worn the bottle.`}
            </p>
            {mine && (
              <Link href={firstOwned ? `/fragrance/${firstOwned}/review` : '/discover'} className="btn btn--quiet">
                Write your first
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
