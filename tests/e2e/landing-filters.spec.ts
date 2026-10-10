import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('landing page filters', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('filters popular openings by difficulty and family', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Popular openings' })).toBeVisible();

    await page.getByRole('button', { name: 'Difficulty Any' }).click();
    await page.getByRole('option', { name: /Intermediate/ }).click();
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
