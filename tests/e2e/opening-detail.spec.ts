import { expect, test } from '@playwright/test';
import { mockApiRoutes, testOpenings } from './utils/mockApi';

test.describe('opening detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('renders tabs, related openings, and practice mode', async ({ page }) => {
    const encodedFen = encodeURIComponent(testOpenings[0].fen);
    await page.goto(`/opening/${encodedFen}`);

    await expect(page.getByRole('heading', { name: testOpenings[0].name })).toBeVisible();

    await page.getByRole('button', { name: 'Plans' }).click();
    const activePanel = page.locator('.tab-content-panel.active');
    await expect(activePanel.getByText('control the center and develop quickly')).toBeVisible();

    await page.getByRole('button', { name: /Studies/ }).click();
    await expect(activePanel.getByText('Sicilian Defense Essentials')).toBeVisible();

    await page.getByRole('button', { name: /Videos/ }).click();
    await expect(
      activePanel.getByRole('heading', { name: 'Sicilian Defense Basics' })
    ).toBeVisible();

    const relatedTeaser = page.locator('.left-column .related-teaser').first();
    await expect(relatedTeaser.getByRole('heading', { name: 'Related Openings' })).toBeVisible();
    await expect(relatedTeaser.getByText('Sicilian Defense: Alapin')).toBeVisible();

    await page.getByRole('button', { name: 'Practice' }).click();
    const practiceControls = page.locator('.practice-controls');
    await expect(practiceControls.getByRole('button', { name: 'Exit' })).toBeVisible();
  });
});
