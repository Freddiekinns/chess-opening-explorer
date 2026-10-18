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

for (const width of [360, 390, 768]) {
  test.describe(`opening card board inset at ${width}px`, () => {
    test.use({ viewport: { width, height: 812 } });

    test.beforeEach(async ({ page }) => {
      await mockApiRoutes(page);
    });

    test('insets the mini board from every edge of the card', async ({ page }) => {
      await page.goto('/');

      const firstCard = page.locator('.openings-grid .opening-card.has-board').first();
      await expect(firstCard).toBeVisible();

      const inset = await firstCard.evaluate((card) => {
        const wrapper = card.querySelector('.card-board-wrapper') as HTMLElement;
        const cardBox = card.getBoundingClientRect();
        const boardBox = wrapper.getBoundingClientRect();
        const style = getComputedStyle(wrapper);

        return {
          left: boardBox.left - cardBox.left,
          top: boardBox.top - cardBox.top,
          bottom: cardBox.bottom - boardBox.bottom,
          radii: [
            style.borderTopLeftRadius,
            style.borderTopRightRadius,
            style.borderBottomRightRadius,
            style.borderBottomLeftRadius,
          ].map((radius) => parseFloat(radius)),
        };
      });

      expect(inset.left).toBeGreaterThanOrEqual(8);
      expect(inset.top).toBeGreaterThanOrEqual(8);
      expect(inset.bottom).toBeGreaterThanOrEqual(8);
      for (const radius of inset.radii) {
        expect(radius).toBeGreaterThan(0);
      }
    });
  });
}
