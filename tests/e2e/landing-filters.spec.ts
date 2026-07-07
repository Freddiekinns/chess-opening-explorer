import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('landing page filters', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('filters popular openings by complexity and category', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Popular openings' })).toBeVisible();

    const filters = page.locator('.filters-container');
    await filters.getByRole('button', { name: 'Intermediate', exact: true }).click();
    await filters.getByRole('button', { name: 'Semi-Open Games (B)', exact: true }).click();

    const grid = page.locator('.openings-grid');
    await expect(
      grid.getByRole('heading', { name: 'Sicilian Defense', exact: true })
    ).toBeVisible();
    await expect(grid.getByText('French Defense')).toHaveCount(0);
  });
});
