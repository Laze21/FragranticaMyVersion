import type { FragranceDetail, NoteRef } from '@/lib/data/types';
import { TrailChart } from '@/components/scent/TrailChart';
import { NoteTag } from '@/components/scent/NoteTag';
import { Term } from '@/components/ui/Term';
import { DIMENSION_META } from '@/lib/scent/vocab';
import { topDims } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { MistOverlay } from './MistOverlay';
import { VoteButton } from './VoteButton';
import styles from './Journey.module.css';
import s from './sections.module.css';

function window_(min: number) {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

export function Journey({ f, noteIndex }: { f: FragranceDetail; noteIndex: Record<string, NoteRef> }) {
  const st = f.stats;
  const input = {
    character: st.character,
    longevityHrs: st.longevityMedian,
    projectionOpening: st.perfVotes >= 5 ? avg(st.projectionOpeningHist) : null,
    projectionLater: st.perfVotes >= 5 ? avg(st.projectionLaterHist) : null,
    heartAtMin: f.heartAtMin,
    drydownAtMin: f.drydownAtMin,
  };
  const layers = f.notes;
  const flatOnly = layers && !layers.top.length && !layers.heart.length && !layers.base.length;
  const phases = [
    { key: 'opening' as const, label: 'Opening', when: `0–${window_(f.heartAtMin)}`, listed: layers?.top ?? [], layer: 'top-notes' },
    { key: 'heart' as const, label: 'Heart', when: `${window_(f.heartAtMin)}–${window_(f.drydownAtMin)}`, listed: layers?.heart ?? [], layer: 'heart-notes' },
    { key: 'drydown' as const, label: 'Drydown', when: `${window_(f.drydownAtMin)} on`, listed: layers?.base ?? [], layer: 'base-notes' },
  ];

  return (
    <section className={s.section} aria-labelledby="journey" id="journey-section">
      <SectionHead
        id="journey"
        title="How it moves"
        lede={
          <>
            Every fragrance changes on skin. The Trail shows its character over time: thicker where it projects, longer where it lasts.
          </>
        }
        votes={st.perceivedVoters}
        votesLabel="people describing it"
        demo={st.includesBaseline}
      />

      <TrailChart input={input} name={f.name} />

      {f.editorial && (
        <div className={styles.take}>
          <p className={styles.takeLabel}>Our take</p>
          <p className={s.prose}>{f.editorial}</p>
        </div>
      )}

      <ol className={styles.phases} id="journey-phases" role="list" data-mist-root tabIndex={-1}>
        {phases.map((p) => {
          const counts = st.perceivedByPhase[p.key] ?? {};
          const strongest = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([slug]) => noteIndex[slug])
            .filter(Boolean);
          const dims = topDims(st.character[p.key], 2, 0.1);
          return (
            <li key={p.key} className={styles.phase}>
              <p className={styles.when}>
                <Term slug={p.layer}>{p.label}</Term>
                <span>{p.when}</span>
              </p>
              {dims.length > 0 && (
                <p className={styles.reads}>
                  Reads{' '}
                  {dims.map((d, i) => (
                    <span key={d}>
                      {i > 0 && ' and '}
                      <b style={{ ['--hue' as string]: DIMENSION_META[d].hue }}>{DIMENSION_META[d].label.toLowerCase()}</b>
                    </span>
                  ))}
                </p>
              )}
              <div className={styles.group}>
                <p className={styles.groupLabel}>Listed</p>
                {p.listed.length ? (
                  <div className={styles.tags}>
                    {p.listed.map((n) => (
                      <span key={n.slug} data-mist-target={p.key === 'opening' ? n.hue : undefined} className={styles.target}>
                        <NoteTag note={n} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={styles.none}>{!layers ? 'The house hasn’t published notes.' : flatOnly ? 'No pyramid given (see full list below).' : 'Nothing listed here.'}</p>
                )}
              </div>
              {strongest.length > 0 && (
                <div className={styles.group}>
                  <p className={styles.groupLabel}>People notice most</p>
                  <div className={styles.tags}>
                    {strongest.map((n) => (
                      <span key={n.slug} data-mist-target={p.key === 'opening' ? n.hue : undefined} className={styles.target}>
                        <NoteTag note={n} emphasis />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className={s.cta}>
        <VoteButton kind="character" label="How does it read to you?" />
      </div>
      <MistOverlay />
    </section>
  );
}

function avg(h: number[]) {
  const t = h.reduce((a, b) => a + b, 0);
  return t ? h.reduce((s, c, i) => s + c * (i + 1), 0) / t : null;
}
