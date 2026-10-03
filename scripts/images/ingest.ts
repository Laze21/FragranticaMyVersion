/**
 * Turns the photographs listed in src/seed/images.ts into the cutouts the site serves.
 *
 *   npm run images              # every photo in the manifest
 *   npm run images -- chanel-no-5
 *
 * Input:  assets/photos/<file>   (png/jpg/webp; transparent, or a plain white studio background)
 * Output: public/bottles/<slug>.webp   900x1200, transparent, bottle centred with breathing room
 *         public/bottles/<slug>.json   the trimmed bottle's box inside the frame (for the stage)
 *
 * White backgrounds are keyed with a soft matte: pixels close to white become transparent, the
 * falloff keeps anti-aliased edges, and a light erosion removes the halo. This is deliberately
 * simple; a photo with shadows or a coloured backdrop should be cut out properly first.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { BOTTLE_PHOTOS } from '../../src/seed/images';

const ROOT = process.cwd();
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const OUT_W = 900;
const OUT_H = 1200;
const PAD = 0.06;

async function keyWhite(input: Sharp): Promise<Buffer> {
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  // Distance from white -> alpha. Fully white (and near-white) is background; the ramp keeps edges.
  const LO = 18; // below this distance: transparent
  const HI = 70; // above this: opaque
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const dist = Math.max(255 - r, 255 - g, 255 - b);
    const a = dist <= LO ? 0 : dist >= HI ? 255 : Math.round(((dist - LO) / (HI - LO)) * 255);
    out[o + 3] = Math.min(data[o + 3], a);
  }
  // Un-premultiply the halo: pull edge pixels away from white so they do not look fogged.
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const a = out[o + 3];
    if (a > 0 && a < 255) {
      const k = 255 / a;
      for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round(255 - (255 - out[o + c]) * k)));
    }
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

async function run() {
  const jobs = BOTTLE_PHOTOS.filter((p) => !only.length || only.includes(p.slug));
  if (!jobs.length) {
    console.log('No photos in the manifest (src/seed/images.ts). Drop files into assets/photos and list them there.');
    return;
  }
  mkdirSync(path.join(ROOT, 'public/bottles'), { recursive: true });
  for (const p of jobs) {
    const src = path.join(ROOT, 'assets/photos', p.file);
    if (!existsSync(src)) {
      console.error(`[${p.slug}] missing ${src}`);
      continue;
    }
    const t0 = Date.now();
    let img = sharp(src, { limitInputPixels: false }).rotate();
    let buf: Buffer;
    if (p.background === 'white') buf = await keyWhite(img);
    else buf = await img.ensureAlpha().png().toBuffer();
    // Trim to the bottle, then fit into the frame with padding.
    const trimmed = sharp(buf).trim({ threshold: 8 });
    const meta = await trimmed.metadata();
    const tw = meta.width ?? 1;
    const th = meta.height ?? 1;
    const innerW = OUT_W * (1 - PAD * 2);
    const innerH = OUT_H * (1 - PAD * 2);
    const scale = Math.min(innerW / tw, innerH / th);
    const w = Math.round(tw * scale);
    const h = Math.round(th * scale);
    const left = Math.round((OUT_W - w) / 2);
    const top = Math.round(OUT_H * (1 - PAD) - h); // bottles stand on the same floor line
    const resized = await trimmed.resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
    await sharp({ create: { width: OUT_W, height: OUT_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left, top }])
      .webp({ quality: 86, alphaQuality: 92, effort: 5 })
      .toFile(path.join(ROOT, `public/bottles/${p.slug}.webp`));
    const box = { x: left / OUT_W, y: top / OUT_H, w: w / OUT_W, h: h / OUT_H, nozzle: p.nozzle ?? { x: 0.5, y: 0.02 } };
    writeFileSync(path.join(ROOT, `public/bottles/${p.slug}.json`), JSON.stringify(box));
    console.log(`${p.slug}  ${w}x${h} in frame  ${Date.now() - t0}ms`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
