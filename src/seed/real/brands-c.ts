import type { SeedBrand } from '../types';

/**
 * Houses used by group C fragrances.
 * NOTE: written during a session with no web access (all house, retailer and Wikidata hosts were
 * blocked by the egress proxy). Founding facts are from editor knowledge; sourceUrl and wikidataQid
 * are omitted because no page was opened. Verify before publishing.
 */
export const BRANDS_C: SeedBrand[] = [
  {
    slug: 'parfums-de-marly',
    name: 'Parfums de Marly',
    website: 'https://parfums-de-marly.com',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 2009,
    description:
      'Parfums de Marly was founded in 2009 by Julien Sprecher and takes its imagery from the horse culture of the 18th-century French court. Its fragrances lean rich and long-lasting, and several of its men\'s scents have become modern niche bestsellers.',
    knownFor: 'Big, polished ambers and spiced woods',
  },
  {
    slug: 'frederic-malle',
    name: 'Frédéric Malle',
    website: 'https://www.fredericmalle.com',
    parentCompany: 'The Estée Lauder Companies',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 2000,
    description:
      'Editions de Parfums Frédéric Malle launched in 2000 with an unusual premise: the perfumer is credited on the bottle like an author on a book. The catalogue reads like a who\'s who of modern perfumery, and the house has been part of Estée Lauder since 2014.',
    knownFor: 'Perfumer-signed compositions',
  },
  {
    slug: 'serge-lutens',
    name: 'Serge Lutens',
    website: 'https://www.sergelutens.com',
    parentCompany: 'Shiseido',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 1992,
    description:
      'Serge Lutens\' perfume line grew out of his long work with Shiseido and the Salons du Palais Royal boutique in Paris, opened in 1992. Most of the catalogue was composed with perfumer Christopher Sheldrake and is known for dense, resinous, unusual ideas.',
    knownFor: 'Dark ambers, spice and resin',
  },
  {
    slug: 'hermes',
    name: 'Hermès',
    website: 'https://www.hermes.com',
    kind: 'designer',
    country: 'FR',
    city: 'Paris',
    founded: 1837,
    description:
      'Hermès started as a Paris harness workshop in 1837 and grew into one of the best-known luxury houses. Its perfumes are made in-house, and its perfumers have favoured restraint and transparency over volume.',
    knownFor: 'Airy, understated compositions',
  },
  {
    slug: 'escentric-molecules',
    name: 'Escentric Molecules',
    website: 'https://www.escentric.com',
    kind: 'niche',
    country: 'DE',
    city: 'Berlin',
    founded: 2006,
    description:
      'Escentric Molecules was started in 2006 by perfumer Geza Schoen. Each Molecule fragrance is a single aroma chemical in alcohol, paired with an Escentric fragrance built around the same material.',
    knownFor: 'Single-molecule fragrances',
  },
  {
    slug: 'juliette-has-a-gun',
    name: 'Juliette Has a Gun',
    website: 'https://www.juliettehasagun.com',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 2006,
    description:
      'Juliette Has a Gun was founded by Romano Ricci, a member of the Nina Ricci family. The brand has a playful, slightly irreverent tone and is best known for minimal, musky scents.',
    knownFor: 'Minimal musks and ambroxan',
  },
  {
    slug: 'xerjoff',
    name: 'Xerjoff',
    website: 'https://www.xerjoff.com',
    kind: 'niche',
    country: 'IT',
    city: 'Turin',
    founded: 2003,
    description:
      'Xerjoff is a Turin-based luxury house founded by Sergio Momo. Its large catalogue spans several collections, and it is known for opulent bottles and rich, sweet, long-lasting compositions.',
    knownFor: 'Opulent, sweet orientals',
  },
  {
    slug: 'kilian',
    name: 'Kilian Paris',
    website: 'https://www.bykilian.com',
    parentCompany: 'The Estée Lauder Companies',
    kind: 'niche',
    country: 'FR',
    city: 'Paris',
    founded: 2007,
    description:
      'Kilian was founded in 2007 by Kilian Hennessy, of the cognac family, and joined Estée Lauder in 2016. Its fragrances come in heavy refillable bottles and often play on boozy, sweet or sensual themes.',
    knownFor: 'Boozy gourmands and lush florals',
  },
  {
    slug: 'lattafa',
    name: 'Lattafa',
    website: 'https://www.lattafa.com',
    kind: 'regional',
    country: 'AE',
    city: 'Dubai',
    founded: 2012,
    description:
      'Lattafa is a Dubai-based perfume house making Arabian-style and Western-style fragrances at low prices. Its sweet, strong-performing scents found a big international audience online in the early 2020s.',
    knownFor: 'Affordable gourmands and ambers',
  },
  {
    slug: 'armaf',
    name: 'Armaf',
    website: 'https://www.armaf.com',
    parentCompany: 'Sterling Parfums',
    kind: 'regional',
    country: 'AE',
    city: 'Dubai',
    founded: 2010,
    description:
      'Armaf is a fragrance brand of the Dubai-based Sterling Parfums group. It is known for inexpensive, long-lasting fragrances, several of which are often compared with famous niche scents.',
    knownFor: 'Budget-friendly, strong performers',
  },
  {
    slug: 'rasasi',
    name: 'Rasasi',
    website: 'https://www.rasasi.com',
    kind: 'regional',
    country: 'AE',
    city: 'Dubai',
    founded: 1979,
    description:
      'Rasasi is a long-established Dubai perfume house making both traditional Arabian perfumery (attars, oud blends) and Western-style sprays. Its affordable sweet aquatic Hawas made it widely known outside the Gulf.',
    knownFor: 'Oud blends and sweet aquatics',
  },
  {
    slug: 'sol-de-janeiro',
    name: 'Sol de Janeiro',
    website: 'https://soldejaneiro.com',
    parentCompany: "L'Occitane Group",
    kind: 'mass',
    country: 'US',
    city: 'New York',
    founded: 2015,
    description:
      'Sol de Janeiro is a body care brand inspired by Brazilian beach culture, launched in 2015 with its Brazilian Bum Bum Cream. Its fragrance mists, which share scents with the creams, became a huge category on their own.',
    knownFor: 'Gourmand body mists',
  },
  {
    slug: 'bvlgari',
    name: 'Bvlgari',
    website: 'https://www.bulgari.com',
    parentCompany: 'LVMH',
    kind: 'designer',
    country: 'IT',
    city: 'Rome',
    founded: 1884,
    description:
      'Bvlgari was founded in Rome in 1884 as a silver and jewellery shop and is now part of LVMH. Its perfumes, launched from the 1990s, include tea-themed scents and several well-regarded experimental releases.',
    knownFor: 'Tea notes and jeweller-style bottles',
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
      'Tom Ford launched his own label in 2005 after his years at Gucci and Yves Saint Laurent, with beauty licensed to Estée Lauder from the start. The fragrance line splits into the Signature collection and the pricier Private Blend.',
    knownFor: 'Glamorous woods, ambers and tobacco',
  },
  {
    slug: 'jo-malone',
    name: 'Jo Malone London',
    website: 'https://www.jomalone.com',
    parentCompany: 'The Estée Lauder Companies',
    kind: 'designer',
    country: 'GB',
    city: 'London',
    founded: 1994,
    description:
      'Jo Malone London began with a London shop opened by Jo Malone in 1994 and was bought by Estée Lauder in 1999. It is known for simple, light colognes designed to be layered.',
    knownFor: 'Layerable colognes',
  },
  {
    slug: 'prada',
    name: 'Prada',
    website: 'https://www.prada.com',
    kind: 'designer',
    country: 'IT',
    city: 'Milan',
    founded: 1913,
    description:
      'Prada was founded in Milan in 1913 as a leather goods shop and became one of the major Italian fashion houses. Its fragrances are produced under licence by L\'Oréal and often play with iris, soap and clean, cerebral ideas.',
    knownFor: 'Clean iris and cerebral freshness',
  },
];
