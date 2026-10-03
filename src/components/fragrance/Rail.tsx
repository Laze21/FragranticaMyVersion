'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { usePageChrome } from '@/components/shell/PageChrome';
import { confidence, formatNumber } from '@/lib/scent/read';
import { SECTIONS } from './SectionNav';
import { ShelfActions } from './ShelfActions';
import { useVotes, type VoteKind } from './VoteProvider';
import { YourTake } from './YourTake';
import styles from './Rail.module.css';

export interface RailProps {
  slug: string;
  name: string;
  poster: string | null;
  blurData: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  includesBaseline: boolean;
  upcoming: boolean;
  /** Sample sizes per section, for the contextual block. */
  counts: {
    perceived: number;
    performance: number;
    wear: number;
    ratings: number;
    reviews: number;
  };
}

interface Context {
  count?: number;
  label?: string;
  prompt: string;
  kind?: VoteKind;
  href?: (slug: string) => string;
}

/* One vote prompt per section, in the words the section asks. The five identical buttons at the
   foot of each section are gone; this row is where the ask lives on desktop. */
const CONTEXT: Record<string, (c: RailProps['counts']) => Context> = {
  journey: (c) => ({
    count: c.perceived,
    label: 'people describing it',
    prompt: 'How does it read to you?',
    kind: 'character',
  }),
  notes: (c) => ({
    count: c.perceived,
    label: 'people on what they smell',
    prompt: 'What do you smell?',
    kind: 'perceived',
  }),
  performance: (c) => ({
    count: c.performance,
    label: 'performance reports',
    prompt: 'How long did it last on you?',
    kind: 'performance',
  }),
  wear: (c) => ({
    count: c.wear,
    label: 'people on when to wear it',
    prompt: 'When would you wear it?',
    kind: 'wear',
  }),
  ratings: (c) => ({
    count: c.ratings,
    label: 'ratings',
    prompt: 'Rate it out of 10',
    kind: 'rating',
  }),
  reviews: (c) => ({
    count: c.reviews,
    label: c.reviews === 1 ? 'review' : 'reviews',
    prompt: 'Write a quick take',
    href: (s) => `/fragrance/${s}/review`,
  }),
  similar: () => ({
    prompt: 'Compare it side by side',
    href: (s) => `/compare?f=${s}`,
  }),
  details: () => ({
    prompt: 'Suggest a correction with a source',
    href: (s) => `/contribute?fragrance=${s}`,
  }),
};

/**
 * The rail is the object's spine on desktop: thumb, name, score, the shelf actions once the
 * hero's have scrolled away, the section list on the same scroll-spy as the bar, then one
 * contextual block for the section in view (sample size, how settled, the one vote prompt) and
 * "Your take" beneath. Under 1100px only the aside remains, at the foot of the page.
 */
export function Rail({ slug, name, poster, blurData, ratingAvg, ratingCount, includesBaseline, upcoming, counts }: RailProps) {
  const { sectionInView, contextualActions } = usePageChrome();
  const { open } = useVotes();
  const section = sectionInView ?? 'journey';
  const ctx = CONTEXT[section]?.(counts) ?? null;
  const conf = ctx?.count !== undefined ? confidence(ctx.count) : null;
  const thin = ratingCount < 30;

  return (
    <div className={styles.rail}>
      <div className={styles.spine}>
        <div className={styles.head}>
          <span className={styles.thumb} aria-hidden>
            {poster && <Image src={poster} alt="" width={56} height={70} sizes="56px" placeholder={blurData ? 'blur' : 'empty'} blurDataURL={blurData ?? undefined} />}
          </span>
          <div className={styles.headText}>
            <p className={`t-title ${styles.name}`}>{name}</p>
            <p className={styles.score}>
              {ratingAvg !== null && !thin ? (
                <>
                  <b>{ratingAvg.toFixed(1)}</b> /10 · {formatNumber(ratingCount)}
                </>
              ) : ratingCount > 0 ? (
                `${formatNumber(ratingCount)} ${ratingCount === 1 ? 'rating' : 'ratings'}, too few for an average`
              ) : (
                'Unrated'
              )}
              {includesBaseline && ratingCount > 0 ? <span className={styles.demo}> · demo</span> : null}
            </p>
          </div>
        </div>

        <div className={styles.actions} data-show={contextualActions === 'fragrance' || undefined} aria-hidden={contextualActions !== 'fragrance' || undefined}>
          <ShelfActions slug={slug} name={name} upcoming={upcoming} compact />
        </div>

        <nav aria-label="On this page" className={styles.sections}>
          <ul role="list">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={sectionInView === s.id ? 'location' : undefined}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {ctx && (
          <div className={styles.context} aria-live="polite">
            {ctx.count !== undefined && (
              <p className={styles.sample}>
                <b>{formatNumber(ctx.count)}</b> {ctx.label}
              </p>
            )}
            {conf && (
              <p className={styles.conf}>
                <span className={styles.confBars} aria-hidden>
                  <i data-on={conf.level >= 1 || undefined} />
                  <i data-on={conf.level >= 2 || undefined} />
                  <i data-on={conf.level >= 3 || undefined} />
                </span>
                {conf.label}
              </p>
            )}
            {!upcoming &&
              (ctx.kind ? (
                <button type="button" className={styles.prompt} onClick={() => open(ctx.kind!)}>
                  {ctx.prompt}
                  <Icon name="chevron-right" size={16} />
                </button>
              ) : (
                <Link href={ctx.href!(slug)} className={styles.prompt}>
                  {ctx.prompt}
                  <Icon name="chevron-right" size={16} />
                </Link>
              ))}
            {upcoming && <p className={styles.upcoming}>Nothing to vote on until it is out.</p>}
          </div>
        )}
      </div>

      <YourTake slug={slug} name={name} />
    </div>
  );
}
