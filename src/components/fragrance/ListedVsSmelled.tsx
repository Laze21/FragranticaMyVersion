import Link from 'next/link';
import type { FragranceDetail, NoteRef } from '@/lib/data/types';
import { NoteTag } from '@/components/scent/NoteTag';
import { Term } from '@/components/ui/Term';
import { formatNumber } from '@/lib/scent/read';
import { SourceBadge } from './SourceBadge';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './ListedVsSmelled.module.css';
import s from './sections.module.css';

/**
 * Our clearest differentiator: what the house says is in it, next to what people actually
 * smell. Two different kinds of truth, kept apart and each labelled with where it came from.
 */
export function ListedVsSmelled({ f, noteIndex }: { f: FragranceDetail; noteIndex: Record<string, NoteRef> }) {
  const st = f.stats;
  const listed = f.notes ? [...f.notes.top, ...f.notes.heart, ...f.notes.base, ...f.notes.unspecified] : [];
  const listedSlugs = new Set(listed.map((n) => n.slug));
  const perceived = Object.entries(st.perceived)
    .filter(([slug]) => noteIndex[slug])
    .sort((a, b) => b[1] - a[1]);
  const top = perceived.slice(0, 12);
  const rarely = listed.filter((n) => (st.perceived[n.slug] ?? 0) < 0.15);
  const surprising = perceived.filter(([slug, share]) => !listedSlugs.has(slug) && share >= 0.2);
  const groups = f.notes
    ? ([
        ['Top', f.notes.top, 'top-notes'],
        ['Heart', f.notes.heart, 'heart-notes'],
        ['Base', f.notes.base, 'base-notes'],
        ['Notes', f.notes.unspecified, null],
      ] as const)
    : [];

  return (
    <section className={s.section} aria-labelledby="notes">
      <SectionHead
        id="notes"
        title="Listed vs. smelled"
        lede={
          <>
            The <Term slug="note-pyramid">note list</Term> is the house’s description, not an ingredient list. Next to it: what people actually
            notice on skin.
          </>
        }
      />
      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.colHead}>
            <h3 className={styles.colTitle}>Listed by the house</h3>
            {f.notesClaim && <SourceBadge claim={f.notesClaim} />}
          </div>
          {f.notes ? (
            <div className={styles.layers}>
              {groups
                .filter(([, notes]) => notes.length)
                .map(([label, notes, term]) => (
                  <div key={label} className={styles.layer}>
                    <p className={styles.layerLabel}>{term ? <Term slug={term}>{label}</Term> : label}</p>
                    <div className={styles.tags}>
                      {notes.map((n) => (
                        <NoteTag key={n.slug} note={n} />
                      ))}
                    </div>
                  </div>
                ))}
              {f.notes.unspecified.length > 0 && !f.notes.top.length && (
                <p className="t-meta">The house lists notes without a top/heart/base split.</p>
              )}
            </div>
          ) : (
            <div className={s.empty}>
              <strong>No official notes yet</strong>
              {f.status === 'upcoming'
                ? 'The house hasn’t published a note list for this release.'
                : 'We haven’t found a published note list from the house.'}{' '}
              <Link href={`/contribute?fragrance=${f.slug}&kind=official_notes`}>Have a source? Add it</Link>
            </div>
          )}
        </div>

        <div className={styles.col}>
          <div className={styles.colHead}>
            <h3 className={styles.colTitle}>What people smell</h3>
            <span className="t-meta">
              {st.perceivedVoters ? `${formatNumber(st.perceivedVoters)} people` : 'No votes yet'}
            </span>
          </div>
          {top.length ? (
            <>
              <ul role="list" className={s.bars} aria-label="Share of people who notice each note">
                {top.map(([slug, share]) => {
                  const note = noteIndex[slug];
                  const notListed = !listedSlugs.has(slug) && f.notes;
                  return (
                    <li key={slug} className={s.barRow}>
                      <span className={s.barLabel}>
                        <NoteTag note={note} flag={notListed ? 'not listed' : undefined} />
                      </span>
                      <span className={s.barTrack} aria-hidden>
                        <span className={s.barFill} style={{ width: `${Math.round(share * 100)}%`, background: note.hue }} />
                      </span>
                      <span className={s.barValue}>{Math.round(share * 100)}%</span>
                    </li>
                  );
                })}
              </ul>
              {(surprising.length > 0 || rarely.length > 0) && (
                <div className={styles.callouts}>
                  {surprising.length > 0 && (
                    <p>
                      <b>Not on the list, but people smell it:</b>{' '}
                      {surprising
                        .slice(0, 3)
                        .map(([slug, sh]) => `${noteIndex[slug].name.toLowerCase()} (${Math.round(sh * 100)}%)`)
                        .join(', ')}
                      .
                    </p>
                  )}
                  {rarely.length > 0 && st.perceivedVoters >= 20 && (
                    <p>
                      <b>Listed, but rarely noticed:</b> {rarely.map((n) => n.name.toLowerCase()).join(', ')}.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={s.empty}>
              <strong>Nobody has described it yet</strong>
              Be the first to say what you smell. Early votes shape what newcomers expect.
            </div>
          )}
          <div className={s.cta}>
            <VoteButton kind="perceived" label="What do you smell?" editedLabel="Change what you smell" />
          </div>
        </div>
      </div>
    </section>
  );
}
