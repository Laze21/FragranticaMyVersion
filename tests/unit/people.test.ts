import { describe, expect, it } from 'vitest';
import { averageCharacter, housesWorkedWith, signatureTrail, yearsActive } from '@/lib/data/people';
import type { FragranceCard } from '@/lib/data/types';

function card(over: Partial<FragranceCard>): FragranceCard {
  return {
    id: over.slug ?? 'x',
    slug: 'x',
    name: 'X',
    brandSlug: 'h',
    brandName: 'House',
    concentration: null,
    releaseYear: null,
    status: 'current',
    style: null,
    priceBand: null,
    accent: '#999',
    poster: null,
    posterAlt: null,
    posterKind: 'illustration',
    posterCredit: null,
    posterLicense: null,
    posterSource: null,
    posterLayers: null,
    bottleHeightMm: null,
    blurData: null,
    ratingAvg: null,
    ratingCount: 0,
    reviewCount: 0,
    character: { overall: {}, opening: {}, heart: {}, drydown: {} },
    longevityHrs: null,
    projectionOpening: null,
    projectionLater: null,
    heartAtMin: 20,
    drydownAtMin: 150,
    ownCount: 0,
    trending: 0,
    includesBaseline: false,
    ...over,
  };
}

describe('signature vectors', () => {
  const a = card({
    slug: 'a',
    brandSlug: 'dior',
    brandName: 'Dior',
    releaseYear: 2015,
    longevityHrs: 8,
    projectionOpening: 4,
    projectionLater: 2,
    character: { overall: { fresh: 0.6, woody: 0.4 }, opening: { fresh: 0.9 }, heart: { fresh: 0.5, woody: 0.3 }, drydown: { woody: 0.7 } },
  });
  const b = card({
    slug: 'b',
    brandSlug: 'dior',
    brandName: 'Dior',
    releaseYear: 2011,
    longevityHrs: 6,
    projectionOpening: 3,
    projectionLater: 2,
    character: { overall: { woody: 0.8, powdery: 0.2 }, opening: { powdery: 0.4 }, heart: { woody: 0.6 }, drydown: { woody: 0.9 } },
  });
  const c = card({ slug: 'c', brandSlug: 'chanel', brandName: 'Chanel', releaseYear: 2020 });

  it('averages the overall character and drops the noise', () => {
    const v = averageCharacter([a, b]);
    expect(v.woody).toBeCloseTo(0.6);
    expect(v.fresh).toBeCloseTo(0.3);
    expect(v.powdery).toBeCloseTo(0.1);
    expect(v.floral).toBeUndefined();
  });

  it('draws one trail from a body of work with the median as its end', () => {
    const t = signatureTrail([a, b]);
    expect(t).not.toBeNull();
    expect(t!.longevityHrs).toBe(7);
    expect(t!.character.drydown.woody).toBeCloseTo(0.8);
    expect(t!.projectionOpening).toBeCloseTo(3.5);
  });

  it('has no trail to draw when nothing carries a character', () => {
    expect(signatureTrail([])).toBeNull();
    expect(signatureTrail([c])).toBeNull();
  });

  it('reads the years and the houses off the work', () => {
    expect(yearsActive([a, b, c])).toEqual({ from: 2011, to: 2020 });
    expect(yearsActive([card({})])).toBeNull();
    expect(housesWorkedWith([a, b, c]).map((h) => `${h.slug}:${h.count}`)).toEqual(['dior:2', 'chanel:1']);
  });
});
