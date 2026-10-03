/**
 * Writes public/bottles/manifest.json: one entry per catalogue fragrance with the bottle's real
 * height, a 16px blur placeholder of its poster, and the paths the stage reads.
 *
 *   npm run bottles:manifest
 *
 * The seed generator reads this file (scripts/generate-seed.ts) and refuses to build when a slug
 * is missing, so run it after `npm run bottles` or `npm run images` changes a poster. Height comes
 * from the same spec the renders are built from, so an illustration and a later photo cutout of
 * the same bottle scale identically on a shelf.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CM } from '../../src/lib/bottle/spec';
import { buildBottle } from '../../src/lib/bottle/build';
import { CATALOG } from '../../src/seed/real';

export interface ManifestEntry {
  /** Overall height, cap on, in millimetres. */
  heightMm: number;
  /** 16px-wide webp of the poster as a data URL, for `placeholder="blur"`. */
  blur: string | null;
  /** The poster or photo cutout the cards show. */
  poster: string | null;
  /** Stage layers from <slug>.layers.json, when the renderer wrote them. */
  layers: Record<string, unknown> | null;
}

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'public', 'bottles');
const BLUR_WIDTH = 16;

async function blurFor(file: string): Promise<string> {
  const buf = await sharp(file).resize({ width: BLUR_WIDTH }).webp({ quality: 50, alphaQuality: 50 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

const manifest: Record<string, ManifestEntry> = {};
const problems: string[] = [];

for (const f of CATALOG.fragrances) {
  // No document: decals and the blob shadow are skipped, neither changes the height.
  const built = buildBottle(f.bottle);
  // World units are decimetres (CM = 0.1 world per cm), so one world unit is 100mm; keep one decimal.
  const heightMm = Math.round((built.height / CM) * 10 * 10) / 10;
  if (!(heightMm > 20 && heightMm < 400)) problems.push(`${f.slug}: implausible height ${heightMm}mm`);

  const posterFile = path.join(DIR, `${f.slug}.webp`);
  const hasPoster = !f.noImage && existsSync(posterFile);
  if (!f.noImage && !hasPoster) problems.push(`${f.slug}: no poster at public/bottles/${f.slug}.webp (run npm run bottles)`);
  const layersFile = path.join(DIR, `${f.slug}.layers.json`);

  manifest[f.slug] = {
    heightMm,
    blur: hasPoster ? await blurFor(posterFile) : null,
    poster: hasPoster ? `/bottles/${f.slug}.webp` : null,
    layers: existsSync(layersFile) ? JSON.parse(readFileSync(layersFile, 'utf8')) : null,
  };
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(sorted, null, 2) + '\n');

const heights = Object.values(sorted).map((m) => m.heightMm);
console.log(
  `manifest.json: ${heights.length} bottles, heights ${Math.min(...heights)}–${Math.max(...heights)}mm, ` +
    `${Object.values(sorted).filter((m) => m.blur).length} blur placeholders`,
);
