import { Icon, type IconName } from '@/components/Icon';
import styles from './SeasonsGlyph.module.css';

const SEASONS: Array<{ key: 'spring' | 'summer' | 'autumn' | 'winter'; short: string; name: string; icon: IconName }> = [
  { key: 'spring', short: 'Sp', name: 'Spring', icon: 'sprout' },
  { key: 'summer', short: 'Su', name: 'Summer', icon: 'sun' },
  { key: 'autumn', short: 'Au', name: 'Autumn', icon: 'falling-leaf' },
  { key: 'winter', short: 'Wi', name: 'Winter', icon: 'snow' },
];

/**
 * Four seasons as four 12px columns on one baseline, each with its glyph, its two-letter cap
 * and its number. Values are shares (0..1) of the people who said the season suits it. The
 * number is always printed, so the column is a picture of it rather than the only carrier.
 */
export function SeasonsGlyph({ values, label = 'Seasons people wear it in', className }: { values: Partial<Record<string, number>>; label?: string; className?: string }) {
  const max = Math.max(0.01, ...SEASONS.map((s) => values[s.key] ?? 0));
  return (
    <ul role="list" aria-label={label} className={[styles.seasons, className ?? ''].join(' ').trim()}>
      {SEASONS.map((s) => {
        const v = values[s.key] ?? 0;
        const pct = Math.round(v * 100);
        return (
          <li key={s.key} className={styles.season} data-strong={v >= 0.55 || undefined}>
            <Icon name={s.icon} size={14} className={styles.icon} />
            <span className={styles.column} aria-hidden="true">
              <span className={styles.bar} style={{ height: `${Math.max(2, (v / max) * 36)}px` }} />
            </span>
            <span className={styles.short} aria-hidden="true">
              {s.short}
            </span>
            <span className="visually-hidden">{s.name}</span>
            <span className={styles.value}>{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
