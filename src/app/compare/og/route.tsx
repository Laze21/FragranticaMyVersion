import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import sharp from 'sharp';
import { getFragrance } from '@/lib/data/catalog';
import type { FragranceDetail } from '@/lib/data/types';
import { APP_NAME } from '@/lib/config';
import { longevityPercentile, markGeometry, MARK_FILLS, xScale, type TrailInput } from '@/lib/scent/trail';
import { histAvg } from '@/lib/scent/read';
import { trailThumbSvg } from '@/components/scent/trailThumbScene';

/*
 * The share card for a comparison: up to four bottles on one ledge at their real heights, the
 * italic names, and the Trails stacked on one shared axis, "Compared on {APP_NAME}". This is a
 * route handler rather than the opengraph-image convention because that convention receives
 * route params only, and a comparison lives in the query string (?f=a,b,c).
 */
export const runtime = 'nodejs';

const W = 1200;
const H = 630;
const INK = '#1c1a17';
const INK_2 = '#47423c';
const INK_3 = '#6a645b';
const PORCELAIN = '#f3f0ea';
const LINE = '#c9c2b6';
const LEDGE_TOP = '#cdbfa6';
const LEDGE_FRONT = '#8f8168';
const TRAIL_W = 540;
const AXIS_HOURS = [0, 2, 4, 8, 12];

const root = process.cwd();
let fonts: Promise<[Buffer, Buffer]> | undefined;
const loadFonts = () => (fonts ??= Promise.all([readFile(path.join(root, 'src/fonts/og/newsreader-italic.ttf')), readFile(path.join(root, 'src/fonts/og/archivo.ttf'))]));

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

function markSvg(width: number, height: number) {
  const m = markGeometry(40, 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 40 16">${m.bands
    .map((b, i) => `<path d="${b.path}" fill="${INK}" fill-opacity="${MARK_FILLS[i] ?? 1}"/>`)
    .join('')}</svg>`;
}

/* The ruler the stacked Trails share: Spray · 2h · 4h · 8h · 12h on the thumb's 560-wide scale. */
function axisSvg(width: number) {
  const x = xScale(560);
  const scale = width / 560;
  const ticks = AXIS_HOURS.map((h) => {
    const px = x(h) * scale;
    const anchor = h === 0 ? 'start' : h === 12 ? 'end' : 'middle';
    return `<line x1="${px}" x2="${px}" y1="1" y2="7" stroke="${LINE}" stroke-width="1.5"/><text x="${px}" y="26" text-anchor="${anchor}" font-family="Archivo" font-size="16" fill="${INK_3}">${h === 0 ? 'Spray' : `${h}h`}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32" viewBox="0 0 ${width} 32"><line x1="0" x2="${width}" y1="1.5" y2="1.5" stroke="${LINE}" stroke-width="1.5"/>${ticks.join('')}</svg>`;
}

/* Same mapping as the card and the compare heads: 70mm to 170mm fills 60 to 100% of the slot. */
function slotHeight(mm: number | null): number {
  if (!mm) return 0.76;
  const t = Math.min(1, Math.max(0, (mm - 70) / 100));
  return 0.6 + t * 0.4;
}

async function posterPng(f: FragranceDetail, box: number): Promise<string | null> {
  if (!f.poster) return null;
  try {
    const png = await sharp(path.join(root, 'public', f.poster)).resize(box, box, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const slugs = (req.nextUrl.searchParams.get('f') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 4);
  const [serif, sans] = await loadFonts();
  const items = (await Promise.all(slugs.map((s) => getFragrance(s)))).filter(Boolean) as FragranceDetail[];
  const fontOpts = {
    width: W,
    height: H,
    fonts: [
      { name: 'Newsreader', data: serif, style: 'italic' as const, weight: 400 as const },
      { name: 'Archivo', data: sans, style: 'normal' as const, weight: 400 as const },
    ],
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  };

  if (items.length === 0) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', height: '100%', padding: '0 96px', background: PORCELAIN, color: INK, fontFamily: 'Archivo' }}>
          <div style={{ fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: 72, lineHeight: 1.05 }}>Two to four fragrances, side by side.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 36, fontSize: 30 }}>
            <img src={dataUri(markSvg(50, 20))} width={50} height={20} alt="" />
            <span>{APP_NAME}</span>
          </div>
        </div>
      ),
      fontOpts,
    );
  }

  const n = items.length;
  const slot = 300;
  const posters = await Promise.all(items.map((f) => posterPng(f, slot)));
  const nameSize = n <= 2 ? 40 : n === 3 ? 34 : 28;
  const trailH = n === 4 ? 52 : 64;
  const trails = items.map((f) => {
    const input: TrailInput = {
      character: f.stats.character,
      longevityHrs: f.stats.longevityMedian,
      longevityLateHrs: longevityPercentile(f.stats.longevityHist, 0.72),
      projectionOpening: histAvg(f.stats.projectionOpeningHist),
      projectionLater: histAvg(f.stats.projectionLaterHist),
      heartAtMin: f.heartAtMin,
      drydownAtMin: f.drydownAtMin,
    };
    return dataUri(trailThumbSvg(input, 'og', { ink: INK, porcelain: PORCELAIN, stone2: LINE }));
  });

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: PORCELAIN, color: INK, fontFamily: 'Archivo' }}>
        {/* The ledge: bottles bottom-aligned at their real heights on a two-faced plank. */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: 520, height: '100%', padding: '0 0 64px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: slot, padding: '0 12px' }}>
            {items.map((f, i) => {
              const h = Math.round(slot * slotHeight(f.bottleHeightMm));
              return posters[i] ? <img key={f.slug} src={posters[i]!} height={h} width={Math.round(h * 0.75)} style={{ objectFit: 'contain', objectPosition: 'bottom' }} alt="" /> : <div key={f.slug} style={{ width: 60, height: h, background: LINE }} />;
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ height: 12, background: LEDGE_TOP }} />
            <div style={{ height: 8, background: LEDGE_FRONT }} />
          </div>
        </div>

        {/* Names and their Trails on one ruler. */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, padding: '48px 56px 56px 32px' }}>
          {items.map((f, i) => (
            <div key={f.slug} style={{ display: 'flex', flexDirection: 'column', marginBottom: n === 4 ? 10 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: nameSize, lineHeight: 1.05 }}>{f.name}</span>
                <span style={{ fontSize: 18, color: INK_2 }}>{f.brandName}</span>
              </div>
              <img src={trails[i]} width={TRAIL_W} height={trailH} style={{ marginTop: 2 }} alt="" />
            </div>
          ))}
          <img src={dataUri(axisSvg(TRAIL_W))} width={TRAIL_W} height={32} alt="" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, fontSize: 24, color: INK_2 }}>
            <img src={dataUri(markSvg(40, 16))} width={40} height={16} alt="" />
            <span>Compared on {APP_NAME}</span>
          </div>
        </div>
      </div>
    ),
    fontOpts,
  );
}
