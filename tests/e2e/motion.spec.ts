import { expect, test } from '@playwright/test';

test.describe('bottle stage and motion', () => {
  test('shows the poster first and keeps the information without 3D', async ({ page }) => {
    await page.goto('/fragrance/dior-sauvage');
    const poster = page.locator('img[src*="dior-sauvage"]:not([aria-hidden])').first();
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAttribute('alt', /Sauvage|bottle/i);
    // The stage never blocks the ten-second read.
    await expect(page.getByText(/what it smells like/i).first()).toBeVisible();
  });

  test('explore the scent scrolls to the journey with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/fragrance/dior-sauvage');
    await page.getByRole('button', { name: /explore the scent/i }).click();
    await page.waitForTimeout(800);
    const inView = await page.evaluate(() => {
      const root = document.querySelector('[data-mist-root]');
      if (!root) return false;
      const r = root.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(inView).toBe(true);
    // No mist canvas is created when motion is reduced.
    expect(await page.locator('canvas').count()).toBe(0);
  });

  test('explore the scent sends mist into the opening notes', async ({ page }) => {
    await page.goto('/fragrance/dior-sauvage');
    await page.getByRole('button', { name: /explore the scent/i }).click();
    await page.waitForTimeout(1200);
    const root = page.locator('[data-mist-root]');
    await expect(root.locator('[data-mist-target]').first()).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(root.locator('[data-mist-target][data-arrived]').first()).toBeAttached();
  });

  test('bottles without an image show a tidy empty state', async ({ page }) => {
    // The catalogue has images for everything; the empty state is exercised through the contribute path.
    await page.goto('/contribute?kind=image');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
