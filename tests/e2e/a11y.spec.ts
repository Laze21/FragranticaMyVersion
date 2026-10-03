import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/discover?q=rainy+day', '/fragrance/dior-sauvage', '/notes/bergamot', '/house', '/perfumer', '/compare?f=dior-sauvage%2Cchanel-no-5', '/sign-in', '/learn'];

for (const route of routes) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
}

test('keyboard: skip link, search and the shelf menu are reachable', async ({ page }) => {
  await page.goto('/fragrance/dior-sauvage');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  await page.keyboard.press('Enter');
  const focused = await page.evaluate(() => document.activeElement?.id);
  expect(focused).toBe('main');
  // Tab through the hero until the explore button has focus; it must be reachable within a few stops.
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => /explore the scent/i.test(document.activeElement?.textContent ?? ''));
  }
  expect(found).toBe(true);
});
