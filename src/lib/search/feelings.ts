import { EMPTY_FILTERS, type Filters } from './filters';

/**
 * "Explore by feeling": human starting points that map to transparent filters. Opening one
 * shows exactly which filters it set, so nothing is a black box.
 */
export interface Feeling {
  slug: string;
  title: string;
  line: string;
  filters: Filters;
}

const f = (patch: Partial<Filters>): Filters => ({ ...structuredClone(EMPTY_FILTERS), ...patch });

/*
 * The lines deliberately do not share one shape. Some are a list, some are one picture, some
 * ask a question; twelve of the same cadence would read as a template.
 */
export const FEELINGS: Feeling[] = [
  { slug: 'clean', title: 'Clean', line: 'Fresh shirt, warm skin, a little soap.', filters: f({ dims: ['clean'], sort: 'rating' }) },
  { slug: 'dark', title: 'Dark', line: 'A leather jacket that has been near a fire.', filters: f({ dims: ['smoky', 'warm'], sort: 'rating' }) },
  { slug: 'warm', title: 'Warm', line: 'What do you wear when you can see your breath?', filters: f({ dims: ['warm'], seasons: ['winter'], sort: 'rating' }) },
  { slug: 'rainy-day', title: 'Rainy day', line: 'What do you wear when the light goes grey?', filters: f({ weather: ['rain'], sort: 'rating' }) },
  { slug: 'vacation', title: 'Vacation', line: 'Salt drying on your shoulders after a swim.', filters: f({ seasons: ['summer'], occasions: ['outdoors'], sort: 'rating' }) },
  { slug: 'date-night', title: 'Date night', line: 'Close enough to notice, not enough to announce.', filters: f({ occasions: ['date'], times: ['night'], sort: 'rating' }) },
  { slug: 'office', title: 'Office', line: 'Pleasant at a desk, gone by the elevator.', filters: f({ occasions: ['office'], projectionMax: 3.2, sort: 'rating' }) },
  { slug: 'cold-weather', title: 'Cold weather', line: 'Dense things that bloom in a scarf.', filters: f({ weather: ['cold'], longevityMin: 7, sort: 'rating' }) },
  { slug: 'quiet-luxury', title: 'Quiet luxury', line: 'Expensive-smelling, never loud.', filters: f({ projectionMax: 3, priceBands: ['premium', 'luxury', 'ultra'], sort: 'rating' }) },
  { slug: 'sweet-not-sugary', title: 'Sweet but not sugary', line: 'Warmth without the candy shop.', filters: f({ dims: ['warm'], avoidDims: ['sweet'], sort: 'rating' }) },
  { slug: 'fresh-not-aquatic', title: 'Fresh but not aquatic', line: 'Does fresh have to mean the sea?', filters: f({ dims: ['fresh'], excludeFamilies: ['marine'], sort: 'rating' }) },
  { slug: 'gourmand', title: 'Something edible', line: 'The bakery at six in the morning.', filters: f({ dims: ['sweet'], sort: 'rating' }) },
];

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

/*
 * The three feelings the home page leads with, per season. There is no weather feed in the
 * prototype, so the season stands in for "today"; the order is the order they are shown in.
 */
const SEASONAL: Record<SeasonKey, string[]> = {
  spring: ['clean', 'fresh-not-aquatic', 'rainy-day'],
  summer: ['vacation', 'fresh-not-aquatic', 'office'],
  autumn: ['cold-weather', 'rainy-day', 'dark'],
  winter: ['warm', 'cold-weather', 'quiet-luxury'],
};

/** The feelings that fit the season, in the lead; the rest in catalogue order. */
export function seasonalFeelings(season: SeasonKey): { lead: Feeling[]; rest: Feeling[] } {
  const slugs = SEASONAL[season];
  const lead = slugs.map((s) => FEELINGS.find((x) => x.slug === s)).filter(Boolean) as Feeling[];
  const rest = FEELINGS.filter((x) => !slugs.includes(x.slug));
  return { lead, rest };
}

export interface FeelingWithCount extends Feeling {
  count: number;
}

/**
 * Each feeling with how many fragrances its filters match today. The counter is injected so this
 * module stays free of the database and the same list can be counted against any search.
 */
export async function withFeelingCounts(feelings: Feeling[], count: (filters: Filters) => Promise<number>): Promise<FeelingWithCount[]> {
  const counts = await Promise.all(feelings.map((x) => count(x.filters)));
  return feelings.map((x, i) => ({ ...x, count: counts[i] }));
}
