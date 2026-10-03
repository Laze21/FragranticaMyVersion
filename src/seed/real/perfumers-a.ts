import type { SeedPerfumer } from '../types';

/**
 * Perfumers referenced by the Group A real fragrances.
 * Research note: Wikipedia/Wikidata and house pages were not reachable from the research
 * environment, so bios are kept to widely published career facts, birth years are omitted unless
 * certain, and no wikidataQid or sourceUrl is given (nothing was opened to cite).
 */
export const PERFUMERS_A: SeedPerfumer[] = [
  {
    slug: 'francois-demachy',
    name: 'François Demachy',
    country: 'FR',
    bio: 'French perfumer who spent decades at Chanel before becoming Dior\'s in-house perfume creation director in 2006. He composed Sauvage and reworked many Dior classics before handing over to Francis Kurkdjian in 2021.',
    signature: 'Clean, high-impact designer freshness',
  },
  {
    slug: 'jacques-polge',
    name: 'Jacques Polge',
    country: 'FR',
    bio: 'Chanel\'s in-house perfumer from 1978 until 2015, when his son Olivier succeeded him. His Chanel work includes Coco, Allure, Coco Mademoiselle and Bleu de Chanel.',
    signature: 'Smooth, polished florals and woods',
  },
  {
    slug: 'olivier-polge',
    name: 'Olivier Polge',
    country: 'FR',
    bio: 'Perfumer who worked at IFF before succeeding his father Jacques as Chanel\'s in-house perfumer in 2015. Before Chanel he co-created La Vie Est Belle and composed Dior Homme.',
    signature: 'Iris, soft woods, quiet precision',
  },
  {
    slug: 'alberto-morillas',
    name: 'Alberto Morillas',
    country: 'ES',
    bio: 'Seville-born perfumer at Firmenich, based in Geneva for most of his career. He composed Acqua di Giò pour Homme and co-created CK One, two of the defining fresh fragrances of the 1990s.',
    signature: 'Musky, transparent freshness',
  },
  {
    slug: 'dominique-ropion',
    name: 'Dominique Ropion',
    country: 'FR',
    bio: 'Long-serving perfumer at IFF known for both technically complex niche work and huge designer launches. He composed YSL Y and co-created La Vie Est Belle.',
    signature: 'Dense, radiant structures',
  },
  {
    slug: 'jean-claude-ellena',
    name: 'Jean-Claude Ellena',
    country: 'FR',
    bio: 'Perfumer from Grasse who was Hermès\'s first in-house perfumer, from 2004 until 2016. He is known for sparse, watercolour-like compositions such as Terre d\'Hermès and the Hermès garden series.',
    signature: 'Minimal, airy sketches',
  },
  {
    slug: 'aurelien-guichard',
    name: 'Aurélien Guichard',
    country: 'FR',
    bio: 'French perfumer from a Grasse perfume family. He composed Versace Eros.',
    signature: 'Bright, sweet and youthful',
  },
  {
    slug: 'francis-kurkdjian',
    name: 'Francis Kurkdjian',
    country: 'FR',
    bio: 'Paris perfumer who composed Le Male in the mid-1990s, co-founded Maison Francis Kurkdjian in 2009 and became Dior\'s perfume creation director in 2021.',
    signature: 'Glowing musks and polished ambers',
  },
  {
    slug: 'christophe-raynaud',
    name: 'Christophe Raynaud',
    country: 'FR',
    bio: 'French perfumer with a long list of designer launches. He co-created Paco Rabanne 1 Million.',
  },
  {
    slug: 'olivier-pescheux',
    name: 'Olivier Pescheux',
    country: 'FR',
    bio: 'French perfumer with a long career at Givaudan. He co-created Paco Rabanne 1 Million.',
  },
  {
    slug: 'michel-girard',
    name: 'Michel Girard',
    country: 'FR',
    bio: 'French perfumer at Givaudan. He co-created Paco Rabanne 1 Million.',
  },
  {
    slug: 'daniela-andrier',
    name: 'Daniela Andrier',
    country: 'DE',
    bio: 'German-born perfumer at Givaudan who has composed most of Prada\'s fragrance line since the early 2000s, including Prada L\'Homme and the Infusion series.',
    signature: 'Clean iris and soapy powder',
  },
  {
    slug: 'pierre-bourdon',
    name: 'Pierre Bourdon',
    country: 'FR',
    bio: 'French perfumer whose best-known works include Davidoff Cool Water and Yves Saint Laurent Kouros. Cool Water helped set the template for fresh aromatic masculines in the 1990s.',
    signature: 'Fresh, emphatic aromatics',
  },
  {
    slug: 'edmond-roudnitska',
    name: 'Edmond Roudnitska',
    country: 'FR',
    bornYear: 1905,
    bio: 'One of the most influential French perfumers of the 20th century, who composed Diorissimo, Diorella and Eau Sauvage for Dior. He also wrote widely about perfume as an art form.',
    signature: 'Clarity, restraint, airy florals',
  },
  {
    slug: 'ernest-beaux',
    name: 'Ernest Beaux',
    country: 'FR',
    bornYear: 1881,
    bio: 'Moscow-born French perfumer who trained at the Rallet perfume house in Russia and composed Chanel N°5 in 1921. He became Chanel\'s first in-house perfumer.',
    signature: 'Aldehydic abstraction',
  },
  {
    slug: 'nathalie-lorson',
    name: 'Nathalie Lorson',
    country: 'FR',
    bio: 'Perfumer at Firmenich with a long list of mainstream launches. She co-created YSL Black Opium.',
  },
  {
    slug: 'marie-salamagne',
    name: 'Marie Salamagne',
    country: 'FR',
    bio: 'Perfumer at Firmenich who has worked on both designer and niche launches. She co-created YSL Black Opium.',
  },
  {
    slug: 'olivier-cresp',
    name: 'Olivier Cresp',
    country: 'FR',
    bio: 'Veteran Firmenich perfumer from a Grasse family who co-created Mugler Angel. He also co-created YSL Black Opium.',
    signature: 'Bold, sweet, fruity signatures',
  },
  {
    slug: 'honorine-blanc',
    name: 'Honorine Blanc',
    country: 'FR',
    bio: 'Perfumer at Firmenich who has worked on many designer launches. She co-created YSL Black Opium.',
  },
  {
    slug: 'anne-flipo',
    name: 'Anne Flipo',
    country: 'FR',
    bio: 'Perfumer at IFF known for luminous florals in both designer and niche work. She co-created La Vie Est Belle.',
    signature: 'Luminous, natural-feeling florals',
  },
];
