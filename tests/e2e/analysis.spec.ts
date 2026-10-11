import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('analysis page', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('loads analysis results for chess.com user', async ({ page }) => {
    const username = process.env.CHESSCOM_USER || 'Plumthemaster';

    await page.goto('/analyse');

    await expect(page.getByRole('heading', { name: 'Analyse your games' })).toBeVisible();

    const usernameInput = page.getByRole('textbox', { name: 'Username' });
    await usernameInput.fill(username);

    await page.getByRole('button', { name: 'Analyse' }).click();

    await expect(page.getByText(/2 games analysed/)).toBeVisible();
  });
});
