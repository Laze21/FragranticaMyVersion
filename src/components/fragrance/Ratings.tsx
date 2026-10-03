import type { FragranceDetail } from '@/lib/data/types';
import { divisiveness, formatNumber } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './Ratings.module.css';
import s from './sections.module.css';

const SUBS = [
  { key: 'scentAvg', label: 'Scent', hint: 'the smell itself' },
  { key: 'performanceAvg', label: 'Performance', hint: 'happy with how it lasts and carries' },
  { key: 'valueAvg', label: 'Value', hint: 'worth the money' },
  { key: 'originalityAvg', label: 'Originality', hint: 'unlike anything else' },
] as const;

export function Ratings({ f }: { f: FragranceDetail }) {
  const st = f.stats;
  const total = st.ratingHist.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...st.ratingHist);
  const div = divisiveness(st.ratingSpread, st.ratingCount);
  const enough = st.ratingCount >= 5;

  return (
    <section className={s.section} aria-labelledby="ratings">
      <SectionHead
        id="ratings"
        title="Ratings"
        lede="Enjoyment only. How long it lasts lives in its own section so a quiet beauty isn’t punished twice."
        votes={st.ratingCount}
        votesLabel="ratings"
        demo={st.includesBaseline}
      />
      {!enough ? (
        <div className={s.empty}>
          <strong>{st.ratingCount ? `${st.ratingCount} ${st.ratingCount === 1 ? 'rating' : 'ratings'} so far` : 'No ratings yet'}</strong>
          We show an average once five people have rated it. A single score says more about the person than the perfume.
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.overall}>
            <p className={styles.big}>
              <span className="t-figure">{st.ratingAvg?.toFixed(1)}</span>
              <span>/10 overall</span>
            </p>
            {div && (
              <p className={styles.div}>
                <b>{div.label}.</b> {div.detail}
              </p>
            )}
            <div
              className={styles.hist}
              role="img"
              aria-label={`Rating distribution: ${st.ratingHist.map((n, i) => `${i + 1}: ${Math.round((n / total) * 100)}%`).join(', ')}`}
            >
              {st.ratingHist.map((n, i) => (
                <span key={i} className={styles.histCol}>
                  <span className={styles.histBar} style={{ height: `${(n / max) * 100}%` }} />
                  <span className={styles.histLabel}>{i + 1}</span>
                </span>
              ))}
            </div>
            <p className="t-meta">How {formatNumber(st.ratingCount)} people scored it, 1 to 10.</p>
          </div>
          <dl className={styles.subs}>
            {SUBS.map((sub) => {
              const v = st[sub.key];
              return (
                <div key={sub.key}>
                  <dt>
                    {sub.label}
                    <span>{sub.hint}</span>
                  </dt>
                  <dd>
                    <span className={styles.subTrack} aria-hidden>
                      <span style={{ width: `${((v ?? 0) / 10) * 100}%` }} />
                    </span>
                    <span className="t-figure">{v ? v.toFixed(1) : '–'}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
      <div className={s.cta}>
        <VoteButton kind="rating" label="Rate it" editedLabel="Change your rating" />
      </div>
    </section>
  );
}
