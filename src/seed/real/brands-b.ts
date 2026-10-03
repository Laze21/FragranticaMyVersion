import type { SeedBrand } from '../types';

/**
 * Houses used by group B fragrances.
 * NOTE: web research was unavailable when this file was written (search quota exhausted and the
 * egress proxy blocked house, retailer and Wikidata/Wikipedia pages). Founding facts come from
 * prior knowledge and carry no sourceUrl; wikidataQid is omitted because none was seen.
 */
export const BRANDS_B: SeedBrand[] = [
  {
    slug: 'dior',
    name: 'Dior',
    website: 'https://www.dior.com',
    parentCompany: 'LVMH',
    kind: 'designer',
    country: 'FR',
    city: 'Paris',
    founded: 1946,
    description:
      'The Paris couture house Christian Dior opened in 1946, and its perfume arm followed a year later with Miss Dior. Today Dior is one of the biggest names in prestige fragrance, with blockbusters for men and women alongside a private collection.',
    knownFor: 'Big floral icons and best-selling masculines',
  },
  {
    slug: 'mugler',
    name: 'Mugler',
    website: 'https://www.mugler.com',
    parentCompany: "L'Oréal (fragrance and beauty)",
    kind: 'designer',
    country: 'FR',
    city: 'Paris',
    founded: 1974,
    description:
      'Fashion house founded in Paris by designer Thierry Mugler in the 1970s. Its first fragrance, Angel (1992), is widely credited with launching the modern gourmand genre, and its perfumes have been part of L\'Oréal since 2019.',
    knownFor: 'Theatrical gourmands and star-shaped bottles',
  },
  {
    slug: 'carolina-herrera',
    name: 'Carolina Herrera',
    website: 'https://www.carolinaherrera.com',
    parentCompany: 'Puig',
    kind: 'designer',
    country: 'US',
    city: 'New York',
    founded: 1981,
    description:
      'New York fashion house founded by Venezuelan-born designer Carolina Herrera in 1981. Its fragrances are produced by the Spanish group Puig, and the stiletto-bottled Good Girl line is its biggest perfume success.',
    knownFor: 'Glossy evening florals and novelty bottles',
  },
  {
    slug: 'viktor-rolf',
    name: 'Viktor&Rolf',
    website: 'https://www.viktor-rolf.com',
    parentCompany: "OTB (fashion); fragrances by L'Oréal",
    kind: 'designer',
    country: 'NL',
    city: 'Amsterdam',
    founded: 1993,
    description:
      'Dutch fashion label started by Viktor Horsting and Rolf Snoeren, known for conceptual couture. Its fragrances are made under licence by L\'Oréal, and Flowerbomb remains the house\'s defining scent.',
    knownFor: 'Sweet floral gourmands in grenade bottles',
  },
  {
    slug: 'marc-jacobs',
    name: 'Marc Jacobs',
    website: 'https://www.marcjacobs.com',
    parentCompany: 'LVMH (fashion); fragrances by Coty',
    kind: 'designer',
    country: 'US',
    city: 'New York',
    founded: 1984,
    description:
      'American designer label founded by Marc Jacobs in New York. Its fragrances are produced under licence by Coty, and the Daisy family, with its flower-covered caps, is one of the best-known young feminine lines.',
    knownFor: 'Light, cheerful fruity florals',
  },
  {
    slug: 'victorias-secret',
    name: "Victoria's Secret",
    website: 'https://www.victoriassecret.com',
    parentCompany: "Victoria's Secret & Co.",
    kind: 'mass',
    country: 'US',
    city: 'San Francisco',
    founded: 1977,
    description:
      'American lingerie retailer founded in San Francisco in 1977, now headquartered in Ohio. Its in-house fragrance line is sold through its own stores, and Bombshell is its long-running best seller.',
    knownFor: 'Fruity florals and body mists sold in its own stores',
  },
  {
    slug: 'guerlain',
    name: 'Guerlain',
    website: 'https://www.guerlain.com',
    parentCompany: 'LVMH',
    kind: 'heritage',
    country: 'FR',
    city: 'Paris',
    founded: 1828,
    description:
      'One of the oldest perfume houses still operating, founded in Paris in 1828 by Pierre-François-Pascal Guerlain. Several generations of the family composed its classics, and the house has belonged to LVMH since the 1990s.',
    knownFor: 'Vanilla-rich orientals and early-20th-century classics',
  },
  {
    slug: 'creed',
    name: 'Creed',
    website: 'https://www.creedboutique.com',
    parentCompany: 'Kering Beauté',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 1760,
    description:
      'Creed presents itself as a family house founded in London in 1760, a heritage claim that historians have questioned. Now based in France, it was bought by Kering Beauté in 2023 and is best known for Aventus.',
    knownFor: 'Fruity-woody masculines and luxury fresh scents',
  },
  {
    slug: 'maison-francis-kurkdjian',
    name: 'Maison Francis Kurkdjian',
    website: 'https://www.franciskurkdjian.com',
    parentCompany: 'LVMH',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 2009,
    description:
      'Paris house founded in 2009 by perfumer Francis Kurkdjian and businessman Marc Chaya. LVMH took a majority stake in 2017. Baccarat Rouge 540 turned it into one of the most recognised niche names of the 2020s.',
    knownFor: 'Radiant ambery woods and clean musks',
  },
  {
    slug: 'le-labo',
    name: 'Le Labo',
    website: 'https://www.lelabofragrances.com',
    parentCompany: 'The Estée Lauder Companies',
    kind: 'niche',
    country: 'US',
    city: 'New York',
    founded: 2006,
    description:
      'Founded in New York in 2006 by Fabrice Penot and Edouard Roschi, Le Labo blends many of its perfumes to order in store and prints a personalised label for each bottle. Estée Lauder bought the brand in 2014.',
    knownFor: 'Skin-close woods and musks named after a lead material',
  },
  {
    slug: 'byredo',
    name: 'Byredo',
    website: 'https://www.byredo.com',
    parentCompany: 'Puig',
    kind: 'niche',
    country: 'SE',
    city: 'Stockholm',
    founded: 2006,
    description:
      'Stockholm house founded by Ben Gorham in 2006, built around minimal design and memory-themed perfumes. Puig acquired a majority of the company in 2022.',
    knownFor: 'Soft, airy woods and minimalist bottles',
  },
  {
    slug: 'diptyque',
    name: 'Diptyque',
    website: 'https://www.diptyqueparis.com',
    parentCompany: 'Manzanita Capital',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 1961,
    description:
      'Started in 1961 as a shop on Boulevard Saint-Germain by three friends working in design and painting. It sold scented candles before its first eau de toilette in 1968, and its oval labels with dancing letters are among the most recognisable in perfume.',
    knownFor: 'Naturalistic fig, rose and woody scents; candles',
  },
  {
    slug: 'tom-ford',
    name: 'Tom Ford',
    website: 'https://www.tomfordbeauty.com',
    parentCompany: 'The Estée Lauder Companies',
    kind: 'designer',
    country: 'US',
    city: 'New York',
    founded: 2005,
    description:
      'Fashion brand launched by designer Tom Ford in 2005, with a beauty line made by Estée Lauder from 2006. Its Private Blend collection, introduced in 2007, works as the brand\'s niche line, and Estée Lauder acquired the whole brand in 2023.',
    knownFor: 'Plush ambers, ouds and tobacco in Private Blend',
  },
  {
    slug: 'maison-margiela',
    name: 'Maison Margiela',
    website: 'https://www.maisonmargiela.com',
    parentCompany: "OTB (fashion); fragrances by L'Oréal",
    kind: 'designer',
    country: 'FR',
    city: 'Paris',
    founded: 1988,
    description:
      'Paris fashion house founded by Belgian designer Martin Margiela in 1988 and now part of OTB. Its fragrances are made by L\'Oréal; the Replica line recreates specific places and moments, each bottle labelled with a time and a location.',
    knownFor: 'Replica: cosy, memory-themed scents',
  },
];
