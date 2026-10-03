import type { Vec } from '@/lib/data/types';
import { DIMENSION_META, type Dimension } from '@/lib/scent/vocab';
import styles from './CharacterBars.module.css';

/**
 * Ranked character list, text first: the label and its share on one line, the bar beneath.
 * The number is always in the DOM, so the bar is never the only carrier. Fills take the
 * dimension's hue with a darker end cap; widths transition in place when the numbers change.
 */
export function CharacterBars({ vec, limit = 6, label }: { vec: Vec; limit?: number; label: string }) {
  const rows = (Object.entries(vec) as Array<[Dimension, number]>).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!rows.length) return <p className="t-meta">Not enough votes</p>;
  return (
    <ul role="list" className={styles.list} aria-label={label}>
      {rows.map(([d, v]) => {
        const pct = Math.round(Math.min(1, v) * 100);
        return (
          <li key={d} className={styles.row}>
            <span className={styles.line}>
              <span className={styles.name}>{DIMENSION_META[d].label}</span>
              <span className={styles.value}>{pct}%</span>
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.fill} style={{ width: `${pct}%`, ['--bar-hue' as string]: DIMENSION_META[d].hue }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
