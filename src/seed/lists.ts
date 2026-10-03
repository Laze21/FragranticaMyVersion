import type { SeedList } from './types';

/**
 * Demo lists, authored by demo accounts so the list features can be explored.
 * Item notes stick to facts (notes, style, price band); no invented personal verdicts about real
 * products.
 */
export const LISTS: SeedList[] = [
  {
    slug: 'vanilla-without-tobacco',
    author: 'cozykat',
    title: 'Vanilla without the tobacco',
    description: 'For people who love vanilla but find tobacco notes too heavy. Sweet, creamy and boozy directions, no smoke.',
    items: [
      { fragrance: 'shalimar', note: 'Vanilla with citrus and a powdery, resinous base. The classic reference.' },
      { fragrance: 'love-dont-be-shy', note: 'Marshmallow-soft orange blossom and vanilla.' },
      { fragrance: 'la-vie-est-belle', note: 'Praline and iris; a very sweet modern take.' },
      { fragrance: 'black-opium', note: 'Coffee and vanilla over white florals.' },
      { fragrance: 'cheirosa-62', note: 'Pistachio-salted caramel in a body mist. Short-lived, cheap to try.' },
    ],
  },
  {
    slug: 'fresh-but-not-blue',
    author: 'gabriel.mtz',
    title: 'Fresh, but not the usual blue bottle',
    description: 'Summer-friendly fragrances that sit outside the ambroxan-and-pepper crowd.',
    items: [
      { fragrance: 'un-jardin-sur-le-nil', note: 'Green mango, lotus and reeds.' },
      { fragrance: 'wood-sage-sea-salt', note: 'Salty, mineral, light.' },
      { fragrance: 'philosykos', note: 'Fig leaf and fig wood.' },
      { fragrance: 'eau-sauvage', note: 'A 1960s citrus-aromatic cologne structure.' },
      { fragrance: 'prada-l-homme', note: 'Iris and neroli, soapy and clean.' },
    ],
  },
  {
    slug: 'first-five-bottles',
    author: 'delphine.r',
    title: 'Five very different first bottles',
    description: 'A starter spread across the main families, so you learn what you like before you buy deeper.',
    items: [
      { fragrance: 'terre-d-hermes', note: 'Woody, mineral, orange.' },
      { fragrance: 'coco-mademoiselle', note: 'Modern chypre: citrus, rose, patchouli.' },
      { fragrance: 'santal-33', note: 'Sandalwood, leather and violet; a niche landmark.' },
      { fragrance: 'tobacco-vanille', note: 'Dense, sweet, spiced.' },
      { fragrance: 'molecule-01', note: 'One woody-ambery molecule. A lesson in what a single material does.' },
    ],
  },
  {
    slug: 'rainy-day-shelf',
    author: 'vetiverandrain',
    title: 'Rainy day shelf',
    description: 'Iris, vetiver, incense and woods for grey weather.',
    items: [
      { fragrance: 'grey-vetiver', note: 'Clean vetiver with citrus.' },
      { fragrance: 'dior-homme-intense', note: 'Iris over cacao and woods.' },
      { fragrance: 'gypsy-water', note: 'Pine, juniper and vanilla.' },
      { fragrance: 'jazz-club', note: 'Rum, tobacco leaf, vanilla.' },
    ],
  },
  {
    slug: 'under-50-dollars',
    author: 'budgetbasil',
    title: 'Under $50 at typical retail',
    description: 'Prices move a lot; these are usually found under fifty dollars for a full bottle.',
    items: [
      { fragrance: 'nautica-voyage' },
      { fragrance: 'cool-water' },
      { fragrance: 'club-de-nuit-intense-man' },
      { fragrance: 'khamrah' },
      { fragrance: 'cheirosa-62' },
    ],
  },
];
