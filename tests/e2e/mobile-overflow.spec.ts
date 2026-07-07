import { expect, test } from '@playwright/test';
import { mockApiRoutes, testOpenings } from './utils/mockApi';

/**
 * Regression test for TASK007: mobile horizontal overflow on content-heavy openings.
 *
 * Root cause was CSS Grid tracks using `1fr` (= `minmax(auto, 1fr)`),
 * allowing direct grid children without `min-width: 0` to expand the
 * track beyond the viewport. Fix: `minmax(0, 1fr)` + wildcard min-width.
 */
test.describe('mobile layout: no horizontal overflow', () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone-sized viewport
  });

  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page, {
      // Simulate a content-heavy opening with many related siblings
      relatedSiblingCount: 6,
    });
  });

  test('detail page does not overflow horizontally', async ({ page }) => {
    const encodedFen = encodeURIComponent(testOpenings[0].fen);
    await page.goto(`/opening/${encodedFen}`);

    // Wait for the page to fully render (opening name + long-form sections)
    await expect(
      page.getByRole('heading', { level: 1, name: testOpenings[0].name, exact: true })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Learning resources' })).toBeVisible();

    // The critical assertion: document should not be wider than viewport
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(overflow.hasOverflow).toBe(false);
  });
});
