import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { sql } from '@/lib/db';
import { getProfileByHandle, getShelf, identityLine, shelfInsights } from '@/lib/data/shelf';
import { APP_NAME } from '@/lib/config';
import { markGeometry, MARK_FILLS } from '@/lib/scent/trail';
import { trailThumbSvg } from '@/components/scent/trailThumbScene';

export const alt = 'Profile card';
// The card reads the live shelf; it is never a build-time asset.
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#1c1a17';
const INK_2 = '#47423c';
const INK_3 = '#6a645b';
const PORCELAIN = '#f3f0ea';
const LINEN = '#e5e0d6';
const DEFAULT_HUE = '#6d6150';

const root = process.cwd();
// Static instances of the site fonts (see scripts/fonts/strip-variations.mjs): Satori cannot read the variable subsets.
let fonts: Promise<[Buffer, Buffer]> | undefined;
const loadFonts = () => (fonts ??= Promise.all([readFile(path.join(root, 'src/fonts/og/newsreader-italic.ttf')), readFile(path.join(root, 'src/fonts/og/archivo.ttf'))]));

function markSvg(width: number, height: number) {
  const m = markGeometry(40, 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 40 16">${m.bands
    .map((b, i) => `<path d="${b.path}" fill="${INK}" fill-opacity="${MARK_FILLS[i] ?? 1}"/>`)
    .join('')}</svg>`;
}
const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * The share card for a person: monogram, name, handle, the shelf in one sentence and the
 * shelf's Trail. A private profile shares only the name; an empty shelf shares the name and
 * the handle, with the ruler drawn empty.
 */
export default async function OG(props: { params: Promise<{ handle: string }> }) {
  const { handle } = await props.params;
  const p = await getProfileByHandle(handle);
  const [serif, sans] = await loadFonts();
  const fontOpts = {
    ...size,
    fonts: [
      { name: 'Newsreader', data: serif, style: 'italic' as const, weight: 400 as const },
      { name: 'Archivo', data: sans, style: 'normal' as const, weight: 400 as const },
    ],
  };
  if (!p) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: PORCELAIN }} />, fontOpts);

  const name = String(p.display_name);
  const hue = (p.avatar_hue as string) ?? DEFAULT_HUE;
  const isPrivate = Boolean(p.is_private);
  let identity: string | null = null;
  let trail: string | null = null;
  if (!isPrivate) {
    const id = String(p.id);
    const [items, latest] = await Promise.all([
      getShelf(id),
      sql<{ name: string }>(
        `select f.name from public.wear_logs w join public.wear_log_items i on i.wear_log_id = w.id join public.fragrances f on f.id = i.fragrance_id
          where w.user_id = $1 and w.worn_on > current_date - 45 group by f.name order by count(*) desc, f.name limit 1`,
        [id],
      ),
    ]);
    const s = await shelfInsights(items);
    identity = identityLine(s, latest[0]?.name ?? null);
    if (s.trail) trail = trailThumbSvg(s.trail, 'og', { ink: INK, porcelain: PORCELAIN, stone2: '#c9c2b6' });
  }

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: PORCELAIN, fontFamily: 'Archivo', color: INK, padding: '64px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 120, height: 120, borderRadius: 60, background: hue, color: PORCELAIN, fontSize: 44, letterSpacing: 1 }}>
            {initials(name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 72, lineHeight: 1.02 }}>{name}</div>
            {/* One string child: Satori refuses a div holding two text nodes without an explicit display. */}
            <div style={{ fontSize: 28, color: INK_2, marginTop: 10 }}>{`@${String(p.handle)}`}</div>
          </div>
        </div>
        {/* Flat children in one column, like the fragrance card: Satori places a nested block oddly here. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, justifyContent: 'center' }}>
          {isPrivate ? <div style={{ fontFamily: 'Newsreader', fontSize: 40, color: INK_2 }}>Keeps their shelf private.</div> : null}
          {!isPrivate && identity ? <div style={{ fontFamily: 'Newsreader', fontSize: 40, lineHeight: 1.25, maxWidth: 1000 }}>{identity}</div> : null}
          {!isPrivate && trail ? <img src={dataUri(trail)} width={560} height={70} style={{ marginTop: 34 }} alt="" /> : null}
          {!isPrivate && trail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 20, color: INK_3 }}>
              <img src={dataUri(markSvg(30, 12))} width={30} height={12} alt="" />
              <span>Their shelf, as a trail</span>
            </div>
          ) : null}
          {!isPrivate && !trail ? <div style={{ width: 560, height: 2, background: LINEN, marginTop: 34 }} /> : null}
          {!isPrivate && !trail ? <div style={{ fontSize: 24, color: INK_3, marginTop: 14 }}>Nothing on the shelf yet.</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 30 }}>
          <img src={dataUri(markSvg(50, 20))} width={50} height={20} alt="" />
          <span>{APP_NAME}</span>
        </div>
      </div>
    ),
    fontOpts,
  );
}
