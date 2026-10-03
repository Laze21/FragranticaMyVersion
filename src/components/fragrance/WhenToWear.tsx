import type { FragranceDetail } from '@/lib/data/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { SeasonsGlyph } from '@/components/scent/SeasonsGlyph';
import { WEAR_CONTEXTS } from '@/lib/scent/vocab';
import { formatNumber } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './WhenToWear.module.css';
import s from './sections.module.css';

const MARKETED: Record<string, string> = { masculine: 'for men', feminine: 'for women', unisex: 'for everyone' };

function Row({ label, value, hue, hollow }: { label: string; value: number; hue?: string; hollow?: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <li className={`${s.barRow} ${styles.row}`}>
      <span className={s.barLabel}>{label}</span>
      <span className={s.barTrack} aria-hidden>
        <span className={`${s.barFill} ${hollow ? styles.dayFill : ''}`} style={{ width: `${pct}%`, ['--bar-hue' as string]: hue }} />
      </span>
      <span className={s.barValue}>{pct}%</span>
    </li>
  );
}

/**
 * When to wear it: one compact strip. Seasons as the glyph, day and night as two independent
 * bars on one scale (a fragrance can suit both), the three weather and three occasions people
 * name most, the rest of the occasions behind a disclosure. The lower half of the wear band.
 */
export function WhenToWear({ f }: { f: FragranceDetail }) {
  const st = f.stats;
  const w = st.wear;
  const enough = st.wearVoters >= 5;
  const by = (grp: string) => WEAR_CONTEXTS.filter((c) => c.grp === grp);
  const rank = (grp: string) => by(grp).sort((a, b) => (w[b.key] ?? 0) - (w[a.key] ?? 0));
  const weather = rank('weather').slice(0, 3);
  const occasions = rank('occasion');
  const topOccasions = occasions.slice(0, 3);
  const restOccasions = occasions.slice(3);

  return (
    <section className={`${s.section} ${s['gap-0']} ${s.band} ${s.bandBottom}`} aria-labelledby="wear">
      <SectionHead
        id="wear"
        title="When to wear it"
        lede={`Marketing says “${MARKETED[f.marketedFor] ?? 'for everyone'}”; this is where people say they’d wear it.`}
        votes={st.wearVoters}
        votesLabel="people"
        vote={{ kind: 'wear', label: 'Add yours', editedLabel: 'Change yours' }}
      />
      {!enough ? (
        <EmptyState
          title={`Too early to say where ${f.name} fits.`}
          line={`Seasons and occasions appear once five people have weighed in. ${st.wearVoters ? `${st.wearVoters} so far.` : 'Nobody has yet.'}`}
          action={<VoteButton kind="wear" label="Say when you’d wear it" />}
        />
      ) : (
        <>
          <div className={styles.strip}>
            <div className={styles.block}>
              <p className={s.eyebrow}>Seasons</p>
              <SeasonsGlyph values={w} />
            </div>
            <div className={styles.block}>
              <p className={s.eyebrow}>Day or night</p>
              <ul role="list" className={s.bars} aria-label="Share who say it suits day and night">
                <Row label="Day" value={w.day ?? 0} hue="var(--scent-wash-2)" hollow />
                <Row label="Night" value={w.night ?? 0} />
              </ul>
            </div>
            <div className={styles.block}>
              <p className={s.eyebrow}>Weather</p>
              <ul role="list" className={s.bars} aria-label="Weather people wear it in">
                {weather.map((c) => (
                  <Row key={c.key} label={c.label} value={w[c.key] ?? 0} />
                ))}
              </ul>
            </div>
            <div className={styles.block}>
              <p className={s.eyebrow}>Occasions</p>
              <ul role="list" className={s.bars} aria-label="Occasions people wear it for">
                {topOccasions.map((c) => (
                  <Row key={c.key} label={c.label} value={w[c.key] ?? 0} />
                ))}
              </ul>
              {restOccasions.length > 0 && (
                <details className={styles.more}>
                  <summary className={styles.moreSummary}>All {occasions.length} occasions</summary>
                  <ul role="list" className={s.bars}>
                    {restOccasions.map((c) => (
                      <Row key={c.key} label={c.label} value={w[c.key] ?? 0} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
          <p className={s.footnote}>
            Percentages are “fits” votes out of {formatNumber(st.wearVoters)}. They don’t add up to 100: one fragrance can suit many moments.
          </p>
        </>
      )}
    </section>
  );
}
