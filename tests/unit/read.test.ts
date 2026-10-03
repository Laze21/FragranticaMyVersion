import { describe, expect, it } from 'vitest';
import { medianHours } from '@/lib/data/stats';
import { confidence, divisiveness, formatCount, longevityRange, projectionLabel, relativeDays, seasonsLine } from '@/lib/scent/read';

describe('medianHours', () => {
  it('interpolates inside the bucket that crosses the midpoint', () => {
    // buckets: <2, 2-4, 4-6, 6-8, 8-10, 10+
    expect(medianHours([0, 0, 10, 0, 0, 0])).toBeCloseTo(5);
    expect(medianHours([0, 0, 0, 20, 20, 0])).toBeCloseTo(8);
    expect(medianHours([10, 0, 0, 0, 0, 10])).toBeCloseTo(2);
  });
  it('is zero with no votes', () => {
    expect(medianHours([0, 0, 0, 0, 0, 0])).toBe(0);
  });
});

describe('plain-language readers', () => {
  it('turns a longevity histogram into a range', () => {
    const r = longevityRange([1, 2, 10, 30, 20, 4]);
    expect(r).not.toBeNull();
    expect(r!.lo).toBeLessThan(r!.hi);
    expect(r!.text).toMatch(/hours/);
  });
  it('names projection levels', () => {
    expect(projectionLabel(1.2)).toMatch(/skin/i);
    expect(projectionLabel(4.6)).toMatch(/room|arm/i);
  });
  it('shows sample-size confidence honestly', () => {
    expect(confidence(0).level).toBe(0);
    expect(confidence(3000).level).toBe(3);
    expect(confidence(3000).level).toBeGreaterThan(confidence(12).level);
  });
  it('calls out divisive ratings only with enough votes', () => {
    expect(divisiveness(2.8, 4)).toBeNull();
    expect(divisiveness(2.8, 400)).not.toBeNull();
    expect(divisiveness(0.4, 400)?.label).toMatch(/agreement/i);
    expect(divisiveness(2.8, 400)?.label).not.toMatch(/agreement/i);
  });
  it('summarises seasons', () => {
    expect(seasonsLine({ spring: 0.8, summer: 0.9, autumn: 0.2, winter: 0.1 })).toMatch(/summer/i);
    expect(seasonsLine({})).toBeNull();
  });
  it('formats counts for people', () => {
    expect(formatCount(950)).toBe('950');
    expect(formatCount(1500)).toMatch(/1[.,]5k|1\.5k|1,500/);
  });
  it('speaks about time relatively', () => {
    const now = Date.UTC(2026, 9, 3);
    expect(relativeDays(new Date(now - 86400000).toISOString(), now)).toMatch(/yesterday|1 day/i);
  });
});
