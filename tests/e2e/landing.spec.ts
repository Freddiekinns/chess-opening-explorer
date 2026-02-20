import { expect, test } from '@playwright/test';
import { mockApiRoutes, testOpenings } from './utils/mockApi';

test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('search navigates to opening details', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByRole('textbox');
    await searchInput.fill('Sicilian');

    const suggestionsList = page.locator('.search-suggestions');
    const suggestion = suggestionsList.locator('.suggestion-item', {
      hasText: 'Sicilian Defense',
    });
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    const encodedFen = encodeURIComponent(testOpenings[0].fen);
    await expect(page).toHaveURL(new RegExp(`/opening/${encodedFen}`));
    await expect(page.getByRole('heading', { name: 'Sicilian Defense' })).toBeVisible();
  });

  test('surprise me selects a random opening', async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });

    await page.goto('/');

    const surpriseButton = page.getByRole('button', { name: 'Surprise me!' });
    await surpriseButton.click();

    const encodedFen = encodeURIComponent(testOpenings[0].fen);
    await expect(page).toHaveURL(new RegExp(`/opening/${encodedFen}`));
  });
});
