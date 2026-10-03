import type { FragranceDetail, NoteRef } from '@/lib/data/types';
import { TrailChart } from '@/components/scent/TrailChart';
import { NoteTag } from '@/components/scent/NoteTag';
import { Term } from '@/components/ui/Term';
import { DIMENSION_META } from '@/lib/scent/vocab';
import { histAvg, topDims } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { MistOverlay } from './MistOverlay';
import styles from './Journey.module.css';
import s from './sections.module.css';

const PER_PHASE = 6;
/* A note counts as noticed in a phase once a fifth of the people describing it put it there. */
const NOTICED = 0.2;
/* Under five voters a share is one person's opinion, so no badges and no appended notes. */
const MIN_VOTERS = 5;

function window_(min: number) {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

/**
 * How it moves: the three phases as three columns whose widths echo their length on skin, one
 * note row per phase. Listed notes carry the share of people who notice them there; notes the
 * house did not list but people smell are appended, dashed and flagged. The Trail figure itself
 * is drawn by the page above the body columns; `trail` draws it here instead for pages that have
 * no room for it up top.
 */
export function Journey({ f, noteIndex, trail = false }: { f: FragranceDetail; noteIndex: Record<string, NoteRef>; trail?: boolean }) {
  const st = f.stats;
  const layers = f.notes;
  const flatOnly = layers && !layers.top.length && !layers.heart.length && !layers.base.length;
  const voters = st.perceivedVoters;
  const phases = [
    { key: 'opening' as const, label: 'Opening', when: `0–${window_(f.heartAtMin)}`, listed: layers?.top ?? [], layer: 'top-notes' },
    { key: 'heart' as const, label: 'Heart', when: `${window_(f.heartAtMin)}–${window_(f.drydownAtMin)}`, listed: layers?.heart ?? [], layer: 'heart-notes' },
    { key: 'drydown' as const, label: 'Drydown', when: `${window_(f.drydownAtMin)} on`, listed: layers?.base ?? [], layer: 'base-notes' },
  ];
  const rows = phases.map((p) => {
    const counts = st.perceivedByPhase[p.key] ?? {};
    const share = (slug: string) => (voters >= MIN_VOTERS ? (counts[slug] ?? 0) / voters : 0);
    const listedSlugs = new Set(p.listed.map((n) => n.slug));
    const noticed = Object.keys(counts)
      .filter((slug) => !listedSlugs.has(slug) && noteIndex[slug] && share(slug) >= NOTICED)
      .sort((a, b) => share(b) - share(a))
      .map((slug) => noteIndex[slug]);
    const row = [...p.listed.map((n) => ({ n, listed: true })), ...noticed.map((n) => ({ n, listed: false }))];
    return { ...p, share, shown: row.slice(0, PER_PHASE), more: row.length - Math.min(row.length, PER_PHASE) };
  });
  // The key only explains what is drawn: a dashed strip hidden behind "+2" needs no legend.
  const anyUnlisted = rows.some((p) => p.shown.some((x) => !x.listed));
  const input = {
    character: st.character,
    longevityHrs: st.longevityMedian,
    projectionOpening: st.perfVotes >= 5 ? histAvg(st.projectionOpeningHist) : null,
    projectionLater: st.perfVotes >= 5 ? histAvg(st.projectionLaterHist) : null,
    heartAtMin: f.heartAtMin,
    drydownAtMin: f.drydownAtMin,
  };

  return (
    <section className={`${s.section} ${s['gap-32']}`} aria-labelledby="journey" id="journey-section">
      <SectionHead
        id="journey"
        title="How it moves"
        lede="Every fragrance changes on skin. The Trail is its character over time: thicker where it projects, longer where it lasts."
        votes={voters}
        votesLabel="people describing it"
        vote={{ kind: 'character', label: 'Add yours', editedLabel: 'Change yours' }}
      />

      {trail && (
        <div className={styles.trail}>
          <TrailChart input={input} name={f.name} />
        </div>
      )}

      <ol className={styles.phases} id="journey-phases" role="list" data-mist-root tabIndex={-1}>
        {rows.map((p) => {
          const { share, shown, more } = p;
          const dims = topDims(st.character[p.key], 2, 0.1);
          return (
            <li key={p.key} className={styles.phase} data-phase={p.key}>
              <p className={styles.when}>
                <Term slug={p.layer}>{p.label}</Term>
                <span className={styles.window}>{p.when}</span>
              </p>
              <p className={styles.reads}>
                {dims.length > 0 ? (
                  <>
                    Reads{' '}
                    {dims.map((d, i) => (
                      <span key={d}>
                        {i > 0 && ' and '}
                        <b style={{ ['--hue' as string]: DIMENSION_META[d].hue }}>{DIMENSION_META[d].label.toLowerCase()}</b>
                      </span>
                    ))}
                  </>
                ) : (
                  <span className={styles.none}>Not enough votes to say how it reads</span>
                )}
              </p>
              <div className={styles.notes}>
                {shown.length ? (
                  <div className={styles.tags}>
                    {shown.map(({ n, listed }) => {
                      const sh = share(n.slug);
                      return (
                        <span
                          key={n.slug}
                          data-mist-target={p.key === 'opening' ? n.hue : undefined}
                          className={`${styles.target} ${listed ? '' : styles.unlisted}`}
                        >
                          <NoteTag note={n} meta={sh >= NOTICED ? `${Math.round(sh * 100)}%` : undefined} flag={listed ? undefined : 'not listed'} />
                        </span>
                      );
                    })}
                    {more > 0 && <span className={styles.more}>+{more}</span>}
                  </div>
                ) : (
                  <p className={styles.none}>{!layers ? 'The house hasn’t published notes.' : flatOnly ? 'No pyramid given; the full list is below.' : 'Nothing listed here.'}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {voters >= MIN_VOTERS && layers && (
        <p className={styles.key}>
          Percentages: share of the {voters.toLocaleString('en-US')} people describing it who notice the note in that phase.
          {anyUnlisted && ' Dashed strips are not on the house’s list.'}
        </p>
      )}

      {f.editorial && (
        <div className={`${s.pull} ${styles.take}`}>
          <p className={s.pullLabel}>Our take</p>
          <p className={s.pullText}>{f.editorial}</p>
        </div>
      )}
      <MistOverlay />
    </section>
  );
}
