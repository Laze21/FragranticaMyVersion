import { expect, test, type Page } from '@playwright/test';

async function signInDemo(page: Page) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: /continue as the demo account/i }).click();
  await page.waitForURL((u) => !/sign-in/.test(u.pathname));
}

test.describe('account flows', () => {
  test('signs in as the demo account and sees the shelf', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/shelf');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href^="/fragrance/"]').first()).toBeVisible();
  });

  test('adds a fragrance to the shelf, changes its status and removes it', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/fragrance/cool-water');
    const actions = page.locator('#hero-actions');
    const shelfBtn = actions.getByRole('button').first();
    await shelfBtn.click();
    const menu = page.getByRole('menu', { name: /shelf status/i });
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitemradio', { name: /want/i }).first().click();
    await expect(actions).toContainText(/want/i);
    await shelfBtn.click();
    await menu.getByRole('menuitem', { name: /remove from shelf/i }).click();
    await expect(actions).not.toContainText(/want/i);
  });

  test('rates a fragrance', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/fragrance/santal-33');
    await page.getByRole('button', { name: /rate it|change your rating/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('radio', { name: /^8 out of 10$/ }).first().click();
    await dialog.getByRole('button', { name: /save|done/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: /change your rating/i }).first()).toBeVisible();
  });

  test('writes a quick take with an ownership and gifted disclosure, then deletes it', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/fragrance/philosykos/review');
    await page.getByRole('radio', { name: /quick/i }).click();
    await page.getByRole('radio', { name: /^8 out of 10$/ }).first().click();
    await page.locator('textarea[name="body"]').fill('Green fig, milky and a little bitter. Smells like a garden in August, and lasts the afternoon.');
    await page.getByLabel(/i got this free/i).check();
    await page.getByLabel(/how you got it/i).fill('sample from a friend');
    await page.getByRole('button', { name: /publish|update review/i }).click();
    await page.waitForURL(/\/fragrance\/philosykos/);
    await expect(page.getByText(/garden in August/)).toBeVisible();
    await expect(page.getByText(/gift|free/i).first()).toBeVisible();
    await page.getByRole('button', { name: /^delete$/i }).first().click();
    await page.getByRole('button', { name: /yes, delete/i }).click();
    await expect(page.getByText(/garden in August/)).toBeHidden();
  });

  test('logs a wear from the fragrance page and sees it in the diary', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/fragrance/not-a-perfume');
    await page.locator('#hero-actions').getByRole('button', { name: /wearing it today|worn today/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /logged/i }).first()).toBeVisible();
    await page.goto('/diary');
    await expect(page.getByText(/Not a Perfume/).first()).toBeVisible();
  });

  test('keeps a private profile private', async ({ page }) => {
    await page.goto('/u/coachdre');
    await expect(page.getByText(/private/i).first()).toBeVisible();
  });
});
