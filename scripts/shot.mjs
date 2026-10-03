// Dev helper: node scripts/shot.mjs <path> <out.png> [width] [height] [fullPage]
import { chromium } from 'playwright';
const [, , path = '/', out = 'shot.png', w = '1440', h = '900', full = '0'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${process.env.PORT ?? 3100}${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(+(process.env.WAIT ?? 600));
await page.screenshot({ path: out, fullPage: full === '1' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(JSON.stringify({ errors, overflow }));
await browser.close();
