// Dev helper: node scripts/shot.mjs <path> <out.png> [width] [height] [fullPage]
import { chromium } from 'playwright';
const [, , path = '/', out = 'shot.png', w = '1440', h = '900', full = '0'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
if (process.env.AUTH) {
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${process.env.PORT ?? 3100}/sign-in`);
  await p.getByRole('button', { name: 'Continue as the demo account' }).click();
  await p.waitForURL(/localhost:\d+\/$/);
  await p.close();
}
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${process.env.PORT ?? 3100}${path}`, { waitUntil: 'networkidle' });
// SCROLL=1 walks the page so lazy images and the Trail's draw-on (an IntersectionObserver) have
// fired before a full-page capture; DRAW=1 asks the charts to draw without the scroll.
if (process.env.SCROLL) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}
if (process.env.DRAW) await page.evaluate(() => window.dispatchEvent(new Event('scent:trail-draw')));
await page.waitForTimeout(+(process.env.WAIT ?? 600));
await page.screenshot({ path: out, fullPage: full === '1' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(JSON.stringify({ errors, overflow }));
await browser.close();
