import type { FragranceDetail } from '@/lib/data/types';
import { Icon, type IconName } from '@/components/Icon';
import { WEAR_CONTEXTS } from '@/lib/scent/vocab';
import { formatNumber } from '@/lib/scent/read';
import { SectionHead } from './SectionHead';
import { VoteButton } from './VoteButton';
import styles from './WhenToWear.module.css';
import s from './sections.module.css';

const SEASON_ICON: Record<string, IconName> = { spring: 'leaf', summer: 'sun', autumn: 'leaf', winter: 'snow' };

export function WhenToWear({ f }: { f: FragranceDetail }) {
  const st = f.stats;
  const w = st.wear;
  const enough = st.wearVoters >= 5;
  const by = (grp: string) => WEAR_CONTEXTS.filter((c) => c.grp === grp);
  const day = w.day ?? 0;
  const night = w.night ?? 0;
  const dn = day + night || 1;
  const occasions = by('occasion').sort((a, b) => (w[b.key] ?? 0) - (w[a.key] ?? 0));

  return (
    <section className={s.section} aria-labelledby="wear">
      <SectionHead
        id="wear"
        title="When to wear it"
        lede={
          <>
            Share of people who say it fits each moment. Marketing says “{f.marketedFor === 'masculine' ? 'for men' : f.marketedFor === 'feminine' ? 'for women' : 'for everyone'}”;
            this is what wearers actually do.
          </>
        }
        votes={st.wearVoters}
        votesLabel="people"
        demo={st.includesBaseline}
      />
      {!enough ? (
        <div className={s.empty}>
          <strong>Too early to say</strong>
          When five people have weighed in, the seasons and occasions show up here.
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.block}>
            <h3 className={styles.sub}>Seasons</h3>
            <ul role="list" className={styles.seasons}>
              {by('season').map((c) => {
                const v = w[c.key] ?? 0;
                return (
                  <li key={c.key} data-strong={v >= 0.6 || undefined}>
                    <span className={styles.tube} aria-hidden>
                      <span style={{ height: `${Math.round(v * 100)}%` }} />
                    </span>
                    <Icon name={SEASON_ICON[c.key]} size={18} />
                    <span className={styles.sLabel}>{c.label}</span>
                    <span className={styles.sVal}>{Math.round(v * 100)}%</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.block}>
            <h3 className={styles.sub}>Day or night</h3>
            <div className={styles.dn} role="img" aria-label={`Day ${Math.round(day * 100)}%, night ${Math.round(night * 100)}%`}>
              <span className={styles.day} style={{ flexGrow: day / dn }}>
                <Icon name="sun" size={16} /> Day {Math.round(day * 100)}%
              </span>
              <span className={styles.night} style={{ flexGrow: night / dn }}>
                <Icon name="moon" size={16} /> Night {Math.round(night * 100)}%
              </span>
            </div>
            <h3 className={styles.sub} style={{ marginTop: 'var(--s-6)' }}>
              Weather
            </h3>
            <ul role="list" className={s.bars}>
              {by('weather').map((c) => (
                <li key={c.key} className={s.barRow}>
                  <span className={s.barLabel}>{c.label}</span>
                  <span className={s.barTrack} aria-hidden>
                    <span className={s.barFill} style={{ width: `${Math.round((w[c.key] ?? 0) * 100)}%` }} />
                  </span>
                  <span className={s.barValue}>{Math.round((w[c.key] ?? 0) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.block}>
            <h3 className={styles.sub}>Occasions</h3>
            <ul role="list" className={s.bars}>
              {occasions.map((c) => (
                <li key={c.key} className={s.barRow}>
                  <span className={s.barLabel}>{c.label}</span>
                  <span className={s.barTrack} aria-hidden>
                    <span className={s.barFill} style={{ width: `${Math.round((w[c.key] ?? 0) * 100)}%` }} />
                  </span>
                  <span className={s.barValue}>{Math.round((w[c.key] ?? 0) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p className="t-meta" style={{ marginTop: 'var(--s-4)' }}>
        {enough ? `Percentages are “fits” votes out of ${formatNumber(st.wearVoters)}. They don’t add up to 100: one fragrance can suit many moments.` : null}
      </p>
      <div className={s.cta}>
        <VoteButton kind="wear" label="When would you wear it?" />
      </div>
    </section>
  );
}
