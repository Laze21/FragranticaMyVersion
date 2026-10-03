'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { Icon } from '@/components/Icon';
import { toast } from '@/components/ui/Toaster';
import { addComment, deleteMyReview, listComments, reportContent, toggleHelpful } from '@/app/actions/reviews';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { useRouter } from 'next/navigation';
import type { ReviewView } from '@/lib/data/types';
import { EXPERIENCE_LABEL, REVIEW_FOCUS } from '@/lib/scent/vocab';
import { relativeDays } from '@/lib/scent/read';
import styles from './ReviewItem.module.css';

const OWNERSHIP: Record<string, string> = {
  own: 'Owns a bottle',
  owned: 'Owned a bottle',
  sample: 'Tried a sample',
  decant: 'Has a decant',
  tested: 'Tested in store',
  none: 'Hasn’t worn it',
};
const SUB_KEYS = ['scent', 'performance', 'value', 'originality'] as const;

/** Sub-scores arrive with the review once the table carries them; until then they are simply absent. */
export type ReviewWithSubs = ReviewView & { subScores?: Partial<Record<(typeof SUB_KEYS)[number], number | null>> | null };

/**
 * One review. From 840 up the meta (who, what they own, the score and its breakdown, the angle)
 * is a left column that stays put while a long review scrolls; the text sits at reading measure
 * beside it. A removed review keeps its slot as one line, so a thread's replies still make sense.
 */
export function ReviewItem({ review, helpfulByMe = false, showFragrance = false, now }: { review: ReviewWithSubs; helpfulByMe?: boolean; showFragrance?: boolean; now?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [helpful, setHelpful] = useState({ mine: helpfulByMe, count: review.helpful });
  const [comments, setComments] = useState<Awaited<ReturnType<typeof listComments>> | null>(null);
  const [draft, setDraft] = useState('');
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [pending, start] = useTransition();
  const { viewer } = useViewer();
  const router = useRouter();
  const mine = !!viewer && viewer.handle === review.author.handle;

  const onDelete = () =>
    start(async () => {
      const res = await deleteMyReview(review.id);
      if (!res.ok) return toast(res.error, 'error');
      setDeleted(true);
      toast('Review removed.');
      router.refresh();
    });

  if (review.status === 'deleted' || deleted) {
    return (
      <article className={styles.removed}>
        <p>Review removed by its author</p>
      </article>
    );
  }
  if (review.status === 'hidden') {
    return (
      <article className={styles.removed}>
        <p>Removed by moderation</p>
      </article>
    );
  }

  const long = review.kind === 'full' && review.body.length > 700;
  const paragraphs = review.body.split(/\n\n+/);
  const subs = SUB_KEYS.filter((k) => typeof review.subScores?.[k] === 'number');

  const onHelpful = () =>
    start(async () => {
      const res = await toggleHelpful(review.id);
      if (!res.ok) return toast(res.error, 'error');
      const d = res.data as { helpful: boolean; count: number };
      setHelpful({ mine: d.helpful, count: d.count });
    });

  const openComments = () =>
    start(async () => {
      setComments(await listComments(review.id));
    });

  return (
    <article className={styles.review} aria-labelledby={`r-${review.id}`}>
      <div className={styles.meta}>
        <header className={styles.by}>
          <Avatar name={review.author.displayName} hue={review.author.avatarHue} size={36} />
          <div className={styles.byText}>
            <Link href={`/u/${review.author.handle}`} className={styles.name}>
              {review.author.displayName}
            </Link>
            <span className={styles.facts}>
              {EXPERIENCE_LABEL[review.experience ?? review.author.experience] ?? 'Member'}
              {review.ownership && <> · {OWNERSHIP[review.ownership]}</>}
              {review.wearCount ? <> · worn {review.wearCount}×</> : null}
            </span>
            {review.isDemo && (
              <span className={styles.demo}>
                <DemoFlag label="Demo account" />
              </span>
            )}
          </div>
        </header>
        {review.rating !== null && (
          <p className={styles.score}>
            <span className={styles.scoreMain} aria-label={`Rated ${review.rating} out of 10`}>
              <b className="tnum">{review.rating}</b>/10
            </span>
            {subs.length > 0 && (
              <span className={styles.subs}>
                {subs.map((k) => (
                  <span key={k}>
                    {k} <b className="tnum">{review.subScores![k]}</b>
                  </span>
                ))}
              </span>
            )}
          </p>
        )}
        {review.focus.length > 0 && (
          <ul className={styles.focus} role="list" aria-label="What the review is about">
            {review.focus.map((f) => (
              <li key={f}>{REVIEW_FOCUS.find((x) => x.key === f)?.label ?? f}</li>
            ))}
          </ul>
        )}
        <p className={styles.date}>
          <time dateTime={review.createdAt}>{relativeDays(review.createdAt, now)}</time>
          <span className={styles.kind}> · {review.kind === 'quick' ? 'Quick take' : 'Full review'}</span>
        </p>
      </div>

      <div className={styles.content}>
        {showFragrance && review.fragrance && (
          <p className={styles.about}>
            on{' '}
            <Link href={`/fragrance/${review.fragrance.slug}`} className={styles.fragLink}>
              {review.fragrance.name}
            </Link>{' '}
            <span className="t-meta">by {review.fragrance.brandName}</span>
          </p>
        )}
        {review.title ? (
          <h3 id={`r-${review.id}`} className={styles.title}>
            {review.title}
          </h3>
        ) : (
          <h3 id={`r-${review.id}`} className="visually-hidden">
            Quick take by {review.author.displayName}
          </h3>
        )}
        {review.gifted && (
          <p className={styles.gift}>
            <Icon name="info" size={14} /> Free bottle or sample: {review.giftNote ?? 'disclosed by the reviewer'}
          </p>
        )}
        <div className={styles.body} data-kind={review.kind} data-clamped={long && !expanded ? '' : undefined}>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {long && (
          <button type="button" className={`${styles.more} hit`} aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Show less' : 'Read the whole review'}
          </button>
        )}
        <footer className={styles.foot}>
          <button type="button" className={styles.action} aria-pressed={helpful.mine} onClick={onHelpful} disabled={pending}>
            Helpful{helpful.count ? ` · ${helpful.count}` : ''}
          </button>
          <button type="button" className={styles.action} onClick={openComments} aria-expanded={comments !== null}>
            <Icon name="comment" size={15} /> {review.commentCount ? `${review.commentCount} ${review.commentCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
          </button>
          {mine ? (
            <>
              {review.fragrance?.slug && (
                <Link href={`/fragrance/${review.fragrance.slug}/review`} className={styles.action}>
                  Edit
                </Link>
              )}
              {confirmDelete ? (
                <span className={styles.confirm}>
                  Remove this review?{' '}
                  <button type="button" className={styles.action} onClick={onDelete} disabled={pending}>
                    Yes, remove it
                  </button>
                  <button type="button" className={styles.action} onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </span>
              ) : (
                <button type="button" className={styles.action} onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              )}
            </>
          ) : (
            <button type="button" className={styles.action} onClick={() => setReporting((r) => !r)} aria-expanded={reporting}>
              <Icon name="flag" size={15} /> <span className="visually-hidden">Report this review</span>
            </button>
          )}
        </footer>
        {reporting && (
          <div className={styles.report}>
            <p className="t-label">What’s wrong with this review?</p>
            <div className="cluster">
              {[
                ['spam', 'Spam'],
                ['undisclosed_promotion', 'Undisclosed promotion'],
                ['abuse', 'Abusive'],
                ['copied_content', 'Copied from elsewhere'],
                ['off_topic', 'Not about the fragrance'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  onClick={() =>
                    start(async () => {
                      const res = await reportContent('review', review.id, k);
                      setReporting(false);
                      toast(res.ok ? 'Reported. A moderator will look at it.' : res.error, res.ok ? 'default' : 'error');
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {comments && (
          <div className={styles.comments}>
            {comments.length === 0 && <p className="t-meta">No replies yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className={styles.comment}>
                <Avatar name={c.display_name} hue={c.avatar_hue} size={24} />
                <div>
                  <Link href={`/u/${c.handle}`} className={styles.name}>
                    {c.display_name}
                  </Link>{' '}
                  <span className="t-meta">{relativeDays(c.created_at)}</span>
                  <p>{c.body}</p>
                </div>
              </div>
            ))}
            <form
              className={styles.reply}
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await addComment(review.id, draft);
                  if (!res.ok) return toast(res.error, 'error');
                  setDraft('');
                  setComments(await listComments(review.id));
                });
              }}
            >
              <label className="visually-hidden" htmlFor={`reply-${review.id}`}>
                Reply to {review.author.displayName}
              </label>
              <input id={`reply-${review.id}`} className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a reply" maxLength={2000} />
              <button className="btn btn--small" type="submit" disabled={pending || draft.trim().length < 2}>
                Reply
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

/** A quick take at a glance, for the rail above the list: the words, then who and how often they wore it. */
export function QuickTakeCard({ review }: { review: ReviewView }) {
  const excerpt = review.body.length > 170 ? `${review.body.slice(0, 168).replace(/\s+\S*$/, '')}…` : review.body;
  return (
    <li className={styles.take}>
      <p className={styles.takeBody}>{excerpt}</p>
      <p className={styles.takeMeta}>
        <Link href={`/u/${review.author.handle}`} className={styles.name}>
          {review.author.displayName}
        </Link>
        {review.wearCount ? <> · worn {review.wearCount}×</> : null}
        {review.helpful ? <> · {review.helpful} found it helpful</> : null}
        {review.rating !== null && (
          <>
            {' '}
            · <b className="tnum">{review.rating}</b>/10
          </>
        )}
        {review.isDemo && (
          <>
            {' '}
            · <DemoFlag label="Demo account" />
          </>
        )}
      </p>
    </li>
  );
}
