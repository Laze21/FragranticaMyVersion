/**
 * Renders original bottle posters (and GLB models where has3d) for every seed fragrance.
 *
 *   npm run bottles            # all
 *   npm run bottles -- graphite-hour kvist
 *
 * Output: public/bottles/<slug>.webp (transparent, 900x1200), public/models/<slug>.glb
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { CATALOG } from '../../src/seed/real';

const ROOT = process.cwd();
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const all = CATALOG.fragrances.filter((f) => !only.length || only.includes(f.slug));
const brandName = Object.fromEntries(CATALOG.brands.map((b) => [b.slug, b.name]));

const bundle = await build({
  entryPoints: [path.join(ROOT, 'scripts/bottles/page.ts')],
  bundle: true,
  format: 'iife',
  write: false,
  platform: 'browser',
  target: 'es2022',
  alias: { '@': path.join(ROOT, 'src') },
  logLevel: 'warning',
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url(/archivo.woff2) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:Newsreader;src:url(/newsreader-italic.woff2) format('woff2');font-style:italic;font-weight:200 800}
body{margin:0;background:transparent}</style></head>
<body><span style="font-family:Archivo;font-weight:600">.</span><span style="font-family:Newsreader;font-style:italic">.</span>
<script src="/bundle.js"></script></body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1800 } });
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.route('http://bottles.local/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p === '/') return route.fulfill({ contentType: 'text/html', body: html });
  if (p === '/bundle.js') return route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0].text });
  if (p === '/archivo.woff2') return route.fulfill({ contentType: 'font/woff2', body: readFileSync(path.join(ROOT, 'src/fonts/archivo-var.woff2')) });
  if (p === '/newsreader-italic.woff2')
    return route.fulfill({ contentType: 'font/woff2', body: readFileSync(path.join(ROOT, 'src/fonts/newsreader-var-italic.woff2')) });
  return route.fulfill({ status: 404, body: '' });
});
await page.goto('http://bottles.local/');

mkdirSync(path.join(ROOT, 'public/bottles'), { recursive: true });
mkdirSync(path.join(ROOT, 'public/models'), { recursive: true });

for (const f of all) {
  const t0 = Date.now();
  const brand = brandName[f.brand];
  if (!f.noImage) {
    const dataUrl: string = await page.evaluate(
      ([spec, b, n]) => (window as unknown as { renderPoster: (...a: unknown[]) => Promise<string> }).renderPoster(spec, b, n, 1200, 1600),
      [f.bottle, brand, f.name] as const,
    );
    const png = Buffer.from(dataUrl.split(',')[1], 'base64');
    await sharp(png).resize(900, 1200).webp({ quality: 84, alphaQuality: 90, effort: 5 }).toFile(path.join(ROOT, `public/bottles/${f.slug}.webp`));
  }
  if (f.has3d) {
    const b64: string = await page.evaluate(
      ([spec, b, n]) => (window as unknown as { exportGlb: (...a: unknown[]) => Promise<string> }).exportGlb(spec, b, n),
      [f.bottle, brand, f.name] as const,
    );
    writeFileSync(path.join(ROOT, `public/models/${f.slug}.glb`), Buffer.from(b64, 'base64'));
  }
  console.log(`${f.slug}  ${Date.now() - t0}ms`);
}
await browser.close();
