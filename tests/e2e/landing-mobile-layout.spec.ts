import { expect, test } from '@playwright/test';
import { mockApiRoutes } from './utils/mockApi';

test.describe('landing page mobile layout', () => {
  test.use({
    viewport: { width: 375, height: 812 },
  });

  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  test('keeps the footer above the fixed bottom nav and renders square board thumbnails', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Popular openings' })).toBeVisible();

    const firstBoardWrapper = page.locator('.openings-grid .card-board-wrapper').first();
    await expect(firstBoardWrapper).toBeVisible();

    const boardMetrics = await firstBoardWrapper.evaluate((element) => {
      const wrapper = element.getBoundingClientRect();
      const boardRoot = element.firstElementChild?.getBoundingClientRect();

      return {
        wrapperWidth: wrapper.width,
        wrapperHeight: wrapper.height,
        boardWidth: boardRoot?.width ?? 0,
        boardHeight: boardRoot?.height ?? 0,
      };
    });

    expect(Math.abs(boardMetrics.wrapperWidth - boardMetrics.wrapperHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(boardMetrics.boardWidth - boardMetrics.wrapperWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(boardMetrics.boardHeight - boardMetrics.wrapperHeight)).toBeLessThanOrEqual(1);

    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();

    const bottomNav = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('link', { name: 'Discover' }) })
      .last();

    await expect(bottomNav).toBeVisible();
    await expect(footer).toBeVisible();

    const layoutMetrics = await Promise.all([footer.boundingBox(), bottomNav.boundingBox()]);
    const [footerBox, navBox] = layoutMetrics;

    expect(footerBox).not.toBeNull();
    expect(navBox).not.toBeNull();

    if (!footerBox || !navBox) {
      throw new Error('Expected footer and bottom navigation to have bounding boxes');
    }

    expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(navBox.y + 1);
  });
});
