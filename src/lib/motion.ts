/**
 * Motion tokens for JavaScript. CSS owns the values (src/styles/tokens.css); anything that
 * animates in JS (the mist canvas, the 3D cap and pump clips, the diary press) reads them from
 * here so the product's feel can be changed from one file, and so reduced motion zeroes every
 * duration in CSS and JS at once.
 *
 * Reads are cached per document; a font or theme swap never changes a duration, and the reduced
 * motion query is live through matchMedia.
 */

export type DurationToken = 'instant' | 'quick' | 'exit' | 'standard' | 'slow' | 'signature';
export type EaseToken = 'evaporate' | 'settle' | 'standard' | 'exit';

/* Server renders and tests have no computed styles; these mirror tokens.css so logic that only
   needs an order of magnitude (timeouts, stagger) stays correct without a DOM. */
const DURATION_DEFAULTS: Record<DurationToken, number> = {
  instant: 90,
  quick: 160,
  exit: 160,
  standard: 240,
  slow: 420,
  signature: 900,
};
const EASE_DEFAULTS: Record<EaseToken, string> = {
  evaporate: 'cubic-bezier(0.2, 0.7, 0.1, 1)',
  settle: 'cubic-bezier(0.34, 1.32, 0.5, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
};

let durations: Record<DurationToken, number> | null = null;
let eases: Record<EaseToken, string> | null = null;
let reduceQuery: MediaQueryList | null = null;

const hasDom = () => typeof window !== 'undefined' && typeof document !== 'undefined';

function readRoot(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** "240ms" or "0.24s" to milliseconds. Anything unparseable falls back to the default. */
function parseMs(raw: string, fallback: number): number {
  const m = /^(-?\d*\.?\d+)\s*(ms|s)?$/.exec(raw);
  if (!m) return fallback;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return fallback;
  return m[2] === 's' ? n * 1000 : n;
}

function loadDurations(): Record<DurationToken, number> {
  if (durations) return durations;
  if (!hasDom()) return DURATION_DEFAULTS;
  const out = { ...DURATION_DEFAULTS };
  for (const key of Object.keys(out) as DurationToken[]) {
    out[key] = parseMs(readRoot(`--d-${key}`), DURATION_DEFAULTS[key]);
  }
  durations = out;
  return out;
}

function loadEases(): Record<EaseToken, string> {
  if (eases) return eases;
  if (!hasDom()) return EASE_DEFAULTS;
  const out = { ...EASE_DEFAULTS };
  for (const key of Object.keys(out) as EaseToken[]) {
    out[key] = readRoot(`--ease-${key}`) || EASE_DEFAULTS[key];
  }
  eases = out;
  return out;
}

/** True when the viewer asked for reduced motion. Live: not cached across a settings change. */
export function reducedMotion(): boolean {
  if (!hasDom() || typeof window.matchMedia !== 'function') return false;
  reduceQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reduceQuery.matches;
}

/**
 * A duration in milliseconds. Under reduced motion every token is 0, matching the CSS, so a
 * `setTimeout(fn, duration('slow'))` lands on the final state in the same frame.
 */
export function duration(token: DurationToken): number {
  if (reducedMotion()) return 0;
  return loadDurations()[token];
}

/** The CSS easing string for a token, for Web Animations API keyframes and canvas interpolation. */
export function ease(token: EaseToken): string {
  return loadEases()[token];
}

/**
 * The same easing as a function of t in [0, 1], for rAF loops that cannot hand the curve to CSS
 * (the mist particles, the Trail rebalance lerp). Solves the cubic bezier by bisection on x.
 */
export function easeFn(token: EaseToken): (t: number) => number {
  const m = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(ease(token));
  if (!m) return (t) => t;
  const [x1, y1, x2, y2] = m.slice(1, 5).map(Number);
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  };
}

/** Drop the cache, for tests and for a stylesheet that is swapped at runtime. */
export function resetMotionCache(): void {
  durations = null;
  eases = null;
}
