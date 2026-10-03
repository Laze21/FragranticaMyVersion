import { buildTrail, describeTrail, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META } from '@/lib/scent/vocab';

const LABELS = Object.fromEntries(Object.entries(DIMENSION_META).map(([k, v]) => [k, v.label])) as Record<keyof typeof DIMENSION_META, string>;

/** The Trail as a glyph: recognisable silhouette at card size. */
export function TrailThumb({ input, width = 132, height = 34, className, decorative = false }: { input: TrailInput; width?: number; height?: number; className?: string; decorative?: boolean }) {
  const hasData = Object.keys(input.character.opening ?? {}).length + Object.keys(input.character.drydown ?? {}).length > 0;
  if (!hasData) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
        <line x1="2" x2={width - 2} y1={height / 2} y2={height / 2} stroke="var(--stone-2)" strokeDasharray="2 4" />
      </svg>
    );
  }
  const g = buildTrail(input, width, height, { samples: 32, minShare: 0.05 });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Trail: ${describeTrail(input, LABELS)}`}
    >
      {g.bands.map((b) => (
        <path key={b.dim} d={b.path} fill={DIMENSION_META[b.dim].hue} stroke="var(--trail-gap, var(--porcelain))" strokeWidth={0.6} />
      ))}
    </svg>
  );
}
