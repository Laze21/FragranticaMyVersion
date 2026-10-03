import { describe, expect, it } from 'vitest';
import { activeFilterCount, EMPTY_FILTERS, filtersToSearch, parseFilters } from '@/lib/search/filters';

describe('filters in the URL', () => {
  it('round-trips through the query string', () => {
    const f = { ...structuredClone(EMPTY_FILTERS), q: 'rainy day', include: ['vetiver'], exclude: ['oud'], dims: ['green' as const], seasons: ['autumn'], longevityMin: 6, priceMax: 120, sort: 'longest' as const, available: true, noteMatch: 'perceived' as const };
    const search = filtersToSearch(f);
    expect(search.startsWith('?')).toBe(true);
    const sp = Object.fromEntries(new URLSearchParams(search.slice(1)));
    const back = parseFilters(sp);
    expect(back).toEqual(f);
  });

  it('is empty for the empty filter set', () => {
    expect(filtersToSearch(EMPTY_FILTERS)).toBe('');
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('sanitises what it reads', () => {
    const f = parseFilters({ with: 'Vanilla,<script>,  ,bad slug!', lasts: 'abc', sort: 'nope', decade: '1990,abc,99999', match: 'weird', like: 'DIOR SAUVAGE' });
    expect(f.include).toEqual(['vanilla', 'script', 'badslug']);
    expect(f.longevityMin).toBeNull();
    expect(f.sort).toBe('relevance');
    expect(f.decades).toEqual([1990]);
    expect(f.noteMatch).toBe('any');
    expect(f.similarTo).toBe('diorsauvage');
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

  it('counts active filters', () => {
    const f = { ...structuredClone(EMPTY_FILTERS), include: ['a', 'b'], ratingMin: 7, available: true, noteMatch: 'listed' as const };
    expect(activeFilterCount(f)).toBe(5);
  });
});
