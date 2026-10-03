import type { Vec } from '@/lib/data/types';
import { DIMENSION_META, type Dimension } from '@/lib/scent/vocab';
import styles from './CharacterBars.module.css';

/** Ranked character list with proportional bars. Text first, colour second. */
export function CharacterBars({ vec, limit = 6, label }: { vec: Vec; limit?: number; label: string }) {
  const rows = (Object.entries(vec) as Array<[Dimension, number]>).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const max = Math.max(0.01, ...rows.map(([, v]) => v));
  if (!rows.length) return <p className="t-meta">Not enough data yet.</p>;
  return (
    <ul role="list" className={styles.list} aria-label={label}>
      {rows.map(([d, v]) => (
        <li key={d}>
          <span className={styles.name}>
            <i style={{ background: DIMENSION_META[d].hue }} aria-hidden />
            {DIMENSION_META[d].label}
          </span>
          <span className={styles.track} aria-hidden>
            <span style={{ width: `${(v / max) * 100}%`, background: DIMENSION_META[d].hue }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
