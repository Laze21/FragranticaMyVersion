import { markGeometry } from '@/lib/scent/trail';
import styles from './TrailMark.module.css';

/**
 * The logo mark is a Trail in miniature, generated from the same geometry as every chart
 * (see `markGeometry` in trail.ts). It is the favicon, the glyph before the word "Trail" in
 * chart captions, the wordmark's companion and, with `drawing`, the loading indicator.
 */
const MARK = markGeometry(40, 16);

/**
 * `drawing` makes it the loading indicator: the mark draws on from the nose, once per second,
 * the same clip reveal the full chart uses. Reduced motion shows it complete.
 */
export function TrailMark({ className, drawing = false, label }: { className?: string; drawing?: boolean; label?: string }) {
  return (
    <svg
      className={[styles.mark, drawing ? styles.drawing : '', className ?? ''].join(' ').trim()}
      viewBox="0 0 40 16"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <g className={styles.bands}>
        {MARK.bands.map((b) => (
          <path key={b.dim} d={b.path} fill="currentColor" opacity={b.opacity} />
        ))}
      </g>
    </svg>
  );
}
