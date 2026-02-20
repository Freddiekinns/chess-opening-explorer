import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('analysis page', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('loads analysis results for chess.com user', async ({ page }) => {
    const username = process.env.CHESSCOM_USER || 'Plumthemaster';

    await page.goto('/analyse');

    await expect(page.getByRole('heading', { name: 'Analyse Your Games' })).toBeVisible();

    const usernameInput = page.getByRole('textbox');
    await usernameInput.fill(username);

    await page.getByRole('button', { name: 'Analyse' }).click();

    await expect(page.getByText(/Analysed 2 games/)).toBeVisible();
  });
});
