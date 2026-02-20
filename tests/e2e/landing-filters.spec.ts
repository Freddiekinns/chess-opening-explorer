import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('landing page filters', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('filters popular openings by complexity and category', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Browse Chess Openings' })).toBeVisible();

    const filters = page.locator('.filters-container');
    await filters.getByRole('button', { name: 'Intermediate', exact: true }).click();
    await filters.getByRole('button', { name: 'Semi-Open Games (B)', exact: true }).click();

    await expect(page.getByText('Sicilian Defense')).toBeVisible();
    await expect(page.getByText('French Defense')).toHaveCount(0);
  });
});
