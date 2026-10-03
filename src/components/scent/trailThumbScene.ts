import { buildTrail, longevityTickText, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META, type Dimension } from '@/lib/scent/vocab';

const LABELS = Object.fromEntries(Object.entries(DIMENSION_META).map(([k, v]) => [k, v.label])) as Record<Dimension, string>;

export type TrailThumbSize = 'card' | 'feature' | 'compare' | 'og';

/**
 * One frame at every size: the full 14h baseline as a hairline through the centre with ticks at
 * 4h and 8h, so a short trail visibly stops short. Band caps keep thumbnails legible; the chart
 * is the only size that shows every band.
 */
const SIZES: Record<TrailThumbSize, { width: number; height: number; maxBands: number; minShare: number; endLabels: number }> = {
  card: { width: 180, height: 40, maxBands: 4, minShare: 0.1, endLabels: 0 },
  feature: { width: 260, height: 40, maxBands: 4, minShare: 0.1, endLabels: 0 },
  compare: { width: 300, height: 64, maxBands: 13, minShare: 0.035, endLabels: 3 },
  og: { width: 560, height: 70, maxBands: 4, minShare: 0.1, endLabels: 0 },
};

const TICK_HOURS = [4, 8];

interface SceneBand {
  dim: Dimension;
  path: string;
  fill: string;
  share: number;
  lastX: number;
  lastY: number;
}
interface EndLabel {
  dim: Dimension;
  text: string;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
}
export interface ThumbScene {
  width: number;
  height: number;
  cy: number;
  bands: SceneBand[];
  outline: string;
  endX: number;
  lateX: number;
  ticks: number[];
  strokeBands: boolean;
  endLabels: EndLabel[];
  tickText: string | null;
  empty: boolean;
}

export function thumbScene(input: TrailInput, size: TrailThumbSize, override: { width?: number; height?: number } = {}): ThumbScene {
  const spec = SIZES[size];
  const width = override.width ?? spec.width;
  const height = override.height ?? spec.height;
  const cy = height / 2;
  const hasData = Object.keys(input.character.opening ?? {}).length + Object.keys(input.character.drydown ?? {}).length > 0;
  const g = buildTrail(input, width, height, { samples: width >= 400 ? 48 : 32, minShare: spec.minShare, maxBands: spec.maxBands });
  const ticks = TICK_HOURS.map((h) => g.xForHours(h));
  const bands: SceneBand[] = g.bands.map((b) => ({ dim: b.dim, path: b.path, fill: DIMENSION_META[b.dim].hue, share: b.share, lastX: b.lastX, lastY: b.lastY }));
  const endLabels: EndLabel[] = [];
  if (spec.endLabels && hasData) {
    const top = [...bands].sort((a, b) => b.share - a.share).slice(0, spec.endLabels);
    // keep stack order for the labels so hairlines never cross
    const ordered = bands.filter((b) => top.includes(b));
    const texts = ordered.map((b) => `${LABELS[b.dim]} ${Math.round(b.share * 100)}%`);
    const widest = Math.max(...texts.map((t) => t.length * 6.4 + 2));
    const x = Math.min(g.lateX + 10, width - widest);
    const lineH = 14;
    const y0 = cy - ((ordered.length - 1) * lineH) / 2;
    ordered.forEach((b, i) => endLabels.push({ dim: b.dim, text: texts[i], x, y: y0 + i * lineH, fromX: b.lastX, fromY: b.lastY }));
  }
  return { width, height, cy, bands, outline: g.outline, endX: g.endX, lateX: g.lateX, ticks, strokeBands: height >= 40, endLabels, tickText: longevityTickText(input), empty: !hasData };
}


/**
 * The same thumbnail as a standalone SVG string with literal colours, for places that cannot
 * read our stylesheet: the share card is rasterised by Satori.
 */
export function trailThumbSvg(input: TrailInput, size: TrailThumbSize, colours = { ink: '#1c1a17', porcelain: '#f3f0ea', stone2: '#c9c2b6' }): string {
  const sc = thumbScene(input, size);
  const bands = (opacity: number, clip: string) =>
    `<g clip-path="url(#${clip})" opacity="${opacity}">${sc.bands
      .map((b) => `<path d="${b.path}" fill="${b.fill}"${sc.strokeBands ? ` stroke="${colours.porcelain}" stroke-width="1"` : ''}/>`)
      .join('')}<path d="${sc.outline}" fill="none" stroke="${colours.ink}" stroke-opacity="0.22" stroke-width="1"/></g>`;
  const ruler = `<g stroke="${colours.stone2}" stroke-width="1"><line x1="0" x2="${sc.width}" y1="${sc.cy}" y2="${sc.cy}"${sc.empty ? ' stroke-dasharray="2 4"' : ''}/>${sc.ticks
    .map((x) => `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${sc.cy - 2}" y2="${sc.cy + 3}"/>`)
    .join('')}</g>`;
  const defs = `<defs><clipPath id="s"><rect x="-1" y="-1" width="${(sc.endX + 1).toFixed(1)}" height="${sc.height + 2}"/></clipPath><clipPath id="l"><rect x="${sc.endX.toFixed(1)}" y="-1" width="${(sc.width - sc.endX + 1).toFixed(1)}" height="${sc.height + 2}"/></clipPath></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sc.width}" height="${sc.height}" viewBox="0 0 ${sc.width} ${sc.height}">${ruler}${sc.empty ? '' : defs + bands(1, 's') + bands(0.45, 'l')}</svg>`;
}
