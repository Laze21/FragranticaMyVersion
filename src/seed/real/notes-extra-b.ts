import type { SeedNote } from '../types';

/**
 * Notes used by group B fragrances that have no honest match in notes.ts.
 * Written in our own words. Follows src/seed/VOICE.md.
 */
export const NOTES_EXTRA_B: SeedNote[] = [
  {
    slug: 'orchid',
    name: 'Orchid',
    kind: 'accord',
    family: 'floral',
    aliases: ['vanilla orchid', 'cattleya orchid'],
    smellsLike:
      'A soft, creamy floral with a faint vanilla sweetness. Most orchids barely smell at all, so in perfume the word describes a mood more than a flower.',
    origin:
      'No orchid oil is produced for perfumery. The note is assembled from creamy, slightly powdery floral and vanillic molecules; vanilla itself is the cured pod of an orchid.',
    contributes:
      'Rounds off brighter florals and gives a heart a plush, sweet texture without obvious fruit.',
    synthetic: true,
    volatility: 'heart',
    character: { floral: 0.6, creamy: 0.3, sweet: 0.3, powdery: 0.2 },
    hue: '#B48FA6',
  },
  {
    slug: 'freesia',
    name: 'Freesia',
    kind: 'accord',
    family: 'floral',
    smellsLike:
      'Light, airy and a little peppery-sweet, like a bunch of freesias in a cool room. Brighter and greener than rose.',
    origin:
      'Freesia flowers are not extracted commercially. Perfumers rebuild the scent with fresh floral aroma chemicals such as linalool and related molecules.',
    contributes: 'Adds lift and a clean, watery brightness to a floral heart.',
    synthetic: true,
    volatility: 'heart',
    character: { floral: 0.6, fresh: 0.4, clean: 0.2 },
    hue: '#B5A8C0',
  },
  {
    slug: 'strawberry',
    name: 'Strawberry',
    kind: 'accord',
    family: 'fruity',
    aliases: ['wild strawberry'],
    smellsLike:
      'Ripe, jammy red berry, somewhere between fresh strawberries and strawberry sweets.',
    origin:
      'Strawberries give no usable oil. The note is built from fruity esters and caramel-leaning molecules, often with a green or creamy twist to keep it from smelling like candy.',
    contributes: 'A playful, sweet fruit opening that reads young and cheerful.',
    synthetic: true,
    volatility: 'top',
    character: { fruity: 0.8, sweet: 0.5 },
    hue: '#B9636A',
  },
  {
    slug: 'passion-fruit',
    name: 'Passion fruit',
    kind: 'accord',
    family: 'fruity',
    aliases: ['passionfruit', 'purple passion fruit'],
    smellsLike:
      'Tart, tropical and juicy, with the slightly sulfurous tang you get from scooping out fresh passion fruit pulp.',
    origin:
      'Built from synthetic tropical-fruit molecules, including sulfur compounds used in tiny amounts. Natural extracts are rarely used in fine fragrance.',
    contributes: 'A loud, sunny fruit top note that gives a fragrance instant juiciness.',
    synthetic: true,
    volatility: 'top',
    character: { fruity: 0.8, sweet: 0.3, fresh: 0.3 },
    hue: '#A9824F',
  },
  {
    slug: 'white-woods',
    name: 'White woods',
    kind: 'accord',
    family: 'woody',
    aliases: ['blond woods', 'blonde woods'],
    smellsLike:
      'A pale, clean wood impression with a soft creamy edge, without the smoke, resin or earthiness of darker woods.',
    origin:
      'Not a tree. A perfumer\'s accord, usually built from synthetic woody and musky molecules in the cedar and cashmeran style.',
    contributes: 'A quiet, tidy base that lets florals and fruits fade out cleanly.',
    synthetic: true,
    volatility: 'base',
    character: { woody: 0.5, clean: 0.4, creamy: 0.3 },
    hue: '#CBBEA6',
  },
  {
    slug: 'fir-resin',
    name: 'Fir resin',
    kind: 'material',
    family: 'resinous',
    aliases: ['fir balsam', 'fir balsam absolute'],
    smellsLike:
      'Sweet, balsamic pine with a faintly jammy depth, like sticky sap on the trunk of a fir tree.',
    origin:
      'An oleoresin collected from the bark of fir trees and usually sold as an absolute. The needles give a separate, greener oil.',
    contributes: 'Adds a warm, resinous sweetness that bridges woods and ambers.',
    synthetic: false,
    volatility: 'base',
    character: { woody: 0.5, warm: 0.4, sweet: 0.3, green: 0.2, smoky: 0.1 },
    hue: '#7D6A47',
  },
  {
    slug: 'dried-fruit',
    name: 'Dried fruit',
    kind: 'accord',
    family: 'fruity',
    aliases: ['dried fruits', 'dates', 'raisins'],
    smellsLike:
      'Dense, sticky sweetness like dates, raisins and dried figs. More jam jar than orchard.',
    origin:
      'An accord rather than one material, built from fruity lactones and caramel-like molecules, sometimes with natural absolutes for depth.',
    contributes: 'Gives tobacco and amber compositions a rich, edible middle.',
    synthetic: 'both',
    volatility: 'heart',
    character: { fruity: 0.5, sweet: 0.6, warm: 0.4 },
    hue: '#7A4B3B',
  },
  {
    slug: 'rosewood',
    name: 'Rosewood',
    kind: 'material',
    family: 'woody',
    aliases: ['bois de rose'],
    smellsLike:
      'Soft, rosy wood with a slightly spicy, lavender-like freshness. Smoother and more floral than cedar.',
    origin:
      'Traditionally distilled from the Amazonian tree Aniba rosaeodora, now a protected species. Perfumes use certified oil or rebuild the effect around linalool, its main component.',
    contributes: 'A polished, gently floral wood that softens spice and darker woods.',
    synthetic: 'both',
    volatility: 'heart',
    character: { woody: 0.5, floral: 0.3, fresh: 0.2, spicy: 0.1 },
    hue: '#965E50',
  },
  {
    slug: 'sichuan-pepper',
    name: 'Sichuan pepper',
    kind: 'material',
    family: 'spice',
    aliases: ['Chinese pepper', 'Szechuan pepper', 'timut pepper'],
    smellsLike:
      'Bright, citrusy and tingly, closer to grapefruit peel and lemon than to black pepper.',
    origin:
      'Extracted from the dried husks of Zanthoxylum berries, a relative of citrus, by distillation or CO2 extraction.',
    contributes: 'A zesty, prickly lift for openings that would otherwise feel heavy.',
    synthetic: false,
    volatility: 'top',
    character: { spicy: 0.6, fresh: 0.5 },
    hue: '#8C5B3E',
  },
];
