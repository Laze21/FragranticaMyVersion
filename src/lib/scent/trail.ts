/**
 * The Trail: our signature visualisation.
 *
 * Sillage literally means "wake": the trail a fragrance leaves. The Trail draws it.
 *   x  time on skin, 0 -> 14h, square-root scaled so the opening gets room
 *   thickness  projection at that moment (community data), so it swells and thins
 *   bands      character mix at that moment (fresh, woody, sweet ...), blended between phases
 *   length     ends where typical longevity ends
 *
 * The same geometry renders as a 120px thumbnail on cards (recognisable silhouette) and as a
 * full interactive chart on the fragrance page. Pure functions; no DOM.
 */
import { DIMENSIONS, type Dimension } from './vocab';
import type { Character, Vec } from '@/lib/data/types';

export const TRAIL_MAX_HOURS = 14;

export interface TrailInput {
  character: Character;
  longevityHrs: number | null;
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
}

export interface TrailGeometry {
  width: number;
  height: number;
  bands: TrailBand[];
  outline: string;
  /** x position for an hour value */
  xForHours: (h: number) => number;
  endX: number;
  samples: Array<{ hours: number; x: number; half: number; mix: Vec }>;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function xScale(width: number, padLeft = 0) {
  return (h: number) => padLeft + (width - padLeft) * Math.sqrt(Math.min(TRAIL_MAX_HOURS, Math.max(0, h)) / TRAIL_MAX_HOURS);
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

/** Projection (1..5) over time. Skin-level tail fades out at typical longevity. */
export function projectionAt(input: TrailInput, hours: number): number {
  const p0 = input.projectionOpening ?? 2.6;
  const p1 = input.projectionLater ?? Math.max(1, p0 - 1);
  const L = Math.max(0.75, input.longevityHrs ?? 6);
  if (hours <= 0.25) return p0 * (0.82 + 0.72 * hours); // the first seconds after spraying
  if (hours <= 3) return p0 + (p1 - p0) * smoothstep(0.25, 3, hours);
  const tail = Math.max(1, Math.min(p1, 1.4));
  if (hours <= L) return p1 + (tail - p1) * smoothstep(3, L, hours);
  return tail * (1 - smoothstep(L, L * 1.12 + 0.3, hours));
}

export function buildTrail(input: TrailInput, width: number, height: number, opts: { minShare?: number; samples?: number } = {}): TrailGeometry {
  const x = xScale(width);
  const L = Math.max(0.75, input.longevityHrs ?? 6);
  const end = Math.min(TRAIL_MAX_HOURS, L * 1.12 + 0.3);
  const N = opts.samples ?? 56;
  const maxHalf = height / 2;
  const samples: TrailGeometry['samples'] = [];
  for (let i = 0; i <= N; i++) {
    // sample densely near the start (sqrt-time)
    const hours = end * (i / N) ** 2;
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
  const dims = DIMENSIONS.filter((d) => (totals[d] ?? 0) / grand >= minShare);
  // Order: bright/volatile families at the top, deep/base families at the bottom, so the
  // layering reads like a cross-section of the scent.
  const ORDER: Dimension[] = ['fresh', 'green', 'clean', 'fruity', 'floral', 'spicy', 'powdery', 'creamy', 'sweet', 'warm', 'woody', 'earthy', 'smoky'];
  dims.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

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

  const bands: TrailBand[] = dims.map((dim, i) => {
    const top = samples.map((s, j) => [s.x, tops[i][j]] as [number, number]);
    const bot = samples.map((s, j) => [s.x, bots[i][j]] as [number, number]).reverse();
    let best = 0;
    let bestJ = 0;
    samples.forEach((_, j) => {
      const t = bots[i][j] - tops[i][j];
      if (t > best && samples[j].x > width * 0.12) {
        best = t;
        bestJ = j;
      }
    });
    return {
      dim,
      path: `M${fmt(top[0])} ${smooth(top)} L${fmt(bot[0])} ${smooth(bot)} Z`,
      share: (totals[dim] ?? 0) / grand,
      labelX: samples[bestJ].x,
      labelY: (tops[i][bestJ] + bots[i][bestJ]) / 2,
      labelRoom: best,
    };
  });

  const upper = samples.map((s) => [s.x, cy - s.half] as [number, number]);
  const lower = samples.map((s) => [s.x, cy + s.half] as [number, number]).reverse();
  return {
    width,
    height,
    bands,
    outline: `M${fmt(upper[0])} ${smooth(upper)} L${fmt(lower[0])} ${smooth(lower)} Z`,
    xForHours: x,
    endX: x(end),
    samples,
  };
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
