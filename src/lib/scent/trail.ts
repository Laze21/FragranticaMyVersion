/**
 * The Trail: our signature visualisation.
 *
 * Sillage literally means "wake": the trail a fragrance leaves. The Trail draws it.
 *   x  time on skin, 0 -> 14h, square-root scaled so the opening gets room
 *   thickness  projection at that moment (community data), so it swells and thins
 *   bands      character mix at that moment (fresh, woody, sweet ...), blended between phases
 *   length     solid to the median longevity, then a faded stretch to where most people lose it
 *
 * One geometry at every size: a spindle, pointed at spray (the nose), widest between fifteen
 * minutes and an hour, tapering out. The logo mark, the favicon, the card thumbnails, the share
 * card and the full chart are all this function with different inputs. Pure functions; no DOM.
 */
import { DIMENSIONS, LONGEVITY_BUCKETS, type Dimension } from './vocab';
import type { Character, Vec } from '@/lib/data/types';

export const TRAIL_MAX_HOURS = 14;
/** The nose: projection rises from nothing to full over the first ten minutes. */
export const TRAIL_NOSE_HOURS = 0.17;

export interface TrailInput {
  character: Character;
  longevityHrs: number | null;
  /**
   * Where the faded stretch ends: the 72nd percentile of reported longevity ("some get 10h").
   * Optional so older callers keep working; without it the tail is a fixed fraction past the median.
   */
  longevityLateHrs?: number | null;
  projectionOpening: number | null; // 1..5
  projectionLater: number | null; // 1..5
  heartAtMin: number;
  drydownAtMin: number;
}

export interface TrailBand {
  dim: Dimension;
  path: string;
  /** share of the whole trail area, 0..1 */
  share: number;
  /** label anchor at the band's widest point */
  labelX: number;
  labelY: number;
  labelRoom: number;
  /** upper and lower edge per sample, so the chart can lerp between two geometries */
  top: number[];
  bot: number[];
  /** the last sample where the band is still visibly thick: where an end-label's hairline starts */
  lastX: number;
  lastY: number;
}

export interface TrailGeometry {
  width: number;
  height: number;
  /** the skin line: vertical centre of the spindle */
  cy: number;
  bands: TrailBand[];
  outline: string;
  /** x position for an hour value */
  xForHours: (h: number) => number;
  /** where the solid trail ends (median longevity) */
  endX: number;
  endHours: number;
  /** where the faded stretch ends */
  lateX: number;
  lateHours: number;
  samples: Array<{ hours: number; x: number; half: number; mix: Vec }>;
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function xScale(width: number, padLeft = 0) {
  return (h: number) => padLeft + (width - padLeft) * Math.sqrt(Math.min(TRAIL_MAX_HOURS, Math.max(0, h)) / TRAIL_MAX_HOURS);
}

/**
 * Percentile (0..1) in hours from bucketed longevity counts. Lives here, beside the geometry
 * that consumes it, so the trail module has no dependency on the reading helpers.
 */
export function longevityPercentile(hist: number[], p: number): number | null {
  const total = hist.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    const next = acc + hist[i];
    if (next >= total * p) {
      const b = LONGEVITY_BUCKETS[i];
      const within = hist[i] ? (total * p - acc) / hist[i] : 0.5;
      return b.lo + (b.hi - b.lo) * within;
    }
    acc = next;
  }
  return LONGEVITY_BUCKETS[LONGEVITY_BUCKETS.length - 1].hi;
}

/** The median longevity and where the faded stretch ends, as the geometry wants them. */
export function trailEnds(input: TrailInput): { median: number; late: number } {
  const median = Math.max(0.75, input.longevityHrs ?? 6);
  const given = input.longevityLateHrs ?? null;
  // Without a distribution, the tail is the old fixed overshoot, so older callers draw the same length.
  const late = given !== null && given > median ? given : median * 1.12 + 0.3;
  return { median, late: Math.min(TRAIL_MAX_HOURS, Math.max(median + 0.2, late)) };
}

/** Character mix at time t (hours), blending phase vectors around their transitions. */
export function mixAt(input: TrailInput, hours: number): Vec {
  const heartAt = input.heartAtMin / 60;
  const dryAt = Math.max(heartAt + 0.25, input.drydownAtMin / 60);
  const o = input.character.opening ?? {};
  const h = input.character.heart ?? {};
  const d = input.character.drydown ?? {};
  const w1 = smoothstep(heartAt * 0.5, heartAt * 1.5, hours);
  const w2 = smoothstep(dryAt * 0.7, dryAt * 1.3, hours);
  const out: Vec = {};
  for (const dim of DIMENSIONS) {
    const a = (o[dim] ?? 0) * (1 - w1) + (h[dim] ?? 0) * w1;
    const v = a * (1 - w2) + (d[dim] ?? 0) * w2;
    if (v > 0) out[dim] = v;
  }
  return out;
}

/**
 * Projection (1..5) over time. A true nose for the first ten minutes (nothing at the spray,
 * full by TRAIL_NOSE_HOURS), the opening level to fifteen minutes, easing to the later level by
 * three hours, a skin-level tail to the median longevity, then fading out by the late end.
 */
export function projectionAt(input: TrailInput, hours: number): number {
  const p0 = input.projectionOpening ?? 2.6;
  const p1 = input.projectionLater ?? Math.max(1, p0 - 1);
  const { median: L, late } = trailEnds(input);
  if (hours <= 0) return 0;
  if (hours <= TRAIL_NOSE_HOURS) return p0 * smoothstep(0, TRAIL_NOSE_HOURS, hours);
  if (hours <= 3) return p0 + (p1 - p0) * smoothstep(0.25, 3, hours);
  const tail = Math.max(1, Math.min(p1, 1.4));
  if (hours <= L) return p1 + (tail - p1) * smoothstep(3, L, hours);
  return tail * (1 - smoothstep(L, late, hours));
}

/** The fixed stack order, fresh at the top to smoky at the bottom; the palette is cut for it. */
export const BAND_ORDER: readonly Dimension[] = DIMENSIONS;

export interface BuildOpts {
  minShare?: number;
  samples?: number;
  /** cap on the number of bands (thumbnails keep the widest few) */
  maxBands?: number;
  /** left inset so the nose is not on the edge */
  padLeft?: number;
}

export function buildTrail(input: TrailInput, width: number, height: number, opts: BuildOpts = {}): TrailGeometry {
  const x = xScale(width, opts.padLeft ?? 0);
  const { median, late } = trailEnds(input);
  const N = opts.samples ?? 56;
  const maxHalf = height / 2;
  const samples: TrailGeometry['samples'] = [];
  for (let i = 0; i <= N; i++) {
    // sample densely near the start (sqrt-time)
    const hours = late * (i / N) ** 2;
    const p = projectionAt(input, hours);
    const half = (Math.max(0, p) / 5) * maxHalf * 0.96;
    samples.push({ hours, x: x(hours), half, mix: mixAt(input, hours) });
  }
  // the nib: the trail begins at a point (the nozzle)
  samples[0].half = 0;

  // Which dimensions matter across the whole trail?
  const totals: Partial<Record<Dimension, number>> = {};
  for (const s of samples) {
    const sum = Object.values(s.mix).reduce((a, b) => a + (b ?? 0), 0) || 1;
    for (const [k, v] of Object.entries(s.mix)) totals[k as Dimension] = (totals[k as Dimension] ?? 0) + ((v ?? 0) / sum) * s.half;
  }
  const grand = Object.values(totals).reduce((a, b) => a + (b ?? 0), 0) || 1;
  const minShare = opts.minShare ?? 0.035;
  let dims = DIMENSIONS.filter((d) => (totals[d] ?? 0) / grand >= minShare);
  if (opts.maxBands && dims.length > opts.maxBands) {
    dims = [...dims].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0)).slice(0, opts.maxBands);
  }
  dims.sort((a, b) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));

  const cy = height / 2;
  const tops: number[][] = dims.map(() => []);
  const bots: number[][] = dims.map(() => []);
  for (const s of samples) {
    const vals = dims.map((d) => s.mix[d] ?? 0);
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    let y = cy - s.half;
    vals.forEach((v, i) => {
      const thick = (v / sum) * s.half * 2;
      tops[i].push(y);
      y += thick;
      bots[i].push(y);
    });
  }

  const xs = samples.map((s) => s.x);
  const bands: TrailBand[] = dims.map((dim, i) => {
    let best = 0;
    let bestJ = 0;
    let lastJ = 0;
    samples.forEach((_, j) => {
      const t = bots[i][j] - tops[i][j];
      if (t > best && samples[j].x > width * 0.12) {
        best = t;
        bestJ = j;
      }
      if (t >= 0.75) lastJ = j;
    });
    return {
      dim,
      path: bandPath(xs, tops[i], bots[i]),
      share: (totals[dim] ?? 0) / grand,
      labelX: samples[bestJ].x,
      labelY: (tops[i][bestJ] + bots[i][bestJ]) / 2,
      labelRoom: best,
      top: tops[i],
      bot: bots[i],
      lastX: samples[lastJ].x,
      lastY: (tops[i][lastJ] + bots[i][lastJ]) / 2,
    };
  });

  const upper = samples.map((s) => [s.x, cy - s.half] as [number, number]);
  const lower = samples.map((s) => [s.x, cy + s.half] as [number, number]).reverse();
  return {
    width,
    height,
    cy,
    bands,
    outline: `M${fmt(upper[0])} ${smooth(upper)} L${fmt(lower[0])} ${smooth(lower)} Z`,
    xForHours: x,
    endX: x(median),
    endHours: median,
    lateX: x(late),
    lateHours: late,
    samples,
  };
}

/** A closed band from its upper and lower edges; the chart rebuilds these while rebalancing. */
export function bandPath(xs: number[], top: number[], bot: number[]): string {
  const up = xs.map((x, j) => [x, top[j]] as [number, number]);
  const down = xs.map((x, j) => [x, bot[j]] as [number, number]).reverse();
  return `M${fmt(up[0])} ${smooth(up)} L${fmt(down[0])} ${smooth(down)} Z`;
}

const fmt = (p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/** Catmull-Rom through points -> cubic Béziers (continues an existing path). */
function smooth(pts: Array<[number, number]>): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)} `;
  }
  return d.trim();
}

/** Plain-language description of a trail, used as the accessible name and in share cards. */
export function describeTrail(input: TrailInput, labels: Record<Dimension, string>): string {
  const top = (v: Vec, k = 2) =>
    Object.entries(v)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, k)
      .map(([d]) => labels[d as Dimension].toLowerCase());
  const opening = top(input.character.opening);
  const dry = top(input.character.drydown);
  const L = input.longevityHrs;
  const proj = (p: number | null) => (p === null ? 'unknown' : p >= 4 ? 'strong' : p >= 3 ? 'moderate' : p >= 2 ? 'close' : 'very close');
  const parts = [
    opening.length ? `Opens ${opening.join(' and ')}` : null,
    dry.length ? `dries down ${dry.join(' and ')}` : null,
    L ? `lasts about ${Math.round(L)} hours` : null,
    `projection ${proj(input.projectionOpening)} at first, ${proj(input.projectionLater)} later`,
  ].filter(Boolean);
  return parts.join('; ') + '.';
}

/** "~8h for most · some get 10h": the longevity tick's words, shared by chart, thumbs and the share card. */
export function longevityTickText(input: TrailInput): string | null {
  if (input.longevityHrs === null) return null;
  const { median, late } = trailEnds(input);
  const m = Math.round(median);
  const l = Math.round(late);
  if (input.longevityLateHrs == null || l <= m) return `~${m}h for most`;
  return `~${m}h for most · some get ${l}h`;
}

/* ---- colour helpers for the palette rules (pure, so they can be unit tested) ---- */

function channel(hex: string, i: number) {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
}
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const [r, g, b] = [0, 1, 2].map((i) => toLinear(channel(hex, i)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** OKLab coordinates of a #rrggbb colour (the space the palette table is cut in). */
export function oklab(hex: string): [number, number, number] {
  const [r, g, b] = [0, 1, 2].map((i) => toLinear(channel(hex, i)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** OKLab lightness of a #rrggbb colour (the L the band label rule reads). */
export function oklabLightness(hex: string): number {
  return oklab(hex)[0];
}

/** Euclidean distance in OKLab: the separation rule between stack neighbours. */
export function oklabDistance(a: string, b: string): number {
  const p = oklab(a);
  const q = oklab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export const INK = '#1c1a17';
export const PAPER = '#fcfaf6';

/**
 * Which solid ink a label on a band takes: ink when the band's OKLab L is at or above 0.6,
 * paper otherwise, never with alpha. Null when neither passes 4.5:1, so the chart moves that
 * band's label to the tail on porcelain instead.
 */
export function bandLabelInk(hue: string): 'ink' | 'paper' | null {
  const choice = oklabLightness(hue) >= 0.6 ? 'ink' : 'paper';
  const ratio = contrastRatio(hue, choice === 'ink' ? INK : PAPER);
  return ratio >= 4.5 ? choice : null;
}

/* ---- the mark ---- */

/**
 * The logo mark is a Trail, not a drawing of one: this geometry fed a canonical fragrance
 * (lasts 8h, most lose it by 10h, projects at arm's length then conversational, three bands).
 * Filled in ink at 38 / 62 / 100 percent from the top band down so it reads at 12px. The
 * favicon is this exported; the header, the chart caption and the share card render it live.
 */
export const MARK_INPUT: TrailInput = {
  character: {
    overall: {},
    // opening and heart share one mix so the nose is a clean point; the drydown turns it woody
    opening: { fresh: 0.55, woody: 0.3, warm: 0.15 },
    heart: { fresh: 0.55, woody: 0.3, warm: 0.15 },
    drydown: { fresh: 0.15, woody: 0.45, warm: 0.4 },
  },
  longevityHrs: 8,
  longevityLateHrs: 10,
  projectionOpening: 4,
  projectionLater: 2.5,
  heartAtMin: 30,
  drydownAtMin: 180,
};

export const MARK_FILLS = [0.38, 0.62, 1];

/** The mark's bands, fitted so the faded end lands on the right edge of the box. */
export function markGeometry(width = 40, height = 16, samples = 96) {
  // buildTrail lays 14h across the width; scale up so the 10h end sits at the edge instead.
  const probe = buildTrail(MARK_INPUT, width, height, { samples });
  const fitted = buildTrail(MARK_INPUT, (width * width) / probe.lateX, height, { samples });
  return { bands: fitted.bands.map((b, i) => ({ dim: b.dim, path: b.path, opacity: MARK_FILLS[i] ?? 1 })), outline: fitted.outline, endX: fitted.endX };
}
