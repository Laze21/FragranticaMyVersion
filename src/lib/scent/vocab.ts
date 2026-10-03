import { DIMENSIONS, type Dimension } from '@/seed/types';

export { DIMENSIONS, type Dimension };

/**
 * Character dimensions. Hues are muted "material" colours (citrus peel, cedar, amber resin,
 * warm graphite) cut so the Trail reads at thumbnail size: every stack-neighbour (fresh to smoky,
 * the fixed band order) is at least 0.076 apart in OKLab and lightness alternates down the stack.
 * Two bands (clean, creamy) are pale by nature and are carried by the 1px outline, not by contrast.
 * Band labels: ink when the hue's OKLab L is at or above 0.6, paper otherwise, never with alpha.
 * Every use of colour is paired with a text label; colour is never the only carrier of meaning.
 */
export const DIMENSION_META: Record<Dimension, { label: string; hue: string; description: string; plain: string }> = {
  fresh: { label: 'Fresh', hue: '#6F9AA8', plain: 'bright, airy, citrusy or watery', description: 'Citrus, airy, aquatic and aromatic herbs. The lift you notice first.' },
  clean: { label: 'Clean', hue: '#C7D2CE', plain: 'soapy, laundry, just-showered', description: 'Musks, aldehydes, soap and laundry. Smells like a fresh shirt.' },
  green: { label: 'Green', hue: '#6A8E58', plain: 'leafy, grassy, snapped stems', description: 'Leaves, stems, galbanum, tomato vine, cut grass.' },
  floral: { label: 'Floral', hue: '#C98A93', plain: 'flowers, from petal-soft to heady', description: 'Rose, jasmine, white flowers, orange blossom.' },
  fruity: { label: 'Fruity', hue: '#DD9668', plain: 'juicy fruit', description: 'Pear, berries, stone fruit, tropical fruit.' },
  sweet: { label: 'Sweet', hue: '#BF7139', plain: 'sugary, dessert-like', description: 'Vanilla, caramel, praline, honey. Gourmand territory.' },
  creamy: { label: 'Creamy', hue: '#E3D2A8', plain: 'smooth, milky, soft', description: 'Sandalwood, milk, coconut, lactonic smoothness.' },
  powdery: { label: 'Powdery', hue: '#A697A8', plain: 'soft, makeup-bag, cosmetic', description: 'Iris, heliotrope, violet. The feel of face powder.' },
  spicy: { label: 'Spicy', hue: '#9E3A28', plain: 'peppery, warm spices', description: 'Pepper, cardamom, cinnamon, clove, saffron.' },
  woody: { label: 'Woody', hue: '#8A5A36', plain: 'pencil shavings, timber, dry woods', description: 'Cedar, sandalwood, vetiver, guaiac, oud.' },
  earthy: { label: 'Earthy', hue: '#5B6B32', plain: 'soil, moss, roots', description: 'Patchouli, oakmoss, vetiver roots, hay.' },
  warm: { label: 'Warm', hue: '#C99A2E', plain: 'amber, resin, cosy', description: 'Amber, resins, labdanum, benzoin, ambroxan warmth.' },
  smoky: { label: 'Smoky', hue: '#514A45', plain: 'smoke, incense, leather, tar', description: 'Incense, birch tar, tobacco, leather.' },
};

export const PHASES = ['opening', 'heart', 'drydown'] as const;
export type Phase = (typeof PHASES)[number];

/** The windows are the Trail's phase ruler, so they are stated as times, not as prose. */
export const PHASE_META: Record<Phase, { label: string; window: string }> = {
  opening: { label: 'Opening', window: '0–20 min' },
  heart: { label: 'Heart', window: '20 min–2.5h' },
  drydown: { label: 'Drydown', window: '2.5h on' },
};

export const LONGEVITY_BUCKETS = [
  { key: 'lt2', label: 'Under 2h', short: '<2h', lo: 0, hi: 2 },
  { key: '2to4', label: '2–4 hours', short: '2–4h', lo: 2, hi: 4 },
  { key: '4to6', label: '4–6 hours', short: '4–6h', lo: 4, hi: 6 },
  { key: '6to8', label: '6–8 hours', short: '6–8h', lo: 6, hi: 8 },
  { key: '8to10', label: '8–10 hours', short: '8–10h', lo: 8, hi: 10 },
  { key: '10plus', label: '10+ hours', short: '10h+', lo: 10, hi: 14 },
] as const;
export type LongevityKey = (typeof LONGEVITY_BUCKETS)[number]['key'];

export const PROJECTION_LEVELS = [
  { value: 1, label: 'Skin', hint: 'only you, nose to wrist' },
  { value: 2, label: 'Close', hint: 'a hug away' },
  { value: 3, label: 'Conversational', hint: 'someone across a table notices' },
  { value: 4, label: "Arm's length", hint: 'noticeable as you pass' },
  { value: 5, label: 'Room-filling', hint: 'people know you arrived' },
] as const;

export type WearGroup = 'season' | 'time' | 'weather' | 'occasion';
export const WEAR_CONTEXTS: Array<{ key: string; grp: WearGroup; label: string }> = [
  { key: 'spring', grp: 'season', label: 'Spring' },
  { key: 'summer', grp: 'season', label: 'Summer' },
  { key: 'autumn', grp: 'season', label: 'Autumn' },
  { key: 'winter', grp: 'season', label: 'Winter' },
  { key: 'day', grp: 'time', label: 'Day' },
  { key: 'night', grp: 'time', label: 'Night' },
  { key: 'hot', grp: 'weather', label: 'Hot' },
  { key: 'mild', grp: 'weather', label: 'Mild' },
  { key: 'cold', grp: 'weather', label: 'Cold' },
  { key: 'rain', grp: 'weather', label: 'Rain' },
  { key: 'humid', grp: 'weather', label: 'Humid' },
  { key: 'office', grp: 'occasion', label: 'Office' },
  { key: 'school', grp: 'occasion', label: 'School' },
  { key: 'date', grp: 'occasion', label: 'Date' },
  { key: 'formal', grp: 'occasion', label: 'Formal' },
  { key: 'casual', grp: 'occasion', label: 'Casual' },
  { key: 'nightlife', grp: 'occasion', label: 'Nightlife' },
  { key: 'special', grp: 'occasion', label: 'Special occasion' },
  { key: 'outdoors', grp: 'occasion', label: 'Outdoors' },
];

export const CONCENTRATION_LABEL: Record<string, { short: string; long: string; glossary?: string }> = {
  cologne: { short: 'Cologne', long: 'Eau de Cologne', glossary: 'eau-de-cologne' },
  edc: { short: 'EDC', long: 'Eau de Cologne', glossary: 'eau-de-cologne' },
  edt: { short: 'EDT', long: 'Eau de Toilette', glossary: 'edt' },
  edp: { short: 'EDP', long: 'Eau de Parfum', glossary: 'edp' },
  parfum: { short: 'Parfum', long: 'Parfum', glossary: 'parfum' },
  extrait: { short: 'Extrait', long: 'Extrait de Parfum', glossary: 'extrait' },
  oil: { short: 'Oil', long: 'Perfume oil' },
  body_mist: { short: 'Body mist', long: 'Body mist', glossary: 'body-mist' },
};

export const PRICE_BANDS = {
  budget: { label: 'Budget', range: 'under $40', glyph: '$' },
  accessible: { label: 'Accessible', range: '$40–90', glyph: '$$' },
  premium: { label: 'Premium', range: '$90–180', glyph: '$$$' },
  luxury: { label: 'Luxury', range: '$180–350', glyph: '$$$$' },
  ultra: { label: 'Rarefied', range: 'over $350', glyph: '$$$$$' },
} as const;
export type PriceBand = keyof typeof PRICE_BANDS;

export const MARKETED_FOR_LABEL: Record<string, string> = {
  feminine: 'Marketed to women',
  masculine: 'Marketed to men',
  shared: 'Marketed as shared',
  unspecified: 'No stated audience',
};

export const COLLECTION_STATUSES = [
  { key: 'own', label: 'Own', verb: 'On your shelf' },
  { key: 'testing', label: 'Testing', verb: 'Testing now' },
  { key: 'want_sample', label: 'Want to sample', verb: 'Want to sample' },
  { key: 'sampled', label: 'Sampled', verb: 'Sampled' },
  { key: 'want', label: 'Want', verb: 'On your wishlist' },
  { key: 'had', label: 'Owned before', verb: 'Owned before' },
] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number]['key'];

export const FORMATS = [
  { key: 'bottle', label: 'Full bottle' },
  { key: 'travel', label: 'Travel spray' },
  { key: 'mini', label: 'Mini' },
  { key: 'decant', label: 'Decant' },
  { key: 'sample', label: 'Sample vial' },
] as const;

export const REVIEW_FOCUS = [
  { key: 'scent', label: 'Scent' },
  { key: 'performance', label: 'Performance' },
  { key: 'value', label: 'Value' },
  { key: 'beginner', label: 'Beginner view' },
  { key: 'long_term', label: 'Long-term owner' },
  { key: 'first_impression', label: 'First impression' },
  { key: 'comparison', label: 'Comparison' },
] as const;

export const EXPERIENCE_LABEL: Record<string, string> = {
  new: 'New to fragrance',
  learning: 'Learning',
  enthusiast: 'Enthusiast',
  collector: 'Collector',
  professional: 'Works in the industry',
};
