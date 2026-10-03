import Image from 'next/image';
import Link from 'next/link';
import type { FragranceCard as Card } from '@/lib/data/types';
import { Icon } from '@/components/Icon';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { CONCENTRATION_LABEL, DIMENSION_META, PRICE_BANDS, type PriceBand } from '@/lib/scent/vocab';
import { formatCount, topDims } from '@/lib/scent/read';
import { ShelfMark } from './ShelfMark';
import styles from './FragranceCard.module.css';

function trailInput(c: Card) {
  return {
    character: c.character,
    longevityHrs: c.longevityHrs,
    projectionOpening: c.projectionOpening,
    projectionLater: c.projectionLater,
    heartAtMin: c.heartAtMin,
    drydownAtMin: c.drydownAtMin,
  };
}

/*
 * Real scale on a shared floor. The catalogue's bottles run from about 70mm (a 30ml flacon)
 * to 170mm (a 200ml splash); they map linearly to 60-100% of the slot so a tall bottle is
 * tall and a squat jar is squat. Unknown heights stand at 76%, a believable 100ml.
 */
function slotHeight(mm: number | null): number {
  if (!mm) return 76;
  const t = Math.min(1, Math.max(0, (mm - 70) / 100));
  return Math.round(60 + t * 40);
}

const STATUS_LABEL: Record<string, string> = { upcoming: 'Coming soon', discontinued: 'Discontinued', limited: 'Limited', reformulated: 'Reformulated' };

/** "New" is a claim about the release, never about the vote count. */
function cornerLabel(card: Card): string | null {
  if (card.status !== 'current') return STATUS_LABEL[card.status] ?? null;
  if (card.releaseYear && card.releaseYear >= new Date().getFullYear()) return 'New';
  return null;
}

export interface CompareSelect {
  /** Form field name the parent reads back; one checkbox per card, value = slug. */
  name?: string;
  defaultChecked?: boolean;
}

/**
 * A fragrance in a grid or a list. `floor` (default) is a bottle standing on a shared floor at
 * its real scale, no box around it; `plate` is the tinted ground for the home feature and the
 * note-of-the-week band; `row` is a ranked line with a 56x70 thumb. The name is the link and the
 * whole card is its target; hover underlines the name and moves nothing.
 */
export function FragranceCard({
  card,
  variant = 'floor',
  priority,
  loading,
  reason,
  why,
  rank,
  sizes,
  showYear,
  compareSelect,
  metric,
}: {
  card: Card;
  variant?: 'floor' | 'plate' | 'row' | 'mini';
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  /** The match reason under the data line: "Vanilla listed · 71% smell it". */
  reason?: string;
  /** Older name for `reason`; kept for existing callers. */
  why?: string;
  rank?: number;
  sizes?: string;
  /** Brand line becomes "Prada · 2024". */
  showYear?: boolean;
  /** Discover: a compare checkbox in the top-right corner. */
  compareSelect?: CompareSelect | boolean;
  /** Row variant: the ranking figure on the right ("412 wears"). */
  metric?: string;
}) {
  const conc = card.concentration ? CONCENTRATION_LABEL[card.concentration]?.short : null;
  const dims = topDims(card.character.overall, 2, 0.15).map((d) => DIMENSION_META[d].label);
  const rated = Boolean(card.ratingAvg) && card.ratingCount >= 5;
  const rating = rated ? card.ratingAvg!.toFixed(1) : null;
  const style = { ['--scent' as string]: card.accent };
  const ill = card.posterKind === 'illustration';
  const note = reason ?? why;
  const brandLine = showYear && card.releaseYear ? `${card.brandName} · ${card.releaseYear}` : card.brandName;
  const alt = card.posterAlt ?? `${card.name} bottle`;
  const blur = card.blurData ? ({ placeholder: 'blur', blurDataURL: card.blurData } as const) : {};

  if (variant === 'row' || variant === 'mini') {
    const meta = [brandLine, conc, rated ? `${rating}/10 · ${formatCount(card.ratingCount)}` : 'Unrated', ill ? 'ill.' : null].filter(Boolean).join(' · ');
    return (
      <article className={styles.row} data-variant={variant} style={style}>
        {rank !== undefined && <span className={`${styles.rank} tnum`}>{rank}</span>}
        <div className={styles.rowThumb}>
          {card.poster ? (
            <Image src={card.poster} alt="" fill sizes="56px" className={styles.rowImg} {...blur} />
          ) : (
            <Icon name="bottle" size={24} className={styles.ghost} />
          )}
        </div>
        <div className={styles.rowBody}>
          <h3 className={styles.rowName}>
            <Link href={`/fragrance/${card.slug}`} className={styles.link}>
              {card.name}
            </Link>
          </h3>
          <p className={styles.meta}>
            <span>{meta}</span>
            <ShelfMark slug={card.slug} inline />
          </p>
          {note && <p className={styles.reason}>{note}</p>}
        </div>
        {metric && <span className={`${styles.metric} tnum`}>{metric}</span>}
      </article>
    );
  }

  const corner = cornerLabel(card);
  const data = [...dims, card.longevityHrs ? `${Math.round(card.longevityHrs)}h` : null, card.priceBand ? PRICE_BANDS[card.priceBand as PriceBand]?.glyph : null, conc]
    .filter(Boolean)
    .join(' · ');
  const compare = compareSelect ? (typeof compareSelect === 'object' ? compareSelect : {}) : null;

  return (
    <article className={styles.card} data-variant={variant} style={style}>
      <div className={styles.ground}>
        <Icon name="bottle" size={28} className={styles.ghost} />
        <div className={styles.object} style={{ height: `${slotHeight(card.bottleHeightMm)}%` }}>
          {card.poster && (
            <Image
              src={card.poster}
              alt={alt}
              fill
              sizes={sizes ?? '(max-width: 719px) 46vw, (max-width: 1100px) 30vw, 260px'}
              className={styles.img}
              priority={priority}
              loading={priority ? undefined : loading}
              {...blur}
            />
          )}
        </div>
        {corner && <span className={styles.status}>{corner}</span>}
        <div className={styles.corner}>
          <ShelfMark slug={card.slug} />
          {compare && (
            <label className={styles.compare}>
              <input type="checkbox" name={compare.name ?? 'compare'} value={card.slug} defaultChecked={compare.defaultChecked} />
              <span className="visually-hidden">Compare {card.name}</span>
            </label>
          )}
        </div>
        {ill && (
          <span className={styles.ill} aria-hidden>
            ill.
          </span>
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.brand}>{brandLine}</p>
        <h3 className={styles.name}>
          <Link href={`/fragrance/${card.slug}`} className={styles.link}>
            {card.name}
          </Link>
        </h3>
        <TrailThumb input={trailInput(card)} size="card" className={styles.trail} />
        <p className={styles.data}>
          <span className={styles.dataText}>{data || card.style}</span>
          {rating ? (
            <span className={styles.rating} aria-label={`Rated ${rating} out of 10 by ${card.ratingCount} people`}>
              <b className="tnum">{rating}</b>
              <small className="tnum"> · {formatCount(card.ratingCount)}</small>
            </span>
          ) : (
            <span className={styles.rating}>
              <small>Unrated</small>
            </span>
          )}
        </p>
        {note && <p className={styles.reason}>{note}</p>}
      </div>
    </article>
  );
}
