import { describe, expect, it } from 'vitest';
import { buildTrail, describeTrail, mixAt, projectionAt, TRAIL_MAX_HOURS, xScale, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META } from '@/lib/scent/vocab';

const sauvage: TrailInput = {
  character: {
    overall: { fresh: 0.8, spicy: 0.5, woody: 0.5, warm: 0.3 },
    opening: { fresh: 0.9, spicy: 0.6, green: 0.2 },
    heart: { fresh: 0.5, spicy: 0.5, woody: 0.4 },
    drydown: { woody: 0.7, warm: 0.5, clean: 0.3 },
  },
  longevityHrs: 8,
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
  it('peaks after the first minutes, declines, and fades at the longevity', () => {
    expect(projectionAt(sauvage, 0)).toBeLessThan(projectionAt(sauvage, 0.25));
    expect(projectionAt(sauvage, 0.25)).toBeCloseTo(3.6, 1);
    expect(projectionAt(sauvage, 3)).toBeCloseTo(2.4, 1);
    expect(projectionAt(sauvage, 8)).toBeGreaterThan(0.5);
    expect(projectionAt(sauvage, 12)).toBe(0);
  });

  it('copes with missing data', () => {
    const p = projectionAt({ ...sauvage, projectionOpening: null, projectionLater: null, longevityHrs: null }, 1);
    expect(p).toBeGreaterThan(0);
    expect(Number.isFinite(p)).toBe(true);
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
    for (const b of g.bands) expect(b.path).toMatch(/^M[\d.,-]+ C/);
  });

  it('orders bands bright to deep', () => {
    const g = buildTrail(sauvage, 600, 120);
    const order = g.bands.map((b) => b.dim);
    expect(order.indexOf('fresh')).toBeLessThan(order.indexOf('woody'));
  });

  it('drops dimensions below the minimum share', () => {
    const g = buildTrail(sauvage, 300, 60, { minShare: 0.5 });
    expect(g.bands.length).toBeLessThanOrEqual(1);
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
