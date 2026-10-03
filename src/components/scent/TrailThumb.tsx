import { describeTrail, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META, type Dimension } from '@/lib/scent/vocab';
import { thumbScene, type TrailThumbSize } from './trailThumbScene';
import styles from './TrailThumb.module.css';

export { thumbScene, trailThumbSvg, type ThumbScene, type TrailThumbSize } from './trailThumbScene';

const LABELS = Object.fromEntries(Object.entries(DIMENSION_META).map(([k, v]) => [k, v.label])) as Record<Dimension, string>;

export interface TrailThumbProps {
  input: TrailInput;
  size?: TrailThumbSize;
  /** older callers pass a box; `size` sets the band rules and the box when these are absent */
  width?: number;
  height?: number;
  className?: string;
  decorative?: boolean;
  id?: string;
}

/** The Trail as a glyph: a recognisable silhouette on a fixed 14h ruler. Never animates. */
export function TrailThumb({ input, size, width, height, className, decorative = false, id }: TrailThumbProps) {
  const chosen: TrailThumbSize = size ?? (height !== undefined && height >= 56 ? 'compare' : width !== undefined && width >= 240 ? 'feature' : 'card');
  const sc = thumbScene(input, chosen, { width, height });
  const clipId = `${id ?? 'trail'}-${chosen}-${Math.round(sc.width)}x${Math.round(sc.height)}`;
  const label = decorative ? undefined : `Trail: ${describeTrail(input, LABELS)}${sc.tickText ? ` ${sc.tickText}.` : ''}`;
  return (
    <svg
      width={sc.width}
      height={sc.height}
      viewBox={`0 0 ${sc.width} ${sc.height}`}
      className={[styles.thumb, className ?? ''].join(' ').trim()}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={label}
    >
      <g className={styles.ruler}>
        <line x1={0} x2={sc.width} y1={sc.cy} y2={sc.cy} strokeDasharray={sc.empty ? '2 4' : undefined} />
        {sc.ticks.map((x) => (
          <line key={x} x1={x} x2={x} y1={sc.cy - 2} y2={sc.cy + 3} />
        ))}
      </g>
      {!sc.empty && (
        <>
          <defs>
            <clipPath id={`${clipId}-solid`}>
              <rect x={-1} y={-1} width={sc.endX + 1} height={sc.height + 2} />
            </clipPath>
            <clipPath id={`${clipId}-late`}>
              <rect x={sc.endX} y={-1} width={sc.width - sc.endX + 1} height={sc.height + 2} />
            </clipPath>
          </defs>
          {(['solid', 'late'] as const).map((part) => (
            <g key={part} clipPath={`url(#${clipId}-${part})`} opacity={part === 'late' ? 0.45 : 1}>
              {sc.bands.map((b) => (
                <path key={b.dim} d={b.path} fill={b.fill} stroke={sc.strokeBands ? 'var(--trail-gap, var(--porcelain))' : undefined} strokeWidth={sc.strokeBands ? 1 : undefined} />
              ))}
              <path d={sc.outline} className={styles.outline} />
            </g>
          ))}
          {sc.endLabels.map((l) => (
            <g key={l.dim} className={styles.endLabel}>
              <line x1={l.fromX} y1={l.fromY} x2={l.x - 4} y2={l.y} />
              <text x={l.x} y={l.y} dy="0.35em">
                {l.text}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
