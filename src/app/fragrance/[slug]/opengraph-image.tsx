import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getFragrance } from '@/lib/data/catalog';
import { APP_NAME } from '@/lib/config';
import { buildTrail } from '@/lib/scent/trail';
import { DIMENSION_META } from '@/lib/scent/vocab';
import { histAvg, topDims } from '@/lib/scent/read';

export const alt = 'Fragrance card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const root = process.cwd();
const fonts = Promise.all([readFile(path.join(root, 'src/fonts/og/newsreader-italic.ttf')), readFile(path.join(root, 'src/fonts/og/archivo.ttf'))]);

/** The share card: bottle, name, house, top character, the Trail, and the community score. */
export default async function OG(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const f = await getFragrance(slug);
  const [serif, sans] = await fonts;
  if (!f) {
    return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#f2f0eb' }} />, { ...size });
  }
  let poster: string | null = null;
  if (f.poster) {
    try {
      const png = await sharp(path.join(root, 'public', f.poster)).resize(420, 560, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      poster = `data:image/png;base64,${png.toString('base64')}`;
    } catch {
      poster = null;
    }
  }
  const dims = topDims(f.stats.character.overall, 3, 0.15);
  const trail = buildTrail(
    {
      character: f.stats.character,
      longevityHrs: f.stats.longevityMedian,
      projectionOpening: histAvg(f.stats.projectionOpeningHist),
      projectionLater: histAvg(f.stats.projectionLaterHist),
      heartAtMin: f.heartAtMin,
      drydownAtMin: f.drydownAtMin,
    },
    560,
    70,
    { samples: 40 },
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="70" viewBox="0 0 560 70">${trail.bands
    .map((b) => `<path d="${b.path}" fill="${DIMENSION_META[b.dim].hue}" stroke="#f2f0eb" stroke-width="1"/>`)
    .join('')}</svg>`;
  const wash = mix(f.accent, '#f2f0eb', 0.16);
  const rating = f.stats.ratingAvg && f.stats.ratingCount >= 5 ? f.stats.ratingAvg.toFixed(1) : null;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f2f0eb', fontFamily: 'Archivo', color: '#1c1a17' }}>
        <div style={{ display: 'flex', width: 460, height: '100%', background: wash, alignItems: 'center', justifyContent: 'center' }}>
          {poster ? <img src={poster} width={360} height={480} alt="" /> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 60px', flex: 1 }}>
          <div style={{ fontSize: 28, color: '#47423c' }}>{f.brandName}</div>
          <div style={{ fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: f.name.length > 22 ? 64 : 88, lineHeight: 1.02, marginTop: 8 }}>{f.name}</div>
          <div style={{ display: 'flex', gap: 22, marginTop: 26, fontSize: 28 }}>
            {dims.map((d) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: DIMENSION_META[d].hue }} />
                {DIMENSION_META[d].label}
              </div>
            ))}
          </div>
          <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={560} height={70} style={{ marginTop: 28 }} alt="" />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 34 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {rating ? <div style={{ fontSize: 64 }}>{rating}</div> : null}
              {rating ? <div style={{ fontSize: 24, color: '#6a645b' }}>/10</div> : null}
            </div>
            <div style={{ fontSize: 30, letterSpacing: -1 }}>{APP_NAME.toLowerCase()}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Newsreader', data: serif, style: 'italic', weight: 400 },
        { name: 'Archivo', data: sans, style: 'normal', weight: 400 },
      ],
    },
  );
}

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t))).join(',')})`;
}
