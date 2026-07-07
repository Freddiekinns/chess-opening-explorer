import { expect, test } from '@playwright/test';
import { mockApiRoutes, testOpenings } from './utils/mockApi';

test.describe('pgn modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('pgn lookup navigates to opening details', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Search by pasting PGN' }).click();

    const pgnInput = page.getByLabel('PGN input');
    await pgnInput.fill('1. e4 c5 2. Nf3 d6');

    await page.getByRole('button', { name: 'Find Opening' }).click();
    await expect(page.getByRole('button', { name: 'Go to Opening' })).toBeVisible();

    await page.getByRole('button', { name: 'Go to Opening' }).click();

    const encodedFen = encodeURIComponent(testOpenings[0].fen);
    await expect(page).toHaveURL(new RegExp(`/opening/${encodedFen}`));
  });
});
