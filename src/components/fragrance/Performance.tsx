import type { FragranceDetail } from '@/lib/data/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Term } from '@/components/ui/Term';
import { LONGEVITY_BUCKETS, PROJECTION_LEVELS } from '@/lib/scent/vocab';
import { formatNumber, longevityRange } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './Performance.module.css';
import s from './sections.module.css';

function Rows({ hist, label, muted }: { hist: number[]; label: string; muted?: (i: number) => boolean }) {
  const total = hist.reduce((a, b) => a + b, 0) || 1;
  return (
    <ul role="list" className={s.bars} aria-label={label}>
      {PROJECTION_LEVELS.map((l, i) => {
        const pct = Math.round(((hist[i] ?? 0) / total) * 100);
        return (
          <li key={l.value} className={`${s.barRow} ${styles.row}`}>
            <span className={s.barLabel}>{l.label}</span>
            <span className={s.barTrack} aria-hidden>
              <span className={s.barFill} data-muted={muted?.(i) || undefined} style={{ width: `${pct}%` }} />
            </span>
            <span className={s.barValue}>{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * How long, how loud: the typical range as one figure, the reports behind it as rows (the
 * typical buckets in the fragrance's own colour), and projection as two sets of five labelled
 * rows, first hour and later. Shares the linen band with "When to wear it" beneath.
 */
export function Performance({ f }: { f: FragranceDetail }) {
  const st = f.stats;
  const total = st.longevityHist.reduce((a, b) => a + b, 0);
  const range = longevityRange(st.longevityHist);
  const enough = st.perfVotes >= 5;
  const reformulated = f.variants.filter((v) => v.kind === 'formulation');
  const typical = (i: number) => !!range && LONGEVITY_BUCKETS[i].lo < range.hi && LONGEVITY_BUCKETS[i].hi > range.lo;

  return (
    <section className={`${s.section} ${s['gap-96']} ${s.band} ${s.bandTop}`} aria-labelledby="performance">
      <SectionHead
        id="performance"
        title="How long, how loud"
        lede="Ranges, not promises. Skin, climate and how many sprays you use all move these numbers."
        votes={st.perfVotes}
        votesLabel="people reporting"
        vote={{ kind: 'performance', label: 'Add yours', editedLabel: 'Change yours' }}
      />
      {!enough ? (
        <EmptyState
          title={`Not enough reports on ${f.name} yet.`}
          line={`Ranges appear once five people have reported. ${st.perfVotes ? `${st.perfVotes} so far.` : 'Nobody has yet.'}`}
          action={<VoteButton kind="performance" label="Report how it wore on you" />}
        />
      ) : (
        <div className={styles.grid}>
          <div className={styles.left}>
            <p className={styles.big}>
              <span className={`t-figure-serif ${styles.figure}`}>{range?.text ?? 'Not enough votes'}</span>
              <span className={styles.bigNote}>
                typical, from {formatNumber(st.perfVotes)} reports · <Term slug="longevity">longevity</Term>
              </span>
            </p>
            <ul role="list" className={s.bars} aria-label="How long people say it lasts">
              {LONGEVITY_BUCKETS.map((b, i) => {
                const pct = total ? Math.round((st.longevityHist[i] / total) * 100) : 0;
                const on = typical(i);
                return (
                  <li key={b.key} className={`${s.barRow} ${styles.row}`} data-typical={on || undefined}>
                    <span className={s.barLabel}>{b.short}</span>
                    <span className={s.barTrack} aria-hidden>
                      <span className={s.barFill} data-muted={!on || undefined} style={{ width: `${pct}%`, ['--bar-hue' as string]: 'var(--scent)' }} />
                    </span>
                    <span className={s.barValue}>{pct}%</span>
                  </li>
                );
              })}
            </ul>
            {reformulated.length > 0 && (
              <p className={styles.note}>
                <Term slug="reformulation">Reformulated</Term>: {reformulated.map((v) => v.label).join(' → ')}. Older bottles are reported to last longer;
                these numbers mix both.
              </p>
            )}
          </div>

          <div className={styles.right}>
            <p className={s.eyebrow}>
              <Term slug="projection">Projection</Term> in the first hour
            </p>
            <Rows hist={st.projectionOpeningHist} label="Who could smell it in the first hour" />
            <p className={`${s.eyebrow} ${styles.later}`}>Three hours later</p>
            <Rows hist={st.projectionLaterHist} label="Who could smell it three hours later" />
          </div>
        </div>
      )}
    </section>
  );
}
