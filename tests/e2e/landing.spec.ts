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
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sicilian Defense', exact: true })
    ).toBeVisible();
  });

  test('surprise me selects a random opening', async ({ page }) => {
    // The Surprise me! button lives in the TopBar search, shown on detail pages
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sicilian Defense', exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Surprise me!' }).click();

    // mockApi's /random returns testOpenings[1]
    const encodedFen = encodeURIComponent(testOpenings[1].fen);
    await expect(page).toHaveURL(new RegExp(`/opening/${encodedFen}`));
  });
});
