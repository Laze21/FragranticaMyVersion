// Dev QA: crawl key routes at several widths; report status, console errors, horizontal overflow.
import { chromium } from 'playwright';
const base = `http://localhost:${process.env.PORT ?? 3100}`;
const routes = (process.env.ROUTES ?? '/,/discover,/discover?q=vanilla%20without%20tobacco,/discover?feel=rainy-day,/fragrance/dior-sauvage,/fragrance/molecule-01,/fragrance/bvlgari-black,/fragrance/paradigme,/notes,/notes/bergamot,/notes/ambroxan,/house,/house/dior,/perfumer,/perfumer/francois-demachy,/compare,/compare?f=dior-sauvage,bleu-de-chanel-edp,ysl-y-edp,/shelf,/diary,/u/demo,/u/demo/shelf,/u/coachdre,/lists,/learn,/learn/sillage,/sign-in,/sign-up,/contribute,/admin,/about/data,/about/moderation,/about/ads,/nope-404').split(',');
const widths = (process.env.WIDTHS ?? '390,768,1440').split(',').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  if (process.env.AUTH) {
    const p = await ctx.newPage();
    await p.goto(`${base}/sign-in`);
    await p.getByRole('button', { name: 'Continue as the demo account' }).click();
    await p.waitForURL(`${base}/`);
    await p.close();
  }
  for (const r of routes) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text().slice(0, 200)));
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
    let status = 0;
    try {
      const res = await page.goto(base + r, { waitUntil: 'networkidle', timeout: 60000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(300);
    } catch (e) {
      errors.push('NAV ' + e.message.slice(0, 120));
    }
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      const over = de.scrollWidth - de.clientWidth;
      if (over <= 0) return null;
      const culprits = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1 && getComputedStyle(el).position !== 'fixed')
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
      return { over, culprits };
    });
    // SHOTS=<dir> also keeps a capture per route and width (FULL=1 for the whole page) for a visual pass.
    if (process.env.SHOTS) {
      const name = `${w}-${r.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}.png`;
      await page.screenshot({ path: `${process.env.SHOTS}/${name}`, fullPage: process.env.FULL === '1' }).catch(() => {});
    }
    results.push({ w, r, status, errors: [...new Set(errors)], overflow });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
for (const x of results) {
  const bad = x.errors.length || x.overflow || (x.status >= 400 && !x.r.includes('nope'));
  if (bad || process.env.VERBOSE) console.log(`${bad ? 'FAIL' : 'ok  '} ${x.w} ${x.status} ${x.r} ${x.errors.join(' | ')} ${x.overflow ? JSON.stringify(x.overflow) : ''}`);
}
console.log(`checked ${results.length}, failures ${results.filter((x) => x.errors.length || x.overflow || (x.status >= 400 && !x.r.includes('nope'))).length}`);
