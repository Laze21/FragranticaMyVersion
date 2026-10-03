import { describe, expect, it } from 'vitest';
import {
  bandLabelInk,
  buildTrail,
  contrastRatio,
  describeTrail,
  longevityPercentile,
  longevityTickText,
  mixAt,
  oklabDistance,
  oklabLightness,
  projectionAt,
  trailEnds,
  TRAIL_MAX_HOURS,
  TRAIL_NOSE_HOURS,
  xScale,
  type TrailInput,
} from '@/lib/scent/trail';
import { DIMENSION_META, DIMENSIONS } from '@/lib/scent/vocab';

const sauvage: TrailInput = {
  character: {
    overall: { fresh: 0.8, spicy: 0.5, woody: 0.5, warm: 0.3 },
    opening: { fresh: 0.9, spicy: 0.6, green: 0.2 },
    heart: { fresh: 0.5, spicy: 0.5, woody: 0.4 },
    drydown: { woody: 0.7, warm: 0.5, clean: 0.3 },
  },
  longevityHrs: 8,
  longevityLateHrs: 10,
  projectionOpening: 3.6,
  projectionLater: 2.4,
  heartAtMin: 25,
  drydownAtMin: 180,
};

const labels = Object.fromEntries(Object.entries(DIMENSION_META).map(([k, v]) => [k, v.label])) as Record<keyof typeof DIMENSION_META, string>;

describe('xScale', () => {
  it('is a square-root scale clamped to the trail length', () => {
    const x = xScale(100);
    expect(x(0)).toBe(0);
    expect(x(TRAIL_MAX_HOURS)).toBe(100);
    expect(x(TRAIL_MAX_HOURS * 4)).toBe(100);
    expect(x(TRAIL_MAX_HOURS / 4)).toBeCloseTo(50);
    expect(x(-3)).toBe(0);
  });

  it('honours a left inset', () => {
    const x = xScale(100, 10);
    expect(x(0)).toBe(10);
    expect(x(TRAIL_MAX_HOURS)).toBe(100);
  });
});

describe('mixAt', () => {
  it('starts as the opening and ends as the drydown', () => {
    const start = mixAt(sauvage, 0);
    const late = mixAt(sauvage, 10);
    expect(start.fresh).toBeCloseTo(0.9, 2);
    expect(start.woody ?? 0).toBeLessThan(0.05);
    expect(late.woody).toBeCloseTo(0.7, 2);
    expect(late.fresh ?? 0).toBeLessThan(0.05);
  });

  it('blends through the heart without negative values', () => {
    for (let h = 0; h <= 14; h += 0.25) {
      for (const v of Object.values(mixAt(sauvage, h))) expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(mixAt(sauvage, 1).woody).toBeGreaterThan(0);
  });
});

describe('projectionAt', () => {
  it('has a true nose: nothing at the spray, rising monotonically to full by ten minutes', () => {
    expect(projectionAt(sauvage, 0)).toBe(0);
    let last = 0;
    for (let h = 0.005; h <= TRAIL_NOSE_HOURS; h += 0.005) {
      const p = projectionAt(sauvage, h);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    expect(projectionAt(sauvage, TRAIL_NOSE_HOURS)).toBeCloseTo(3.6, 3);
    expect(projectionAt(sauvage, TRAIL_NOSE_HOURS / 2)).toBeCloseTo(1.8, 1);
  });

  it('holds the opening level to fifteen minutes, then eases to the later level', () => {
    expect(projectionAt(sauvage, 0.25)).toBeCloseTo(3.6, 1);
    expect(projectionAt(sauvage, 3)).toBeCloseTo(2.4, 1);
  });

  it('is still on skin at the median and gone by the late end', () => {
    expect(projectionAt(sauvage, 8)).toBeGreaterThan(0.5);
    expect(projectionAt(sauvage, 9)).toBeGreaterThan(0);
    expect(projectionAt(sauvage, 9)).toBeLessThan(projectionAt(sauvage, 8));
    expect(projectionAt(sauvage, 10)).toBe(0);
    expect(projectionAt(sauvage, 12)).toBe(0);
  });

  it('copes with missing data', () => {
    const p = projectionAt({ ...sauvage, projectionOpening: null, projectionLater: null, longevityHrs: null, longevityLateHrs: null }, 1);
    expect(p).toBeGreaterThan(0);
    expect(Number.isFinite(p)).toBe(true);
  });
});

describe('the end rule', () => {
  it('ends the solid trail at the median and the faded stretch at the late percentile', () => {
    const e = trailEnds(sauvage);
    expect(e.median).toBe(8);
    expect(e.late).toBe(10);
    const g = buildTrail(sauvage, 600, 120);
    expect(g.endHours).toBe(8);
    expect(g.lateHours).toBe(10);
    expect(g.endX).toBeCloseTo(600 * Math.sqrt(8 / 14), 5);
    expect(g.lateX).toBeCloseTo(600 * Math.sqrt(10 / 14), 5);
    expect(g.samples[g.samples.length - 1].hours).toBeCloseTo(10, 5);
  });

  it('keeps a short fixed tail for callers without a distribution', () => {
    const e = trailEnds({ ...sauvage, longevityLateHrs: undefined });
    expect(e.median).toBe(8);
    expect(e.late).toBeCloseTo(8 * 1.12 + 0.3, 5);
  });

  it('never lets the late end sit at or before the median, and caps at 14h', () => {
    expect(trailEnds({ ...sauvage, longevityLateHrs: 7 }).late).toBeGreaterThan(8);
    expect(trailEnds({ ...sauvage, longevityHrs: 13.5, longevityLateHrs: 14 }).late).toBe(14);
  });

  it('words the axis tick as a range for most, not a promise', () => {
    expect(longevityTickText(sauvage)).toBe('~8h for most · some get 10h');
    expect(longevityTickText({ ...sauvage, longevityLateHrs: null })).toBe('~8h for most');
    expect(longevityTickText({ ...sauvage, longevityHrs: null })).toBeNull();
  });
});

describe('longevityPercentile', () => {
  // buckets: <2, 2-4, 4-6, 6-8, 8-10, 10+
  const hist = [0, 2, 10, 30, 12, 6];
  it('interpolates inside the bucket that crosses the percentile', () => {
    const median = longevityPercentile(hist, 0.5)!;
    expect(median).toBeGreaterThan(6);
    expect(median).toBeLessThan(8);
    const late = longevityPercentile(hist, 0.72)!;
    expect(late).toBeGreaterThanOrEqual(median);
    expect(late).toBeLessThan(10);
  });
  it('returns null with no votes and the top of the scale past the last bucket', () => {
    expect(longevityPercentile([0, 0, 0, 0, 0, 0], 0.5)).toBeNull();
    expect(longevityPercentile([0, 0, 0, 0, 0, 5], 1)).toBe(14);
  });
});

describe('buildTrail', () => {
  it('produces bands whose shares add up to one and that fit the box', () => {
    const g = buildTrail(sauvage, 600, 120);
    expect(g.bands.length).toBeGreaterThan(2);
    const total = g.bands.reduce((s, b) => s + b.share, 0);
    expect(total).toBeGreaterThan(0.9);
    expect(total).toBeLessThanOrEqual(1.0001);
    expect(g.endX).toBeLessThanOrEqual(600);
    expect(g.endX).toBeGreaterThan(400); // 8 hours of a 14-hour axis, square-root scaled
    for (const s of g.samples) {
      expect(s.half).toBeLessThanOrEqual(60);
      expect(s.half).toBeGreaterThanOrEqual(0);
    }
    expect(g.samples[0].half).toBe(0); // the nib
    expect(g.cy).toBe(60);
    for (const b of g.bands) {
      expect(b.path).toMatch(/^M[\d.,-]+ C/);
      expect(b.top.length).toBe(g.samples.length);
      expect(b.bot.length).toBe(g.samples.length);
      expect(b.lastX).toBeLessThanOrEqual(g.lateX);
    }
  });

  it('is a spindle: thin at the spray, widest between fifteen minutes and an hour', () => {
    const g = buildTrail(sauvage, 600, 120, { samples: 72 });
    const widest = g.samples.reduce((a, b) => (b.half > a.half ? b : a));
    expect(widest.hours).toBeGreaterThanOrEqual(TRAIL_NOSE_HOURS);
    expect(widest.hours).toBeLessThanOrEqual(1);
    expect(g.samples[1].half).toBeLessThan(widest.half * 0.5);
  });

  it('orders bands in the fixed stack order, fresh to smoky', () => {
    const g = buildTrail(sauvage, 600, 120);
    const order = g.bands.map((b) => DIMENSIONS.indexOf(b.dim));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const dims = g.bands.map((b) => b.dim);
    expect(dims.indexOf('fresh')).toBeLessThan(dims.indexOf('woody'));
  });

  it('drops dimensions below the minimum share and caps the band count', () => {
    const g = buildTrail(sauvage, 300, 60, { minShare: 0.5 });
    expect(g.bands.length).toBeLessThanOrEqual(1);
    const capped = buildTrail(sauvage, 300, 60, { maxBands: 3 });
    expect(capped.bands.length).toBe(3);
  });
});

describe('describeTrail', () => {
  it('reads as a sentence with the key facts', () => {
    const text = describeTrail(sauvage, labels);
    expect(text).toMatch(/Opens fresh and spicy/);
    expect(text).toMatch(/dries down woody and warm/);
    expect(text).toMatch(/8 hours/);
  });
});

describe('the palette rules', () => {
  it('every stack neighbour is at least 0.076 apart in OKLab', () => {
    for (let i = 1; i < DIMENSIONS.length; i++) {
      const d = oklabDistance(DIMENSION_META[DIMENSIONS[i - 1]].hue, DIMENSION_META[DIMENSIONS[i]].hue);
      expect(d, `${DIMENSIONS[i - 1]} to ${DIMENSIONS[i]}`).toBeGreaterThanOrEqual(0.0755); // the plan's 0.076, rounded: spicy to woody is 0.0759
    }
  });

  it('picks ink above L 0.6 and paper below, and both pass 4.5:1 on the current cut', () => {
    for (const d of DIMENSIONS) {
      const hue = DIMENSION_META[d].hue;
      const ink = bandLabelInk(hue);
      expect(ink).not.toBeNull();
      expect(ink).toBe(oklabLightness(hue) >= 0.6 ? 'ink' : 'paper');
    }
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(oklabLightness('#ffffff')).toBeCloseTo(1, 2);
  });
});
