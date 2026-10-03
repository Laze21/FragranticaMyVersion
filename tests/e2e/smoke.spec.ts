import { expect, test } from '@playwright/test';

test.describe('search and discovery', () => {
  test('suggests as you type, with typo tolerance, and opens the fragrance', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('combobox', { name: /search fragrances/i }).first();
    await box.click();
    await box.fill('savage');
    const options = page.getByRole('listbox', { name: /suggestions/i }).getByRole('option');
    await expect(options.first()).toBeVisible();
    await expect(page.getByRole('listbox', { name: /suggestions/i })).toContainText(/Sauvage/);
    await options.filter({ hasText: /^(?!.*Eau ).*Sauvage/ }).first().click();
    await expect(page).toHaveURL(/\/fragrance\/dior-sauvage/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Sauvage/);
  });

  test('reads a natural-language query into filters that live in the URL', async ({ page }) => {
    await page.goto('/discover?q=vanilla+without+tobacco');
    await expect(page.getByText(/No tobacco/i).first()).toBeVisible();
    await expect(page.getByText(/Vanilla/i).first()).toBeVisible();
    const results = page.locator('a[href^="/fragrance/"]');
    await expect(results.first()).toBeVisible();
    expect(await results.count()).toBeGreaterThan(3);
    // The interpreted filters are reflected in the address bar so the search can be shared.
    await expect(page).toHaveURL(/with=vanilla|q=vanilla/);
  });

  test('shows an honest empty state for a query nothing matches', async ({ page }) => {
    await page.goto('/discover?q=zzqxv');
    await expect(page.getByText(/nothing matches|no results|no fragrances/i).first()).toBeVisible();
  });
});

test.describe('fragrance page', () => {
  test('answers the ten-second questions above the fold and shows provenance', async ({ page }) => {
    await page.goto('/fragrance/dior-sauvage');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Sauvage/);
    await expect(page.getByText(/what it smells like/i).first()).toBeVisible();
    await expect(page.getByText(/lasts/i).first()).toBeVisible();
    await expect(page.getByText(/projection/i).first()).toBeVisible();
    // Listed vs smelled is the differentiator; both columns are present.
    await expect(page.getByText(/listed by the house/i).first()).toBeVisible();
    await expect(page.getByText(/what people smell/i).first()).toBeVisible();
    // Sources section names where facts come from.
    await expect(page.getByText(/where this page.s facts come from/i).first()).toBeVisible();
    // Image provenance is stated.
    await expect(page.getByText(/illustration, not a product photo|photo:/i).first()).toBeVisible();
  });

  test('never uses the word "clone" for similar fragrances', async ({ page }) => {
    await page.goto('/fragrance/dior-sauvage');
    const text = await page.locator('main').innerText();
    expect(text.toLowerCase()).not.toMatch(/\bclones?\b/);
  });

  test('shows the not-found page for an unknown fragrance', async ({ page }) => {
    // With a streaming loading boundary the HTTP status is already sent; the page carries noindex instead.
    await page.goto('/fragrance/does-not-exist');
    await expect(page.getByText(/evaporated|not found|can.t find/i).first()).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
  });
});

test.describe('compare', () => {
  test('puts three fragrances side by side', async ({ page }) => {
    await page.goto('/compare?f=dior-sauvage%2Cbleu-de-chanel-edp%2Cysl-y-edp');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const name of ['Sauvage', 'Bleu de Chanel', 'Y']) await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/longevity|lasts/i).first()).toBeVisible();
  });
});

test.describe('layout', () => {
  const routes = ['/', '/discover?q=rainy+day', '/fragrance/dior-sauvage', '/fragrance/chanel-no-5', '/notes/bergamot', '/house/dior', '/compare?f=dior-sauvage%2Cchanel-no-5', '/learn', '/about/data', '/sign-in'];
  for (const route of routes) {
    test(`no horizontal overflow or console errors on ${route}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && !/favicon|hydrat/i.test(m.text()) && errors.push(m.text()));
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow on ${route}`).toBeLessThanOrEqual(1);
      expect(errors, `console errors on ${route}`).toEqual([]);
    });
  }
});
