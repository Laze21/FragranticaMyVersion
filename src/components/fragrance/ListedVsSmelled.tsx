import Link from 'next/link';
import type { FragranceDetail, NoteRef } from '@/lib/data/types';
import { Blotter } from '@/components/scent/Blotter';
import { Term } from '@/components/ui/Term';
import { formatNumber } from '@/lib/scent/read';
import { SourceBadge } from './SourceBadge';
import { SectionHead } from './SectionHead';
import { FoldOnPhone } from './FoldOnPhone';
import styles from './ListedVsSmelled.module.css';
import s from './sections.module.css';

/**
 * Our clearest differentiator: what the house says is in it, next to what people actually
 * smell. Two kinds of truth on one linen band, each labelled with where it came from. The left
 * column's title follows the claim's source, so the head never contradicts its own badge.
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
      ] as const).filter(([, notes]) => notes.length)
    : [];
  const claim = f.notesClaim;
  const listTitle = !f.notes
    ? 'No official list yet'
    : claim?.sourceType === 'official_brand'
      ? `Listed by ${f.brandName}`
      : claim && !claim.verifiedAt
        ? `Listed (per ${f.brandName}, not yet checked)`
        : `Listed by ${f.brandName}`;

  return (
    <section className={`${s.section} ${s['gap-96']} ${s.band}`} aria-labelledby="notes">
      <SectionHead
        id="notes"
        title="Listed vs. smelled"
        lede={
          <>
            The <Term slug="note-pyramid">note list</Term> is the house’s description, not an ingredient list. Next to it: what people actually notice
            on skin.
          </>
        }
        votes={st.perceivedVoters}
        votesLabel="people"
        vote={{ kind: 'perceived', label: 'What do you smell?', editedLabel: 'Change what you smell' }}
      />
      <div className={styles.grid}>
        <div className={styles.col}>
          <FoldOnPhone
            summary={
              <span>
                {listTitle}
                {listed.length > 0 && <span className={styles.summaryCount}> · {listed.length} notes</span>}
              </span>
            }
          >
            <div className={styles.colHead}>
              <h3 className={`${s.h3} ${styles.colTitle}`}>{listTitle}</h3>
              {claim && <SourceBadge claim={claim} />}
            </div>
            {f.notes ? (
              <div className={styles.layers}>
                {groups.map(([label, notes, term]) => (
                  <div key={label} className={styles.layer}>
                    <p className={s.eyebrow}>{term ? <Term slug={term}>{label}</Term> : label}</p>
                    <p className={styles.inline}>
                      {notes.map((n) => (
                        <Link key={n.slug} href={`/notes/${n.slug}`} className={styles.note} style={{ ['--hue' as string]: n.hue }}>
                          {n.name}
                        </Link>
                      ))}
                    </p>
                  </div>
                ))}
                {f.notes.unspecified.length > 0 && !f.notes.top.length && <p className={styles.flat}>The house lists notes without a top, heart and base split.</p>}
              </div>
            ) : (
              <p className={styles.flat}>
                {f.status === 'upcoming' ? 'The house hasn’t published a note list for this release.' : 'We haven’t found a published note list from the house.'}{' '}
                <Link href={`/contribute?fragrance=${f.slug}&kind=official_notes`}>Have a source? Add it</Link>
              </p>
            )}
          </FoldOnPhone>
        </div>

        <div className={styles.col}>
          <div className={styles.colHead}>
            <h3 className={`${s.h3} ${styles.colTitle}`}>What people smell</h3>
            {st.perceivedVoters > 0 && (
              <span className={styles.colMeta}>
                <b className="tnum">{formatNumber(st.perceivedVoters)}</b> people
              </span>
            )}
          </div>
          {top.length ? (
            <>
              <ul role="list" className={s.bars} aria-label="Share of people who notice each note">
                {top.map(([slug, share]) => {
                  const note = noteIndex[slug];
                  const notListed = Boolean(f.notes) && !listedSlugs.has(slug);
                  const pct = Math.round(share * 100);
                  return (
                    <li key={slug} className={s.barRow}>
                      <span className={s.barLabel}>
                        <Blotter hue={note.hue} />
                        <Link href={`/notes/${note.slug}`} className={styles.barLink}>
                          {note.name}
                        </Link>
                        {notListed && <span className={s.tag}>not listed</span>}
                      </span>
                      <span className={s.barTrack} aria-hidden>
                        <span className={s.barFill} data-hollow={notListed || undefined} style={{ width: `${pct}%` }} />
                      </span>
                      <span className={s.barValue}>{pct}%</span>
                    </li>
                  );
                })}
              </ul>
              {(surprising.length > 0 || (rarely.length > 0 && st.perceivedVoters >= 20)) && (
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
            <p className={styles.nobody}>No one has said what they smell yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
