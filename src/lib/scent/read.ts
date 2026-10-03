/**
 * Turning numbers into plain language. Every function here prefers ranges and words over
 * false precision: community data about skin and noses is soft, and we say so.
 */
import { DIMENSION_META, LONGEVITY_BUCKETS, PROJECTION_LEVELS, type Dimension } from './vocab';
import type { Vec } from '@/lib/data/types';

export function topDims(v: Vec, k = 3, min = 0.12): Dimension[] {
  return (Object.entries(v) as Array<[Dimension, number]>)
    .filter(([, x]) => (x ?? 0) >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([d]) => d);
}

export function dimLabels(ds: Dimension[]) {
  return ds.map((d) => DIMENSION_META[d].label);
}

/** Percentile (0..1) in hours from bucketed longevity counts. */
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

/** "7–10 hours": the middle half of what people report, rounded so it never looks precise. */
export function longevityRange(hist: number[]): { lo: number; hi: number; text: string } | null {
  const lo = longevityPercentile(hist, 0.3);
  const hi = longevityPercentile(hist, 0.72);
  if (lo === null || hi === null) return null;
  const a = Math.max(0.5, Math.round(lo));
  let b = Math.round(hi);
  if (b <= a) b = a + 1;
  if (a < 1.5 && b <= 2) return { lo: a, hi: b, text: 'under 2 hours' };
  const plus = b >= 12 ? '+' : '';
  return { lo: a, hi: b, text: `${a}–${Math.min(b, 12)}${plus} hours` };
}

export function projectionLabel(avg: number | null): string {
  if (avg === null) return 'Not enough votes';
  const lvl = PROJECTION_LEVELS[Math.min(4, Math.max(0, Math.round(avg) - 1))];
  return lvl.label;
}

export function histAvg(h: number[]): number | null {
  const t = h.reduce((a, b) => a + b, 0);
  return t ? h.reduce((s, c, i) => s + c * (i + 1), 0) / t : null;
}

/** How settled is a community number? Shown next to every aggregate. */
export function confidence(n: number): { label: string; level: 0 | 1 | 2 | 3 } {
  if (n < 5) return { label: 'Too few votes to say', level: 0 };
  if (n < 30) return { label: 'Early read', level: 1 };
  if (n < 250) return { label: 'Taking shape', level: 2 };
  return { label: 'Settled', level: 3 };
}

/**
 * Rating spread -> plain words. Helps blind buyers more than another decimal.
 * Calibrated against the catalogue (standard deviations run 1.5 to 2.5 on a 1-10 scale), so the
 * labels only appear at the edges: the middle gets no label at all. "Divisive" also needs the
 * histogram to actually have two humps, not just a wide one.
 */
export function divisiveness(spread: number | null, count: number, hist?: number[] | null): { label: string; detail: string } | null {
  if (spread === null || count < 50) return null;
  if (spread <= 1.6) return { label: 'Broad agreement', detail: 'Most people land within a point of the average.' };
  if (spread >= 2.1 && (!hist || isBimodal(hist))) return { label: 'Divisive', detail: 'People love it or really don’t. Sample before buying a bottle.' };
  return null;
}

/** Two local peaks at least three points apart, each a real share of the votes. */
export function isBimodal(hist: number[]): boolean {
  const max = Math.max(...hist, 1);
  const peaks: number[] = [];
  for (let i = 0; i < hist.length; i++) {
    const l = hist[i - 1] ?? 0;
    const r = hist[i + 1] ?? 0;
    if (hist[i] >= l && hist[i] >= r && hist[i] >= max * 0.25 && (hist[i] > l || hist[i] > r)) peaks.push(i);
  }
  for (let a = 0; a < peaks.length; a++) for (let b = a + 1; b < peaks.length; b++) if (peaks[b] - peaks[a] >= 3) return true;
  return false;
}

export function seasonsLine(wear: Record<string, number>): string | null {
  const order = ['spring', 'summer', 'autumn', 'winter'];
  const good = order.filter((s) => (wear[s] ?? 0) >= 0.55);
  if (!good.length) return null;
  if (good.length === 4) return 'Any season';
  const names: Record<string, string> = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
  const list = good.map((g) => names[g]);
  const s = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0];
  return s[0].toUpperCase() + s.slice(1);
}

export function timeLine(wear: Record<string, number>): string | null {
  const d = wear.day ?? 0;
  const n = wear.night ?? 0;
  if (!d && !n) return null;
  if (d >= 0.55 && n >= 0.55) return 'day or night';
  return n > d ? 'better at night' : 'better by day';
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function relativeDays(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const y = Math.round(days / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}

export { DIMENSION_META };
