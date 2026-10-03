import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getFragrance } from '@/lib/data/catalog';
import { APP_NAME } from '@/lib/config';
import { longevityPercentile, longevityTickText, markGeometry, MARK_FILLS, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META } from '@/lib/scent/vocab';
import { histAvg, topDims } from '@/lib/scent/read';
import { trailThumbSvg } from '@/components/scent/trailThumbScene';

export const alt = 'Fragrance card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#1c1a17';
const PORCELAIN = '#f3f0ea';

const root = process.cwd();
// Static instances of the site fonts (see scripts/fonts/strip-variations.mjs): Satori cannot read the variable subsets.
let fonts: Promise<[Buffer, Buffer]> | undefined;
const loadFonts = () => (fonts ??= Promise.all([readFile(path.join(root, 'src/fonts/og/newsreader-italic.ttf')), readFile(path.join(root, 'src/fonts/og/archivo.ttf'))]));

/** The mark as a standalone SVG string, since Satori cannot read our React components' styles. */
function markSvg(width: number, height: number) {
  const m = markGeometry(40, 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 40 16">${m.bands
    .map((b, i) => `<path d="${b.path}" fill="${INK}" fill-opacity="${MARK_FILLS[i] ?? 1}"/>`)
    .join('')}</svg>`;
}
const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/** The share card: bottle, name, house, top character, the Trail, and the community score. */
export default async function OG(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const f = await getFragrance(slug);
  const [serif, sans] = await loadFonts();
  if (!f) {
    return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: PORCELAIN }} />, { ...size });
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
  const input: TrailInput = {
    character: f.stats.character,
    longevityHrs: f.stats.longevityMedian,
    longevityLateHrs: longevityPercentile(f.stats.longevityHist, 0.72),
    projectionOpening: histAvg(f.stats.projectionOpeningHist),
    projectionLater: histAvg(f.stats.projectionLaterHist),
    heartAtMin: f.heartAtMin,
    drydownAtMin: f.drydownAtMin,
  };
  const trail = trailThumbSvg(input, 'og', { ink: INK, porcelain: PORCELAIN, stone2: '#c9c2b6' });
  const tick = longevityTickText(input);
  const wash = mix(f.accent, PORCELAIN, 0.16);
  const rating = f.stats.ratingAvg && f.stats.ratingCount >= 5 ? f.stats.ratingAvg.toFixed(1) : null;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: PORCELAIN, fontFamily: 'Archivo', color: INK }}>
        <div style={{ display: 'flex', width: 460, height: '100%', background: wash, alignItems: 'center', justifyContent: 'center' }}>
          {poster ? <img src={poster} width={360} height={480} alt="" /> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 60px', flex: 1 }}>
          <div style={{ fontSize: 28, color: '#47423c' }}>{f.brandName}</div>
          <div style={{ fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: f.name.length > 22 ? 64 : 88, lineHeight: 1.02, marginTop: 8 }}>{f.name}</div>
          <div style={{ display: 'flex', gap: 22, marginTop: 26, fontSize: 28 }}>
            {dims.map((d) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, height: 16, background: DIMENSION_META[d].hue, border: '1px solid rgba(28,26,23,0.2)' }} />
                {DIMENSION_META[d].label}
              </div>
            ))}
          </div>
          <img src={dataUri(trail)} width={560} height={70} style={{ marginTop: 28 }} alt="" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 20, color: '#6a645b' }}>
            <img src={dataUri(markSvg(30, 12))} width={30} height={12} alt="" />
            <span>Trail{tick ? ` · ${tick}` : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {rating ? <div style={{ fontSize: 64 }}>{rating}</div> : null}
              {rating ? <div style={{ fontSize: 24, color: '#6a645b' }}>/10</div> : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 30 }}>
              <img src={dataUri(markSvg(50, 20))} width={50} height={20} alt="" />
              <span>{APP_NAME}</span>
            </div>
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
