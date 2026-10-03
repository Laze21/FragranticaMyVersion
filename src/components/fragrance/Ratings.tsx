import type { FragranceDetail } from '@/lib/data/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { divisiveness, formatNumber } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './Ratings.module.css';
import s from './sections.module.css';

const SUBS = [
  { key: 'scentAvg', label: 'Scent' },
  { key: 'performanceAvg', label: 'Performance' },
  { key: 'valueAvg', label: 'Value' },
  { key: 'originalityAvg', label: 'Originality' },
] as const;

/**
 * Ratings as one row: the score, the shape of the votes, the one word about agreement, and the
 * four sub-scores as dots on a single 1 to 10 axis, so "scent 8.5, value 5.2" is a distance you
 * can see. Phones get the score and histogram, then the sub-scores as a 2x2 figure grid.
 */
export function Ratings({ f }: { f: FragranceDetail }) {
  const st = f.stats;
  const total = st.ratingHist.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...st.ratingHist);
  const div = divisiveness(st.ratingSpread, st.ratingCount, st.ratingHist);
  const enough = st.ratingCount >= 5;
  const subs = SUBS.map((sub) => ({ ...sub, value: st[sub.key] })).filter((x): x is typeof x & { value: number } => x.value !== null);
  const x = (v: number) => ((v - 1) / 9) * 100;

  return (
    <section className={`${s.section} ${s['gap-64']}`} aria-labelledby="ratings">
      <SectionHead
        id="ratings"
        title="Ratings"
        lede="Enjoyment only. How long it lasts lives in its own section so a quiet beauty isn’t punished twice."
        votes={st.ratingCount}
        votesLabel="ratings"
        vote={{ kind: 'rating', label: 'Rate it', editedLabel: 'Change your rating' }}
      />
      {!enough ? (
        <EmptyState
          title={st.ratingCount ? `${st.ratingCount} ${st.ratingCount === 1 ? 'rating' : 'ratings'} so far for ${f.name}.` : `Nobody has rated ${f.name} yet.`}
          line="An average appears once five people have rated it. A single score says more about the person than the perfume."
          action={<VoteButton kind="rating" label="Rate it" />}
        />
      ) : (
        <div className={styles.row}>
          <p className={styles.score}>
            <span className={`t-figure-serif ${styles.big}`}>{st.ratingAvg?.toFixed(1)}</span>
            <span className={styles.outOf}>/10</span>
          </p>

          <div className={styles.hist} role="img" aria-label={`How ${formatNumber(st.ratingCount)} people scored it, 1 to 10: ${st.ratingHist.map((n, i) => `${i + 1}: ${Math.round((n / total) * 100)}%`).join(', ')}`}>
            <div className={styles.histCols}>
              {st.ratingHist.map((n, i) => (
                <span key={i} className={styles.histBar} style={{ height: `${Math.max(2, (n / max) * 100)}%` }} />
              ))}
            </div>
            <div className={styles.histAxis} aria-hidden>
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          {div && (
            <p className={styles.agree}>
              <b>{div.label}</b>
              <span>{div.detail}</span>
            </p>
          )}

          {subs.length > 0 && (
            <>
              <ol className={styles.dots} role="list" aria-label="Sub-scores out of 10">
                {subs.map((sub) => (
                  <li key={sub.key} className={styles.lane}>
                    <span className={styles.laneLabel}>{sub.label}</span>
                    <span className={styles.laneTrack}>
                      <i className={styles.dot} style={{ left: `${x(sub.value)}%` }} aria-hidden />
                      <b className={styles.laneValue} style={{ left: `${x(sub.value)}%` }}>
                        {sub.value.toFixed(1)}
                      </b>
                    </span>
                  </li>
                ))}
                <li className={styles.axis} aria-hidden>
                  <span className={styles.laneLabel} />
                  <span className={styles.axisTrack}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} style={{ left: `${x(i + 1)}%` }}>
                        {i + 1}
                      </span>
                    ))}
                  </span>
                </li>
              </ol>
              <dl className={styles.grid}>
                {subs.map((sub) => (
                  <div key={sub.key}>
                    <dt>{sub.label}</dt>
                    <dd className="t-figure">{sub.value.toFixed(1)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      )}
    </section>
  );
}
