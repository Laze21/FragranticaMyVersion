import type { SeedNote } from '../types';

/**
 * Notes needed by the Group A real catalogue that have no honest match in notes.ts.
 * Written in our own words. Follows src/seed/VOICE.md.
 */
export const NOTES_EXTRA_A: SeedNote[] = [
  {
    slug: 'sichuan-pepper',
    name: 'Sichuan pepper',
    kind: 'material',
    family: 'spice',
    aliases: ['szechuan pepper', 'timut pepper', 'sansho'],
    smellsLike:
      'Peppery and citrusy at once, closer to grapefruit peel and lemon grass than to black pepper, with a faint tingling brightness.',
    origin:
      'The dried husks of several Zanthoxylum shrubs, a relative of citrus rather than true pepper. Perfumers use the essential oil or a CO2 extract, often supported by synthetic pepper notes.',
    contributes:
      'Adds a zesty, slightly fizzy spice that makes fresh openings feel sharper and more modern.',
    synthetic: 'both',
    volatility: 'top',
    character: { spicy: 0.7, fresh: 0.5, fruity: 0.1 },
    hue: '#9C6B4E',
  },
  {
    slug: 'hedione',
    name: 'Hedione',
    kind: 'material',
    family: 'floral',
    aliases: ['methyl dihydrojasmonate', 'mdj'],
    smellsLike:
      'Airy, watery jasmine with a hint of citrus, more like the air around a flowering bush than the flower itself.',
    origin:
      'A synthetic molecule related to a compound found in jasmine, introduced to perfumery in the 1960s. Today it sits in a huge share of fine fragrances at some level.',
    contributes:
      'Adds space and diffusion: it makes citrus and florals feel bigger, softer and more transparent without reading as a separate note.',
    synthetic: true,
    volatility: 'heart',
    character: { floral: 0.5, fresh: 0.5, clean: 0.3 },
    hue: '#D6D2B8',
  },
  {
    slug: 'lotus',
    name: 'Lotus',
    kind: 'accord',
    family: 'floral',
    aliases: ['lotus flower', 'water lily', 'nymphaea'],
    smellsLike: 'A pale, watery floral, a little green and a little powdery, like a pond flower on a cool morning.',
    origin:
      'Lotus extracts exist but are rare in perfumery. The note is almost always an accord built from aquatic, green and soft floral molecules.',
    contributes: 'Gives a calm, watery floral tone that sits between fresh and floral without much sweetness.',
    synthetic: 'both',
    volatility: 'heart',
    character: { floral: 0.5, fresh: 0.4, green: 0.3, clean: 0.2 },
    hue: '#C9B9C4',
  },
  {
    slug: 'green-leaves',
    name: 'Green leaves',
    kind: 'accord',
    family: 'green',
    aliases: ['green notes', 'leaves', 'green leaf', 'leafy notes'],
    smellsLike: 'Crushed leaves and snapped stems: sappy, slightly bitter and very fresh.',
    origin:
      'An accord built mostly from synthetic leaf-alcohol type molecules (the smell of freshly broken greenery), sometimes with galbanum or violet leaf.',
    contributes: 'Adds an outdoorsy, sappy lift to the opening and keeps sweet or aquatic notes from feeling flat.',
    synthetic: 'both',
    volatility: 'top',
    character: { green: 0.8, fresh: 0.5 },
    hue: '#7E9A6A',
  },
  {
    slug: 'coriander',
    name: 'Coriander',
    kind: 'material',
    family: 'spice',
    aliases: ['coriander seed', 'cilantro seed'],
    smellsLike:
      'Warm, gently spicy and a little citrusy, with a soft woody edge. The seed smells nothing like the soapy fresh leaf.',
    origin: 'Steam-distilled from the dried seeds of the coriander plant, grown widely in Russia, Ukraine and India.',
    contributes: 'Bridges citrus and spice in the opening and gives aromatic fougeres a soft, slightly peppery warmth.',
    synthetic: false,
    volatility: 'top',
    character: { spicy: 0.5, fresh: 0.4, woody: 0.2 },
    hue: '#A8925E',
  },
  {
    slug: 'amberwood',
    name: 'Amberwood',
    kind: 'accord',
    family: 'woody',
    aliases: ['ambery woods', 'amber wood', 'amberwoods', 'ambery wood'],
    smellsLike: 'Dry, warm and slightly scratchy woods with a mineral, ambery glow. Loud and very long-lasting.',
    origin:
      'A modern accord built from powerful synthetic woody-amber molecules, often alongside ambroxan. Not related to amber resin.',
    contributes:
      'Gives a radiant, persistent woody base that carries a fragrance for hours and adds a clean, dry sparkle.',
    synthetic: true,
    volatility: 'base',
    character: { woody: 0.7, warm: 0.4, clean: 0.2 },
    hue: '#A68A6B',
  },
  {
    slug: 'white-woods',
    name: 'White woods',
    kind: 'accord',
    family: 'woody',
    aliases: ['white wood', 'blond wood', 'pale woods'],
    smellsLike: 'Soft, clean and slightly creamy wood, like freshly planed pale timber with no smoke or resin.',
    origin:
      'A perfumer accord rather than a single tree, usually built from synthetic woody molecules such as cedar-type and musky-woody materials.',
    contributes: 'Gives a smooth, light woody floor that lets louder notes above it take the spotlight.',
    synthetic: true,
    volatility: 'base',
    character: { woody: 0.6, clean: 0.4, creamy: 0.2 },
    hue: '#C9B89A',
  },
];
