import { describe, expect, it } from 'vitest';
import { activeFilterCount, describeFilters, EMPTY_FILTERS, filtersToSearch, parseFilters, type FilterNames } from '@/lib/search/filters';

describe('filters in the URL', () => {
  it('round-trips through the query string', () => {
    const f = {
      ...structuredClone(EMPTY_FILTERS),
      q: 'rainy day',
      include: ['vetiver'],
      exclude: ['oud'],
      dims: ['green' as const],
      seasons: ['autumn'],
      longevityMin: 6,
      priceMax: 120,
      sort: 'longest' as const,
      available: true,
      noteMatch: 'perceived' as const,
      perfumers: ['francois-demachy'],
      yearMin: 2010,
      yearMax: 2019,
      view: 'row' as const,
    };
    const search = filtersToSearch(f);
    expect(search.startsWith('?')).toBe(true);
    const sp = Object.fromEntries(new URLSearchParams(search.slice(1)));
    expect(sp.nose).toBe('francois-demachy');
    expect(sp.from).toBe('2010');
    expect(sp.before).toBe('2019');
    const back = parseFilters(sp);
    expect(back).toEqual(f);
  });

  it('is empty for the empty filter set', () => {
    expect(filtersToSearch(EMPTY_FILTERS)).toBe('');
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('sanitises what it reads', () => {
    const f = parseFilters({ with: 'Vanilla,<script>,  ,bad slug!', lasts: 'abc', sort: 'nope', decade: '1990,abc,99999', match: 'weird', like: 'DIOR SAUVAGE', from: '12', before: 'soon', view: 'grid' });
    expect(f.include).toEqual(['vanilla', 'script', 'badslug']);
    expect(f.longevityMin).toBeNull();
    expect(f.sort).toBe('relevance');
    expect(f.decades).toEqual([1990]);
    expect(f.noteMatch).toBe('any');
    expect(f.similarTo).toBe('diorsauvage');
    expect(f.yearMin).toBeNull();
    expect(f.yearMax).toBeNull();
    expect(f.view).toBe('floor');
  });

  it('caps list lengths and the query length', () => {
    const f = parseFilters({ with: Array.from({ length: 30 }, (_, i) => `n${i}`).join(','), q: 'x'.repeat(400) });
    expect(f.include).toHaveLength(12);
    expect(f.q).toHaveLength(160);
  });

  it('accepts repeated params as arrays', () => {
    const f = parseFilters({ season: ['summer', 'spring'] });
    expect(f.seasons).toEqual(['summer', 'spring']);
  });

  it('counts active filters, and never the density or the sort', () => {
    const f = { ...structuredClone(EMPTY_FILTERS), include: ['a', 'b'], ratingMin: 7, available: true, noteMatch: 'listed' as const, view: 'row' as const, sort: 'popular' as const };
    expect(activeFilterCount(f)).toBe(5);
    expect(activeFilterCount({ ...structuredClone(EMPTY_FILTERS), perfumers: ['x'], yearMin: 2015 })).toBe(2);
  });
});

describe('describeFilters', () => {
  const names: FilterNames = {
    notes: { vanilla: 'Vanilla', tobacco: 'Tobacco' },
    brands: { dior: 'Dior' },
    perfumers: { 'francois-demachy': 'François Demachy' },
    similar: 'Bleu de Chanel',
  };

  it('names every active filter once, with the phrase for the title, and can remove each', () => {
    const f = { ...structuredClone(EMPTY_FILTERS), include: ['vanilla'], exclude: ['tobacco'], occasions: ['office'], longevityMin: 8, brands: ['dior'], perfumers: ['francois-demachy'], concentrations: ['edp'], available: true };
    const chips = describeFilters(f, names);
    expect(chips.map((c) => c.label)).toEqual(['Vanilla', 'No tobacco', 'Office', 'Lasts 8h+', 'Dior', 'François Demachy', 'EDP', 'In production only']);
    expect(chips.map((c) => c.phrase)).toEqual(['vanilla', 'without tobacco', 'for the office', 'lasting 8h or more', 'by Dior', 'by François Demachy', 'as EDP', 'still in production']);
    expect(chips.find((c) => c.label === 'No tobacco')?.exclude).toBe(true);
    expect(chips.find((c) => c.label === 'Vanilla')?.exclude).toBe(false);
    const removed = chips.find((c) => c.label === 'No tobacco')!.remove;
    expect(removed.exclude).toEqual([]);
    expect(removed.include).toEqual(['vanilla']);
    expect(activeFilterCount(removed)).toBe(activeFilterCount(f) - 1);
  });

  it('reads years the way the rail does', () => {
    expect(describeFilters({ ...structuredClone(EMPTY_FILTERS), yearMin: 2015, yearMax: 2015 }, names)[0].label).toBe('Released 2015');
    expect(describeFilters({ ...structuredClone(EMPTY_FILTERS), yearMin: 2015 }, names)[0].label).toBe('2015 or later');
    expect(describeFilters({ ...structuredClone(EMPTY_FILTERS), yearMax: 1999 }, names)[0].label).toBe('Before 2000');
    expect(describeFilters({ ...structuredClone(EMPTY_FILTERS), decades: [1990] }, names)[0].phrase).toBe('from the 1990s');
  });

  it('uses the radio phrases verbatim for the note-match chip', () => {
    expect(describeFilters({ ...structuredClone(EMPTY_FILTERS), noteMatch: 'listed' }, names)[0].label).toBe('Listed by the house');
    expect(describeFilters({ ...structuredClone(EMPTY_FILTERS), noteMatch: 'perceived' }, names)[0].label).toBe('Noticed by people');
  });

  it('puts the reference fragrance first and quotes plain words', () => {
    const chips = describeFilters({ ...structuredClone(EMPTY_FILTERS), q: 'kvist', similarTo: 'bleu-de-chanel-edp', include: ['vanilla'] }, names);
    expect(chips.map((c) => c.label)).toEqual(['“kvist”', 'Like Bleu de Chanel', 'Vanilla']);
    expect(chips.every((c) => c.key)).toBe(true);
  });
});
