import { describe, expect, it } from 'vitest';
import { interpret, looksNatural, sentence, type Vocabulary } from '@/lib/search/interpret';

const vocab: Vocabulary = {
  notes: [
    { slug: 'vanilla', name: 'Vanilla', aliases: ['vanille'], family: 'gourmand' },
    { slug: 'tobacco', name: 'Tobacco', aliases: ['tobacco leaf'], family: 'smoky' },
    { slug: 'bergamot', name: 'Bergamot', aliases: [], family: 'citrus' },
    { slug: 'iris', name: 'Iris', aliases: ['orris'], family: 'floral' },
    { slug: 'sea-salt', name: 'Sea salt', aliases: ['salt'], family: 'marine' },
    { slug: 'oud', name: 'Oud', aliases: ['agarwood'], family: 'woody' },
  ],
  brands: [
    { slug: 'dior', name: 'Dior' },
    { slug: 'chanel', name: 'Chanel' },
    { slug: 'le-labo', name: 'Le Labo' },
    { slug: 'maison-francis-kurkdjian', name: 'Maison Francis Kurkdjian' },
  ],
  perfumers: [
    { slug: 'francois-demachy', name: 'François Demachy' },
    { slug: 'francis-kurkdjian', name: 'Francis Kurkdjian' },
    { slug: 'olivier-polge', name: 'Olivier Polge' },
  ],
  fragrances: [
    { slug: 'dior-sauvage', name: 'Sauvage', brandName: 'Dior' },
    { slug: 'bleu-de-chanel-edp', name: 'Bleu de Chanel', brandName: 'Chanel' },
    { slug: 'santal-33', name: 'Santal 33', brandName: 'Le Labo' },
  ],
};

const labels = (r: ReturnType<typeof interpret>) => r.understood.map((u) => u.label);

describe('interpret', () => {
  it('turns an include and an exclusion into note filters', () => {
    const r = interpret('vanilla fragrance without tobacco', vocab);
    expect(r.filters.include).toEqual(['vanilla']);
    expect(r.filters.exclude).toEqual(['tobacco']);
    expect(labels(r)).toEqual(expect.arrayContaining(['Vanilla', 'No tobacco']));
    expect(r.leftover).toBe('');
    expect(r.unread).toEqual([]);
  });

  it('reads longevity and character', () => {
    const r = interpret('fresh fragrance that lasts 8+ hours', vocab);
    expect(r.filters.dims).toContain('fresh');
    expect(r.filters.longevityMin).toBe(8);
    expect(r.unread).toEqual([]);
  });

  it('finds a reference fragrance and the "less common" intent', () => {
    const r = interpret('something similar to Bleu de Chanel but less common', vocab);
    expect(r.filters.similarTo).toBe('bleu-de-chanel-edp');
    expect(r.filters.sort).toBe('lesser-known');
    // "Chanel" inside the reference name is not a second filter on the house.
    expect(r.filters.brands).toEqual([]);
    expect(r.unread).toEqual([]);
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
    expect(r.unread).toEqual([]);
  });

  it('reads "cheap" as the two lowest price bands', () => {
    const r = interpret('something cheap for the office', vocab);
    expect(r.filters.priceBands).toEqual(['budget', 'accessible']);
    expect(r.filters.occasions).toContain('office');
  });

  it('matches aliases and multi-word notes', () => {
    const r = interpret('orris and sea salt', vocab);
    expect(r.filters.include).toEqual(expect.arrayContaining(['iris', 'sea-salt']));
  });

  it('reads weather and season words', () => {
    const r = interpret('rainy day', vocab);
    expect(r.filters.weather).toEqual(['rain']);
    expect(r.filters.q).toBe('');
    expect(r.unread).toEqual([]);
    const w = interpret('something for cold weather and winter nights', vocab);
    expect(w.filters.seasons).toEqual(['winter']);
    expect(w.filters.times).toEqual(['night']);
  });

  it('reads a house by name, with or without "by"', () => {
    expect(interpret('vanilla by Dior', vocab).filters.brands).toEqual(['dior']);
    expect(interpret('Chanel that lasts 8 hours', vocab).filters.brands).toEqual(['chanel']);
    const r = interpret('something from Le Labo', vocab);
    expect(r.filters.brands).toEqual(['le-labo']);
    expect(labels(r)).toContain('Le Labo');
    expect(r.unread).toEqual([]);
  });

  it('reads a perfumer by surname or full name', () => {
    const r = interpret('woody by Demachy', vocab);
    expect(r.filters.perfumers).toEqual(['francois-demachy']);
    expect(r.filters.brands).toEqual([]);
    expect(labels(r)).toContain('François Demachy');
    expect(interpret('anything by Francis Kurkdjian', vocab).filters.perfumers).toEqual(['francis-kurkdjian']);
    // A bare surname is the perfumer, not the house that carries his name.
    const k = interpret('Kurkdjian', vocab);
    expect(k.filters.perfumers).toEqual(['francis-kurkdjian']);
    expect(k.filters.brands).toEqual([]);
  });

  it('reads years and decades as release filters', () => {
    const from = interpret('fresh from 2015', vocab);
    expect(from.filters.yearMin).toBe(2015);
    expect(from.filters.yearMax).toBeNull();
    expect(labels(from)).toContain('2015 or later');
    const before = interpret('vanilla before 2000', vocab);
    expect(before.filters.yearMax).toBe(1999);
    expect(labels(before)).toContain('Before 2000');
    const exact = interpret('released in 2015', vocab);
    expect(exact.filters.yearMin).toBe(2015);
    expect(exact.filters.yearMax).toBe(2015);
    expect(interpret('something from the 90s', vocab).filters.decades).toEqual([1990]);
    expect(interpret('a 1980s powerhouse', vocab).filters.decades).toEqual([1980]);
    expect(interpret('the nineties', vocab).filters.decades).toEqual([1990]);
    expect(interpret('2000s fresh', vocab).filters.decades).toEqual([2000]);
  });

  it('reads concentrations', () => {
    expect(interpret('vanilla edp', vocab).filters.concentrations).toEqual(['edp']);
    expect(interpret('an eau de parfum with iris', vocab).filters.concentrations).toEqual(['edp']);
    expect(interpret('oud extrait', vocab).filters.concentrations).toEqual(['extrait']);
    expect(interpret('pure parfum from Chanel', vocab).filters.concentrations).toEqual(['parfum']);
    const r = interpret('bergamot edt for summer', vocab);
    expect(r.filters.concentrations).toEqual(['edt']);
    expect(labels(r)).toContain('EDT');
    expect(r.unread).toEqual([]);
  });

  it('reads designer, niche and independent as house kinds', () => {
    expect(interpret('niche vanilla', vocab).filters.brandKinds).toEqual(['niche']);
    expect(interpret('designer fresh for summer', vocab).filters.brandKinds).toEqual(['designer']);
    expect(interpret('something indie and smoky', vocab).filters.brandKinds).toEqual(['indie']);
    // "niche-y" is about being less common, not the kind of house.
    const r = interpret('niche-y fresh', vocab);
    expect(r.filters.brandKinds).toEqual([]);
    expect(r.filters.sort).toBe('lesser-known');
  });

  it('reads "in production"', () => {
    for (const q of ['oud still in production', 'vanilla that is still available', 'iris, not discontinued', 'in production bergamot']) {
      const r = interpret(q, vocab);
      expect(r.filters.available, q).toBe(true);
      expect(labels(r), q).toContain('In production only');
      expect(r.unread, q).toEqual([]);
    }
    // "made in 2015" is a year, not availability.
    const y = interpret('vanilla made in 2015', vocab);
    expect(y.filters.available).toBe(false);
    expect(y.filters.yearMin).toBe(2015);
  });

  it('keeps unknown words as a plain query when nothing was understood', () => {
    const r = interpret('kvist', vocab);
    expect(r.filters.q).toBe('kvist');
    expect(r.understood).toEqual([]);
    expect(r.unread).toEqual([{ text: 'kvist', group: 'notes' }]);
  });

  it('reports the half it could not read, pointed at the right group', () => {
    const r = interpret('vanilla without tobacco around 100 bucks', vocab);
    expect(r.filters.include).toEqual(['vanilla']);
    expect(r.filters.exclude).toEqual(['tobacco']);
    expect(r.filters.priceMax).toBeNull();
    expect(r.unread).toEqual([{ text: 'around 100 bucks', group: 'price' }]);
    // Once something was read, stray words are reported, not searched.
    expect(r.filters.q).toBe('');
    const h = interpret('fresh that lasts through dinner', vocab);
    expect(h.filters.dims).toContain('fresh');
    expect(h.unread).toEqual([{ text: 'lasts through dinner', group: 'longevity' }]);
    const l = interpret('iris that is louder', vocab);
    expect(l.unread[0]?.group).toBe('projection');
  });

  it('never includes a note it also excludes', () => {
    const r = interpret('vanilla without vanilla', vocab);
    expect(r.filters.exclude).toEqual(['vanilla']);
    expect(r.filters.include).toEqual([]);
  });

  it('gives every understood thing a sentence phrase', () => {
    const r = interpret('vanilla without tobacco for the office, lasts 8 hours', vocab);
    expect(r.understood.every((u) => u.phrase.length > 0)).toBe(true);
    expect(r.understood.find((u) => u.kind === 'exclude')?.phrase).toBe('without tobacco');
    expect(r.understood.find((u) => u.kind === 'context')?.phrase).toBe('for the office');
  });
});

describe('sentence', () => {
  it('capitalises the first phrase and joins the rest with commas', () => {
    expect(sentence(['vanilla', 'without tobacco'])).toBe('Vanilla, without tobacco');
    expect(sentence([])).toBe('');
  });
});

describe('looksNatural', () => {
  it('spots sentences and leaves names alone', () => {
    expect(looksNatural('vanilla without tobacco')).toBe(true);
    expect(looksNatural('Sauvage')).toBe(false);
    expect(looksNatural('a very long fragrance name here')).toBe(true);
    expect(looksNatural('by Dior')).toBe(true);
    expect(looksNatural('90s')).toBe(true);
    expect(looksNatural('from 2015')).toBe(true);
    expect(looksNatural('Bleu de Chanel')).toBe(false);
  });
});
