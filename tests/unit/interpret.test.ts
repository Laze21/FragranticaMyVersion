import { describe, expect, it } from 'vitest';
import { interpret, looksNatural, type Vocabulary } from '@/lib/search/interpret';

const vocab: Vocabulary = {
  notes: [
    { slug: 'vanilla', name: 'Vanilla', aliases: ['vanille'], family: 'gourmand' },
    { slug: 'tobacco', name: 'Tobacco', aliases: ['tobacco leaf'], family: 'smoky' },
    { slug: 'bergamot', name: 'Bergamot', aliases: [], family: 'citrus' },
    { slug: 'iris', name: 'Iris', aliases: ['orris'], family: 'floral' },
    { slug: 'sea-salt', name: 'Sea salt', aliases: ['salt'], family: 'marine' },
  ],
  brands: [
    { slug: 'dior', name: 'Dior' },
    { slug: 'le-labo', name: 'Le Labo' },
  ],
  fragrances: [
    { slug: 'dior-sauvage', name: 'Sauvage', brandName: 'Dior' },
    { slug: 'bleu-de-chanel-edp', name: 'Bleu de Chanel', brandName: 'Chanel' },
    { slug: 'santal-33', name: 'Santal 33', brandName: 'Le Labo' },
  ],
};

describe('interpret', () => {
  it('turns an include and an exclusion into note filters', () => {
    const r = interpret('vanilla fragrance without tobacco', vocab);
    expect(r.filters.include).toEqual(['vanilla']);
    expect(r.filters.exclude).toEqual(['tobacco']);
    expect(r.understood.map((u) => u.label)).toEqual(expect.arrayContaining(['Vanilla', 'No tobacco']));
    expect(r.leftover).toBe('');
  });

  it('reads longevity and character', () => {
    const r = interpret('fresh fragrance that lasts 8+ hours', vocab);
    expect(r.filters.dims).toContain('fresh');
    expect(r.filters.longevityMin).toBe(8);
  });

  it('finds a reference fragrance and the "less common" intent', () => {
    const r = interpret('something similar to Bleu de Chanel but less common', vocab);
    expect(r.filters.similarTo).toBe('bleu-de-chanel-edp');
    expect(r.filters.sort).toBe('lesser-known');
  });

  it('excludes a note family', () => {
    const r = interpret("summer fragrance that isn't citrus-heavy", vocab);
    expect(r.filters.seasons).toContain('summer');
    expect(r.filters.excludeFamilies).toContain('citrus');
    expect(r.filters.include).toEqual([]);
  });

  it('reads an occasion and a price ceiling', () => {
    const r = interpret('woody date-night fragrance under $100', vocab);
    expect(r.filters.dims).toContain('woody');
    expect(r.filters.occasions).toContain('date');
    expect(r.filters.priceMax).toBe(100);
  });

  it('matches aliases and multi-word notes', () => {
    const r = interpret('orris and sea salt', vocab);
    expect(r.filters.include).toEqual(expect.arrayContaining(['iris', 'sea-salt']));
  });

  it('keeps unknown words as a plain query', () => {
    const r = interpret('kvist', vocab);
    expect(r.filters.q).toBe('kvist');
    expect(r.understood).toEqual([]);
  });

  it('never includes a note it also excludes', () => {
    const r = interpret('vanilla without vanilla', vocab);
    expect(r.filters.exclude).toEqual(['vanilla']);
    expect(r.filters.include).toEqual([]);
  });
});

describe('looksNatural', () => {
  it('spots sentences and leaves names alone', () => {
    expect(looksNatural('vanilla without tobacco')).toBe(true);
    expect(looksNatural('Sauvage')).toBe(false);
    expect(looksNatural('a very long fragrance name here')).toBe(true);
  });
});
