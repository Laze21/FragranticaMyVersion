import Image from 'next/image';
import Link from 'next/link';
import type { FragranceDetail } from '@/lib/data/types';
import type { SimilarGroups } from '@/lib/data/similar';
import { Term } from '@/components/ui/Term';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { TrailMark } from '@/components/shell/TrailMark';
import { CONCENTRATION_LABEL, DIMENSION_META, PRICE_BANDS, type PriceBand } from '@/lib/scent/vocab';
import { formatNumber, longevityRange, histAvg, projectionLabel, seasonsLine, timeLine, topDims } from '@/lib/scent/read';
import type { TrailInput } from '@/lib/scent/trail';
import { BottleStage } from './BottleStage';
import { ShelfActions } from './ShelfActions';
import styles from './Hero.module.css';

const HOUSE_KIND: Record<string, string> = {
  designer: 'Designer house',
  niche: 'Niche house',
  mass: 'Mass-market house',
  indie: 'Independent house',
};

function lower(s: string | null) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

/** Five discs, filled to the projection level: the glyph a beginner reads before the word. */
function ProjectionDiscs({ level }: { level: number }) {
  return (
    <span className={styles.discs} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} data-on={i < level || undefined} />
      ))}
    </span>
  );
}

/**
 * The first screen: the object on its stage at the left, and at the right the identity (house,
 * name with the score on its line, facts, the shelf actions) over a 2px ink rule, then the
 * ten-second read: what it smells like, the Trail in miniature, how long, how loud, how much,
 * when, and what it is comparable to. Phones get the same pieces in reading order.
 */
export function Hero({ f, similar, trail }: { f: FragranceDetail; similar: SimilarGroups; trail: TrailInput }) {
  const s = f.stats;
  const conc = f.concentration ? CONCENTRATION_LABEL[f.concentration] : null;
  const range = s.perfVotes >= 5 ? longevityRange(s.longevityHist) : null;
  const pOpen = s.perfVotes >= 5 ? histAvg(s.projectionOpeningHist) : null;
  const pLater = s.perfVotes >= 5 ? histAvg(s.projectionLaterHist) : null;
  const openWord = pOpen !== null ? projectionLabel(pOpen) : null;
  const laterWord = pLater !== null ? projectionLabel(pLater) : null;
  const seasons = lower(seasonsLine(s.wear));
  const time = timeLine(s.wear);
  const band = f.priceBand ? PRICE_BANDS[f.priceBand as PriceBand] : null;
  const comparable = similar.similar.slice(0, 2);
  const thin = s.ratingCount < 30;
  const mistHues = topDims(s.character.opening, 3, 0.1).map((d) => DIMENSION_META[d].hue);
  const longName = f.name.length > 18;
  const upcoming = f.status === 'upcoming';

  const statusLine = (() => {
    if (f.status === 'discontinued')
      return (
        <p className={styles.statusLine} data-status="discontinued">
          Discontinued{f.discontinuedYear ? ` in ${f.discontinuedYear}` : ''}
          {s.ownCount > 0 ? ' · still common second-hand' : ''}
        </p>
      );
    if (upcoming)
      return (
        <p className={styles.statusLine} data-status="upcoming">
          Announced{f.releaseYear ? ` for ${f.releaseYear}` : ''} · nothing to vote on yet
        </p>
      );
    if (f.status === 'reformulated')
      return (
        <p className={styles.statusLine}>
          <Term slug="reformulation">Reformulated</Term>
          {f.variants.length ? ` · ${f.variants.length} ${f.variants.length === 1 ? 'version' : 'versions'} on record` : ''}
        </p>
      );
    if (f.status === 'limited') return <p className={styles.statusLine}>Limited edition</p>;
    return null;
  })();

  const hours = range ? `${range.lo}–${Math.min(range.hi, 12)}${range.hi >= 12 ? '+' : ''}` : null;
  const trailCaption = hours ? `lasts ${hours}h${openWord ? ` · ${openWord.toLowerCase()} at first` : ''}` : 'not enough wears yet to say how long';
  const whenSentence = [f.bestFor, [seasons, time].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

  return (
    <section className={styles.hero} aria-labelledby="fragrance-name">
      <div className={`page ${styles.grid}`}>
        <div className={styles.stageCol}>
          <BottleStage
            name={f.name}
            accent={f.accent}
            image={
              f.poster
                ? {
                    url: f.poster,
                    alt: f.posterAlt,
                    kind: f.posterKind,
                    credit: f.posterCredit,
                    license: f.posterLicense,
                    sourceUrl: f.posterSource,
                    layers: f.posterLayers,
                  }
                : null
            }
            model={
              f.model
                ? {
                    url: f.model.url,
                    animations: {
                      spray: f.model.animations.spray,
                      open: f.model.animations.open,
                    },
                  }
                : null
            }
            mistHues={mistHues}
          />
        </div>

        <div className={styles.identity}>
          <p className={styles.house}>
            <Link href={`/house/${f.brandSlug}`}>{f.brandName}</Link>
            <span className={styles.houseKind}>{HOUSE_KIND[f.brandKind] ?? `${f.brandKind[0].toUpperCase()}${f.brandKind.slice(1)} house`}</span>
          </p>
          <h1 id="fragrance-name" className={`t-title ${styles.name}`} data-long={longName || undefined}>
            {f.name}
          </h1>

          <a
            href="#ratings"
            className={styles.score}
            aria-label={
              s.ratingAvg && !thin
                ? `Rated ${s.ratingAvg.toFixed(1)} out of 10 by ${formatNumber(s.ratingCount)} people`
                : s.ratingCount
                  ? `${formatNumber(s.ratingCount)} ratings, too few for an average`
                  : 'Unrated'
            }
          >
            <span className={`t-figure-serif ${styles.scoreNum}`}>{s.ratingAvg && !thin ? s.ratingAvg.toFixed(1) : '–'}</span>
            <span className={styles.scoreMeta}>
              {s.ratingAvg && !thin ? '/10 · ' : ''}
              {s.ratingCount ? `${formatNumber(s.ratingCount)} ${s.ratingCount === 1 ? 'rating' : 'ratings'}` : 'Unrated'}
              {thin && s.ratingCount > 0 ? ', too few for an average' : ''}
            </span>
          </a>
          {s.includesBaseline && s.ratingCount > 0 && (
            <span className={styles.demo}>
              <DemoFlag label="Demo rating" />
            </span>
          )}

          <p className={styles.facts}>
            {conc && <span>{conc.glossary ? <Term slug={conc.glossary}>{conc.long}</Term> : conc.long}</span>}
            {f.releaseYear && <span className="tnum">{f.releaseYear}</span>}
            {f.perfumers.length > 0 ? (
              <span>
                by{' '}
                {f.perfumers.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && (i === f.perfumers.length - 1 ? ' and ' : ', ')}
                    <Link href={`/perfumer/${p.slug}`}>{p.name}</Link>
                  </span>
                ))}
              </span>
            ) : (
              <span className={styles.muted}>Perfumer not disclosed</span>
            )}
            {f.parent && (
              <span>
                Flanker of <Link href={`/fragrance/${f.parent.slug}`}>{f.parent.name}</Link>
              </span>
            )}
          </p>
          {statusLine}

          <div className={styles.actions}>
            <ShelfActions slug={f.slug} name={f.name} upcoming={upcoming} primary />
          </div>

          <div className={styles.read} aria-labelledby="ten-second">
            <h2 id="ten-second" className="visually-hidden">
              The ten-second read
            </h2>
            <p className={styles.kicker}>
              <span className={styles.kickerLong}>What it smells like</span>
              <span className={styles.kickerShort}>Smells like</span>
            </p>
            <p className={styles.summary}>{f.summary ?? 'No one has described this yet.'}</p>

            <a href="#trail" className={styles.trail} aria-label={`Trail: ${trailCaption}. Jump to the full Trail.`}>
              <span className={styles.trailWide}>
                <TrailThumb input={trail} size="feature" decorative />
              </span>
              <span className={styles.trailNarrow}>
                <TrailThumb input={trail} width={358} height={36} decorative />
              </span>
              <span className={styles.trailCaption}>
                <TrailMark className={styles.trailMark} />
                Trail · {trailCaption}
              </span>
            </a>

            {/* Stanza 1, the figures. A row that cannot be answered is dropped, never printed as a null. */}
            <dl className={styles.figures}>
              {hours && (
                <div>
                  <dt>Lasts</dt>
                  <dd>
                    <span className={`t-figure-serif ${styles.figure}`}>{hours} h</span>
                    <span className={styles.figureNote}>typical</span>
                  </dd>
                </div>
              )}
              {openWord && (
                <div>
                  <dt>Projection</dt>
                  <dd>
                    <span className={styles.projection}>
                      <ProjectionDiscs level={Math.round(pOpen!)} />
                      {laterWord && laterWord !== openWord && (
                        <>
                          <span className={styles.then} aria-hidden>
                            then
                          </span>
                          <ProjectionDiscs level={Math.round(pLater!)} />
                        </>
                      )}
                    </span>
                    <span className={styles.figureNote}>
                      {openWord}
                      {laterWord && laterWord !== openWord ? `, then ${laterWord.toLowerCase()}` : ''}
                    </span>
                  </dd>
                </div>
              )}
              {band && (
                <div>
                  <dt>Price</dt>
                  <dd>
                    <span className={styles.price}>
                      <span className={styles.priceGlyph} aria-hidden>
                        {band.glyph}
                      </span>
                      {f.priceUsd && f.sizeMl ? (
                        <span className="tnum">
                          ${Math.round(f.priceUsd)} / {f.sizeMl} ml
                        </span>
                      ) : (
                        <span>{band.range}</span>
                      )}
                    </span>
                    <span className={styles.figureNote}>{band.label}</span>
                  </dd>
                </div>
              )}
            </dl>

            {/* Phones: the same answers as a 2x2 table, thirteen-pixel values. */}
            <dl className={styles.quick}>
              {hours && (
                <div>
                  <dt>Lasts</dt>
                  <dd>{hours} hours</dd>
                </div>
              )}
              {openWord && (
                <div>
                  <dt>Projection</dt>
                  <dd>
                    {openWord}
                    {laterWord && laterWord !== openWord ? `, then ${laterWord.toLowerCase()}` : ''}
                  </dd>
                </div>
              )}
              {f.bestFor && (
                <div>
                  <dt>Best for</dt>
                  <dd>{f.bestFor}</dd>
                </div>
              )}
              {(seasons || time) && (
                <div>
                  <dt>When</dt>
                  <dd>{[seasons ? seasons[0].toUpperCase() + seasons.slice(1) : null, time].filter(Boolean).join(', ')}</dd>
                </div>
              )}
              {band && (
                <div>
                  <dt>Price</dt>
                  <dd>
                    {band.glyph} {f.priceUsd && f.sizeMl ? `$${Math.round(f.priceUsd)} / ${f.sizeMl} ml` : band.range}
                  </dd>
                </div>
              )}
            </dl>

            {whenSentence && <p className={styles.when}>{whenSentence}.</p>}

            {comparable.length > 0 && (
              <p className={styles.comparable}>
                <span className={styles.comparableLabel}>Comparable to</span>
                {comparable.map((c) => (
                  <Link key={c.card.slug} href={`/compare?f=${f.slug},${c.card.slug}`} className={styles.compareLink}>
                    <span className={styles.compareThumb} aria-hidden>
                      {c.card.poster && <Image src={c.card.poster} alt="" width={26} height={32} sizes="26px" />}
                    </span>
                    <span className={styles.compareName}>{c.card.name}</span>
                  </Link>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
