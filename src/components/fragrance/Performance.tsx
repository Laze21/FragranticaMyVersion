import type { FragranceDetail } from '@/lib/data/types';
import { Term } from '@/components/ui/Term';
import { LONGEVITY_BUCKETS, PROJECTION_LEVELS } from '@/lib/scent/vocab';
import { histAvg, longevityRange } from '@/lib/scent/read';
import { projectionAt } from '@/lib/scent/trail';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './Performance.module.css';
import s from './sections.module.css';

const MOMENTS = [
  { h: 0.1, label: 'Spray' },
  { h: 1, label: '1 hour' },
  { h: 3, label: '3 hours' },
  { h: 6, label: '6 hours' },
  { h: 9, label: '9 hours' },
];

export function Performance({ f }: { f: FragranceDetail }) {
  const st = f.stats;
  const total = st.longevityHist.reduce((a, b) => a + b, 0);
  const range = longevityRange(st.longevityHist);
  const max = Math.max(1, ...st.longevityHist);
  const peak = st.longevityHist.indexOf(Math.max(...st.longevityHist));
  const enough = st.perfVotes >= 5;
  const input = {
    character: st.character,
    longevityHrs: st.longevityMedian,
    projectionOpening: histAvg(st.projectionOpeningHist),
    projectionLater: histAvg(st.projectionLaterHist),
    heartAtMin: f.heartAtMin,
    drydownAtMin: f.drydownAtMin,
  };
  const pTotal = st.projectionOpeningHist.reduce((a, b) => a + b, 0);
  const reformulated = f.variants.filter((v) => v.kind === 'formulation');

  return (
    <section className={s.section} aria-labelledby="performance">
      <SectionHead
        id="performance"
        title="How long, how loud"
        lede="Ranges, not promises. Skin, climate and how many sprays you use all move these numbers."
        votes={st.perfVotes}
        votesLabel="people reporting"
        demo={st.includesBaseline}
      />
      {!enough ? (
        <div className={s.empty}>
          <strong>Not enough reports yet</strong>
          {st.perfVotes ? `${st.perfVotes} ${st.perfVotes === 1 ? 'person has' : 'people have'} reported so far. We show ranges once five people have.` : 'Nobody has reported yet.'}
        </div>
      ) : (
        <div className={styles.grid}>
          <div>
            <h3 className={styles.sub}>
              <Term slug="longevity">Longevity</Term>
            </h3>
            <p className={styles.big}>
              <span className="t-figure">{range?.text ?? '—'}</span>
              <span className={styles.bigNote}>what most people get</span>
            </p>
            <div className={styles.hist} role="img" aria-label={`Longevity reports: ${LONGEVITY_BUCKETS.map((b, i) => `${b.label} ${Math.round((st.longevityHist[i] / total) * 100)}%`).join(', ')}`}>
              {LONGEVITY_BUCKETS.map((b, i) => (
                <div key={b.key} className={styles.col} data-peak={i === peak || undefined}>
                  <span className={styles.colPct}>{Math.round((st.longevityHist[i] / total) * 100)}%</span>
                  <span className={styles.colBar} style={{ height: `${(st.longevityHist[i] / max) * 100}%` }} />
                  <span className={styles.colLabel}>{b.short}</span>
                </div>
              ))}
            </div>
            {reformulated.length > 0 && (
              <p className={styles.note}>
                <Term slug="reformulation">Reformulated</Term>: {reformulated.map((v) => v.label).join(' → ')}. Older bottles are reported to last
                longer; these numbers mix both.
              </p>
            )}
          </div>

          <div>
            <h3 className={styles.sub}>
              <Term slug="projection">Projection</Term> over time
            </h3>
            <ol className={styles.timeline} role="list">
              {MOMENTS.filter((m) => m.h <= (st.longevityMedian ?? 8) * 1.15 + 0.5).map((m) => {
                const p = projectionAt(input, m.h);
                const level = PROJECTION_LEVELS[Math.max(0, Math.min(4, Math.round(p) - 1))];
                return (
                  <li key={m.label}>
                    <span className={styles.moment}>{m.label}</span>
                    <span className={styles.track} aria-hidden>
                      <span className={styles.fill} style={{ width: `${(p / 5) * 100}%` }} />
                    </span>
                    <span className={styles.level}>{p < 0.6 ? 'Gone for most' : level.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className={styles.split}>
              <p className={styles.splitLabel}>First hour, as reported</p>
              <div className={styles.stack} role="img" aria-label={PROJECTION_LEVELS.map((l, i) => `${l.label} ${Math.round((st.projectionOpeningHist[i] / pTotal) * 100)}%`).join(', ')}>
                {PROJECTION_LEVELS.map((l, i) => {
                  const w = pTotal ? (st.projectionOpeningHist[i] / pTotal) * 100 : 0;
                  return w > 0 ? <span key={l.value} style={{ width: `${w}%`, opacity: 0.25 + i * 0.18 }} title={`${l.label}: ${Math.round(w)}%`} /> : null;
                })}
              </div>
              <div className={styles.stackLegend} aria-hidden>
                <span>Skin</span>
                <span>Room-filling</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={s.cta}>
        <VoteButton kind="performance" label="How did it perform on you?" />
      </div>
    </section>
  );
}
