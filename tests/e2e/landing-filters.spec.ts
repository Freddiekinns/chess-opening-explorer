import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('landing page filters', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('ranks popular openings by level and filters by family', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Popular openings' })).toBeVisible();

    const ranked = page.waitForRequest((request) => request.url().includes('band=1400'));
    await page.getByRole('button', { name: 'Your level All levels' }).click();
    await page.getByRole('option', { name: /^Intermediate/ }).click();
    await ranked;
    await expect(
      page.getByRole('heading', { name: 'Popular with intermediate players' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Family Any' }).click();
    await page
      .getByRole('dialog', { name: 'Filter by family' })
      .getByRole('button', { name: /Sicilian Defense/ })
      .click();

    const grid = page.locator('.openings-grid');
    await expect(
      grid.getByRole('heading', { name: 'Sicilian Defense', exact: true })
    ).toBeVisible();
    await expect(grid.getByText('French Defense')).toHaveCount(0);
  });
});
