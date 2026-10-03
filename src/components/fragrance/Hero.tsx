import Link from 'next/link';
import type { FragranceDetail } from '@/lib/data/types';
import type { SimilarGroups } from '@/lib/data/similar';
import { Term } from '@/components/ui/Term';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { CONCENTRATION_LABEL, DIMENSION_META, PRICE_BANDS, type PriceBand } from '@/lib/scent/vocab';
import { divisiveness, formatNumber, longevityRange, histAvg, projectionLabel, seasonsLine, timeLine, topDims } from '@/lib/scent/read';
import { BottleStage } from './BottleStage';
import { ShelfActions } from './ShelfActions';
import styles from './Hero.module.css';

const STATUS_NOTE: Record<string, string | null> = {
  current: null,
  discontinued: 'Discontinued',
  limited: 'Limited edition',
  reformulated: 'Reformulated',
  upcoming: 'Not released yet',
};

export function Hero({ f, similar }: { f: FragranceDetail; similar: SimilarGroups }) {
  const s = f.stats;
  const conc = f.concentration ? CONCENTRATION_LABEL[f.concentration] : null;
  const character = topDims(s.character.overall, 3, 0.15);
  const range = longevityRange(s.longevityHist);
  const pOpen = histAvg(s.projectionOpeningHist);
  const pLater = histAvg(s.projectionLaterHist);
  const seasons = seasonsLine(s.wear);
  const time = timeLine(s.wear);
  const div = divisiveness(s.ratingSpread, s.ratingCount);
  const band = f.priceBand ? PRICE_BANDS[f.priceBand as PriceBand] : null;
  const comparable = similar.similar.slice(0, 2);
  const thin = s.ratingCount < 30;
  const status = STATUS_NOTE[f.status];

  return (
    <section className={styles.hero} aria-labelledby="fragrance-name">
      <div className={`page ${styles.grid}`}>
        <div className={styles.stageCol}>
          <BottleStage
            name={f.name}
            poster={f.poster}
            posterAlt={f.posterAlt}
            model={f.model ? { url: f.model.url, animations: { spray: f.model.animations.spray, open: f.model.animations.open } } : null}
          />
        </div>

        <div className={styles.identity}>
          <p className={styles.house}>
            <Link href={`/house/${f.brandSlug}`}>{f.brandName}</Link>
            <span aria-hidden> · </span>
            <span className={styles.houseKind}>{f.brandKind === 'designer' ? 'Designer' : f.brandKind === 'mass' ? 'Mass market' : f.brandKind[0].toUpperCase() + f.brandKind.slice(1)} house</span>
          </p>
          <h1 id="fragrance-name" className={`t-title ${styles.name}`} data-long={f.name.length > 34 || undefined}>
            {f.name}
          </h1>
          <p className={styles.facts}>
            {conc && (
              <span>{conc.glossary ? <Term slug={conc.glossary}>{conc.long}</Term> : conc.long}</span>
            )}
            {f.releaseYear && <span>{f.releaseYear}</span>}
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
            {status && (
              <span className={styles.status} data-status={f.status}>
                {f.status === 'reformulated' ? <Term slug="reformulation">{status}</Term> : status}
                {f.discontinuedYear ? ` in ${f.discontinuedYear}` : ''}
              </span>
            )}
            {f.parent && (
              <span>
                <Term slug="flanker">Flanker</Term> of <Link href={`/fragrance/${f.parent.slug}`}>{f.parent.name}</Link>
              </span>
            )}
          </p>

          <div className={styles.read} aria-labelledby="ten-second">
            <h2 id="ten-second" className="visually-hidden">
              The quick read
            </h2>
            <p className={styles.kicker}>What it smells like</p>
            {f.summary ? <p className={styles.summary}>{f.summary}</p> : <p className={styles.summary}>No one has described this yet.</p>}
            {character.length > 0 && (
              <ul role="list" className={styles.character} aria-label="Main character">
                {character.map((d) => (
                  <li key={d}>
                    <i style={{ background: DIMENSION_META[d].hue }} aria-hidden />
                    {DIMENSION_META[d].label}
                  </li>
                ))}
              </ul>
            )}

            <dl className={styles.quick}>
              <div>
                <dt>
                  <Term slug="longevity">Lasts</Term>
                </dt>
                <dd>{range && s.perfVotes >= 5 ? range.text : 'Not enough votes yet'}</dd>
              </div>
              <div>
                <dt>
                  <Term slug="projection">Projection</Term>
                </dt>
                <dd>
                  {pOpen !== null && s.perfVotes >= 5 ? (
                    <>
                      {projectionLabel(pOpen)}
                      {pLater !== null && projectionLabel(pLater) !== projectionLabel(pOpen) && (
                        <>
                          <span aria-hidden> → </span>
                          <span className="visually-hidden">, then </span>
                          {projectionLabel(pLater).toLowerCase()}
                        </>
                      )}
                    </>
                  ) : (
                    'Not enough votes yet'
                  )}
                </dd>
              </div>
              <div>
                <dt>Best for</dt>
                <dd>{f.bestFor ?? '—'}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{[seasons, time].filter(Boolean).join(', ') || 'Too early to say'}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>
                  {band ? (
                    <>
                      {band.label}
                      {f.priceUsd && f.sizeMl ? (
                        <span className={styles.muted}>
                          {' '}
                          · about ${Math.round(f.priceUsd)} for {f.sizeMl} ml
                        </span>
                      ) : null}
                    </>
                  ) : (
                    'Unknown'
                  )}
                </dd>
              </div>
              <div>
                <dt>Compare with</dt>
                <dd>
                  {comparable.length
                    ? comparable.map((c, i) => (
                        <span key={c.card.slug}>
                          {i > 0 && ', '}
                          <Link href={`/fragrance/${c.card.slug}`} className={styles.titleLink}>
                            {c.card.name}
                          </Link>
                        </span>
                      ))
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className={styles.ratingRow}>
            <a href="#ratings" className={styles.score} aria-label={s.ratingAvg ? `Rated ${s.ratingAvg.toFixed(1)} out of 10 by ${formatNumber(s.ratingCount)} people` : 'No ratings yet'}>
              <span className={`t-figure ${styles.scoreNum}`}>{s.ratingAvg && !thin ? s.ratingAvg.toFixed(1) : '–'}</span>
              <span className={styles.scoreOf}>/10</span>
            </a>
            <div className={styles.scoreMeta}>
              <span>
                {s.ratingCount ? `${formatNumber(s.ratingCount)} ${s.ratingCount === 1 ? 'rating' : 'ratings'}` : 'No ratings yet'}
                {thin && s.ratingCount > 0 ? ': too few for an average' : ''}
              </span>
              {div && <span className={styles.div}>{div.label}</span>}
              {s.includesBaseline && <DemoFlag />}
            </div>
          </div>

          <ShelfActions slug={f.slug} name={f.name} upcoming={f.status === 'upcoming'} />
        </div>
      </div>
    </section>
  );
}
