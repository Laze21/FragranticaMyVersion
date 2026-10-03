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

export const FEELINGS: Feeling[] = [
  { slug: 'clean', title: 'Clean', line: 'Fresh shirt, warm skin, a little soap.', filters: f({ dims: ['clean'], sort: 'rating' }) },
  { slug: 'dark', title: 'Dark', line: 'Smoke, resin, leather, late hours.', filters: f({ dims: ['smoky', 'warm'], sort: 'rating' }) },
  { slug: 'warm', title: 'Warm', line: 'Amber, vanilla and spice for cold hands.', filters: f({ dims: ['warm'], seasons: ['winter'], sort: 'rating' }) },
  { slug: 'rainy-day', title: 'Rainy day', line: 'Grey light, wet stone, something to hold onto.', filters: f({ weather: ['rain'], sort: 'rating' }) },
  { slug: 'vacation', title: 'Vacation', line: 'Salt, citrus, sun on skin.', filters: f({ seasons: ['summer'], occasions: ['outdoors'], sort: 'rating' }) },
  { slug: 'date-night', title: 'Date night', line: 'Close enough to notice, not enough to announce.', filters: f({ occasions: ['date'], times: ['night'], sort: 'rating' }) },
  { slug: 'office', title: 'Office', line: 'Pleasant at a desk, gone by the elevator.', filters: f({ occasions: ['office'], projectionMax: 3.2, sort: 'rating' }) },
  { slug: 'cold-weather', title: 'Cold weather', line: 'Dense things that bloom in a scarf.', filters: f({ weather: ['cold'], longevityMin: 7, sort: 'rating' }) },
  { slug: 'quiet-luxury', title: 'Quiet luxury', line: 'Expensive-smelling, never loud.', filters: f({ projectionMax: 3, priceBands: ['premium', 'luxury', 'ultra'], sort: 'rating' }) },
  { slug: 'sweet-not-sugary', title: 'Sweet but not sugary', line: 'Warmth without the candy shop.', filters: f({ dims: ['warm'], avoidDims: ['sweet'], sort: 'rating' }) },
  { slug: 'fresh-not-aquatic', title: 'Fresh but not aquatic', line: 'Bright and green, no sea breeze.', filters: f({ dims: ['fresh'], excludeFamilies: ['marine'], sort: 'rating' }) },
  { slug: 'gourmand', title: 'Something edible', line: 'Vanilla, caramel, coffee, praline.', filters: f({ dims: ['sweet'], sort: 'rating' }) },
];
