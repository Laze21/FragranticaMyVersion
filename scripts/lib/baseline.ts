import type { BaselinePayload } from '../../src/lib/data/baseline';
import type { SeedFragrance } from '../../src/seed/types';
import { gaussian, rng } from './ids';

/**
 * Demo community sizes. Deliberately early-community numbers (hundreds, not thousands): the
 * figures are generated so the charts can be explored, and they should look like a young site,
 * not a mature one. "Settled" (250+) only appears on the biggest names; most pages read
 * "Taking shape" or "Early read", which exercises the honesty mechanics the product is built on.
 */
const TIER_SIZE = {
  huge: { ratings: 440, perf: 190 },
  large: { ratings: 260, perf: 110 },
  medium: { ratings: 120, perf: 52 },
  small: { ratings: 48, perf: 21 },
  new: { ratings: 7, perf: 4 },
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Expand a compact SeedCommunity block into plausible demo distributions. Deterministic. */
export function expandBaseline(f: SeedFragrance, month = 10): BaselinePayload {
  const c = f.community;
  const r = rng(f.slug);
  const size = TIER_SIZE[c.tier];
  const jitter = 0.75 + r() * 0.55;
  const nRatings = Math.max(3, Math.round(size.ratings * jitter));
  const nPerf = Math.max(2, Math.round(size.perf * jitter));

  // Ratings: a two-component mixture so "divisive" fragrances get a real second hump.
  const d = clamp(c.divisiveness, 0, 1);
  const pLow = 0.38 * d;
  const lowMean = Math.max(2, c.rating - 3.6);
  const hiMean = pLow > 0 ? (c.rating - pLow * lowMean) / (1 - pLow) : c.rating;
  const sd = 0.95 + 0.45 * d;
  const hist = new Array(10).fill(0);
  for (let i = 0; i < nRatings; i++) {
    const low = r() < pLow;
    const v = low ? lowMean + gaussian(r) * 1.2 : hiMean + gaussian(r) * sd;
    hist[clamp(Math.round(v), 1, 10) - 1]++;
  }
  const sub = (mean: number): [number, number] => {
    const n = Math.round(nRatings * (0.55 + r() * 0.2));
    return [Math.round(mean * n * (0.985 + r() * 0.03)), n];
  };

  // Longevity: lognormal around the median.
  const longevity = new Array(6).fill(0);
  const edges = [2, 4, 6, 8, 10];
  for (let i = 0; i < nPerf; i++) {
    const h = c.longevityHrs * Math.exp(gaussian(r) * 0.33);
    let b = edges.findIndex((e) => h < e);
    if (b === -1) b = 5;
    longevity[b]++;
  }
  const proj = (center: number) => {
    const out = new Array(5).fill(0);
    for (let i = 0; i < nPerf; i++) out[clamp(Math.round(center + gaussian(r) * 0.7), 1, 5) - 1]++;
    return out;
  };

  const wearVoters = Math.max(2, Math.round(nPerf * 0.85));
  const fits: Record<string, number> = {};
  const add = (obj: Record<string, number>) => {
    for (const [k, share] of Object.entries(obj)) {
      fits[k] = clamp(Math.round(wearVoters * clamp(share + (r() - 0.5) * 0.04, 0, 1)), 0, wearVoters);
    }
  };
  add(c.seasons);
  add(c.time);
  add(c.weather);
  add(c.occasions);

  const pVoters = Math.max(2, Math.round(nPerf * 0.62));
  const counts: Record<string, number> = {};
  for (const [slug, share] of Object.entries(c.perceived)) {
    counts[slug] = clamp(Math.round(pVoters * clamp(share + (r() - 0.5) * 0.03, 0, 1)), 0, pVoters);
  }
  const byPhase: BaselinePayload['perceived']['byPhase'] = {};
  for (const phase of ['opening', 'heart', 'drydown'] as const) {
    const slugs = c.strongestByPhase?.[phase] ?? [];
    if (!slugs.length) continue;
    const phaseVoters = Math.round(pVoters * 0.45);
    byPhase[phase] = Object.fromEntries(
      slugs.map((s, i) => [s, Math.round(phaseVoters * clamp((c.perceived[s] ?? 0.4) * (1 - i * 0.12) + 0.1, 0.05, 0.95))]),
    );
  }

  const ratingMean = hist.reduce((s, n, i) => s + n * (i + 1), 0) / nRatings;
  const appeal = clamp((ratingMean - 5) / 4, 0.1, 1.2);
  const own = Math.round(nRatings * (0.42 + 0.18 * appeal));
  const had = Math.round(nRatings * 0.16);
  const want = Math.round(nRatings * (0.22 + 0.3 * appeal));
  // Seasonal pull: October favours autumn-fitting fragrances. New releases get a novelty bump.
  const seasonal =
    month >= 9 && month <= 11 ? c.seasons.autumn : month <= 2 || month === 12 ? c.seasons.winter : month <= 5 ? c.seasons.spring : c.seasons.summer;
  const total = Math.round(own * (5 + r() * 6));
  const last30 = Math.round(own * (0.15 + 0.5 * seasonal) * (c.tier === 'new' ? 6 : 1) * (0.8 + r() * 0.4));

  return {
    label: 'Demo figures',
    ratings: {
      count: nRatings,
      hist,
      scent: sub(c.scent),
      performance: sub(c.performance),
      value: sub(c.value),
      originality: sub(c.originality),
    },
    performance: {
      votes: nPerf,
      longevity,
      projectionOpening: proj(c.projection),
      projectionLater: proj(c.projectionLater),
    },
    wear: { voters: wearVoters, fits },
    perceived: { voters: pVoters, counts, byPhase },
    character: { voters: Math.round(nPerf * 0.4) },
    collection: { own, had, want },
    wears: { total, last30 },
  };
}
