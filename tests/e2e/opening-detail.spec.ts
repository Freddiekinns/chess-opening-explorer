import { expect, test } from '@playwright/test';
import { mockApiRoutes, testOpenings } from './utils/mockApi';

test.describe('opening detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('renders sections, tree navigator, and practice mode', async ({ page }) => {
    const encodedFen = encodeURIComponent(testOpenings[0].fen);
    await page.goto(`/opening/${encodedFen}`);

    await expect(
      page.getByRole('heading', { level: 1, name: testOpenings[0].name, exact: true })
    ).toBeVisible();

    // Full-width sections
    await expect(page.getByRole('heading', { name: 'Common plans' })).toBeVisible();
    await expect(page.getByText('control the center and develop quickly')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Learning resources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sicilian Defense Basics' })).toBeVisible();
    await expect(page.getByText('Sicilian Defense Essentials')).toBeVisible();

    // Tree navigator shows sibling lines
    await expect(page.getByText('Sicilian Defense: Alapin').first()).toBeVisible();

    // Practice mode arms and exits
    await page.getByRole('button', { name: 'Practice' }).click();
    await expect(page.getByRole('button', { name: 'Exit' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Exit' }).first().click();
    await expect(page.getByRole('button', { name: 'Practice' })).toBeVisible();
  });
});
