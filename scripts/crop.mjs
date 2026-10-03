// Dev helper: node scripts/crop.mjs in.png outPrefix [sliceHeight]
import sharp from 'sharp';
const [, , input, prefix, slice = '1400'] = process.argv;
const meta = await sharp(input).metadata();
const n = Math.ceil(meta.height / +slice);
for (let i = 0; i < Math.min(n, 8); i++) {
  const top = i * +slice;
  await sharp(input).extract({ left: 0, top, width: meta.width, height: Math.min(+slice, meta.height - top) }).toFile(`${prefix}_${i}.png`);
}
console.log(meta.width, meta.height, n);
