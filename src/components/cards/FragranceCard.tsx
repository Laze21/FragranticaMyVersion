import Image from 'next/image';
import Link from 'next/link';
import type { FragranceCard as Card } from '@/lib/data/types';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { CONCENTRATION_LABEL, DIMENSION_META } from '@/lib/scent/vocab';
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

/**
 * A fragrance as a catalogue plate: the bottle on its own tinted ground, the name set like a
 * title, and its Trail underneath as a signature.
 */
export function FragranceCard({
  card,
  variant = 'plate',
  priority,
  why,
  rank,
  sizes,
}: {
  card: Card;
  variant?: 'plate' | 'row' | 'mini';
  priority?: boolean;
  why?: string;
  rank?: number;
  sizes?: string;
}) {
  const conc = card.concentration ? CONCENTRATION_LABEL[card.concentration]?.short : null;
  const dims = topDims(card.character.overall, 2, 0.15);
  const rating = card.ratingAvg && card.ratingCount >= 5 ? card.ratingAvg.toFixed(1) : null;
  const style = { ['--scent' as string]: card.accent };

  if (variant === 'row' || variant === 'mini') {
    return (
      <article className={styles.row} data-variant={variant} style={style}>
        {rank !== undefined && <span className={styles.rank}>{rank}</span>}
        <div className={styles.rowThumb}>
          {card.poster ? <Image src={card.poster} alt="" fill sizes="72px" className={styles.img} /> : <span className={styles.noImg} aria-hidden />}
        </div>
        <div className={styles.rowBody}>
          <h3 className={styles.rowName}>
            <Link href={`/fragrance/${card.slug}`} className={styles.link}>
              {card.name}
            </Link>
          </h3>
          <p className={styles.meta}>
            {card.brandName}
            {conc ? ` · ${conc}` : ''}
            {card.releaseYear ? ` · ${card.releaseYear}` : ''}
          </p>
          {why && <p className={styles.why}>{why}</p>}
          {variant === 'row' && <TrailThumb input={trailInput(card)} width={120} height={22} decorative className={styles.rowTrail} />}
        </div>
        {rating && (
          <span className={styles.rowRating}>
            <b className="tnum">{rating}</b>
          </span>
        )}
        <ShelfMark slug={card.slug} />
      </article>
    );
  }

  return (
    <article className={styles.plate} style={style}>
      <div className={styles.ground}>
        {card.poster ? (
          <Image
            src={card.poster}
            alt={card.posterAlt ?? `${card.name} bottle`}
            fill
            sizes={sizes ?? '(max-width: 719px) 46vw, (max-width: 1100px) 30vw, 260px'}
            className={styles.img}
            priority={priority}
          />
        ) : (
          <span className={styles.noImgPlate}>No image yet</span>
        )}
        {card.status !== 'current' && (
          <span className={styles.status}>{card.status === 'upcoming' ? 'Coming soon' : card.status === 'discontinued' ? 'Discontinued' : card.status === 'limited' ? 'Limited' : 'Reformulated'}</span>
        )}
        <ShelfMark slug={card.slug} />
      </div>
      <div className={styles.body}>
        <p className={styles.brand}>{card.brandName}</p>
        <h3 className={styles.name}>
          <Link href={`/fragrance/${card.slug}`} className={styles.link}>
            {card.name}
          </Link>
        </h3>
        <TrailThumb input={trailInput(card)} width={160} height={30} className={styles.trail} />
        <p className={styles.foot}>
          <span>{dims.map((d) => DIMENSION_META[d].label).join(' · ') || card.style}</span>
          {rating ? (
            <span className={styles.rating} aria-label={`Rated ${rating} out of 10 by ${card.ratingCount} people`}>
              <b className="tnum">{rating}</b>
              <small>{formatCount(card.ratingCount)}</small>
            </span>
          ) : (
            <span className={styles.rating}>
              <small>{card.ratingCount ? `${card.ratingCount} ${card.ratingCount === 1 ? 'rating' : 'ratings'}` : 'Unrated'}</small>
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
