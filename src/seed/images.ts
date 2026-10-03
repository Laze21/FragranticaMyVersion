/**
 * Real bottle photographs.
 *
 * Every entry is a product photo we are allowed to use, with its provenance. The source file is
 * dropped into `assets/photos/<slug>.<ext>` and `npm run images` turns it into a transparent
 * cutout at `public/bottles/<slug>.webp` (keying out a plain studio background if the file has
 * one). The seed generator writes a `fragrance_assets` row of kind `photo` with the licence and
 * credit, and the fragrance page shows the credit line.
 *
 * Acceptable sources, in order of preference:
 *   - photographs we took or commissioned (licence `proprietary`)
 *   - Wikimedia Commons photos under CC BY / CC BY-SA / CC0 (credit the photographer, link the file page)
 *   - press or product images with written permission from the house (keep the permission on file)
 *   - retailer partner feeds whose terms cover image use
 * Never images lifted from another fragrance database.
 *
 * `nozzle` is where the spray leaves the bottle, as fractions of the cutout's width and height
 * (0,0 = top left); the stage uses it as the origin of the scent animation. Leave it out and the
 * stage assumes the top centre.
 */

export type ImageLicense = 'proprietary' | 'CC0' | 'CC BY 4.0' | 'CC BY-SA 4.0' | 'CC BY 3.0' | 'CC BY-SA 3.0' | 'CC BY 2.0' | 'CC BY-SA 2.0' | 'permission';

export interface BottlePhoto {
  slug: string;
  /** File name inside assets/photos (png, jpg or webp). */
  file: string;
  license: ImageLicense;
  /** Who to credit, as it should appear on the page: "Photo: Jane Doe". */
  credit: string;
  /** Where it came from (the Commons file page, the press kit, our own shoot). */
  sourceUrl: string | null;
  /** Date the licence was checked, ISO. */
  verifiedAt: string;
  /** Background of the source file: `transparent` is used as-is, `white` is keyed out. */
  background: 'transparent' | 'white';
  nozzle?: { x: number; y: number };
  notes?: string;
}

export const BOTTLE_PHOTOS: BottlePhoto[] = [
  // No licensed photographs yet. Until they arrive every bottle shows its labelled illustration.
];
