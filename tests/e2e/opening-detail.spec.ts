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

  test('desktop shows a diagram of the position beside Common plans', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);

    const diagram = page.getByRole('figure', { name: 'Position after 2...d6' });
    await expect(diagram).toBeVisible();

    const plan = page.getByText('control the center and develop quickly');
    const diagramBox = await diagram.boundingBox();
    const planBox = await plan.boundingBox();
    expect(diagramBox && planBox && diagramBox.x + diagramBox.width <= planBox.x).toBe(true);
  });

  test('clicking a move in a plan draws it and says it under the diagram', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);

    const diagram = page.getByRole('figure', { name: 'Position after 2...d6' });
    await expect(diagram).toContainText('Pick a move or square in the plans');

    await page.getByRole('button', { name: 'd4', exact: true }).click();
    await expect(diagram).toContainText('White pawn from d2 to d4');
  });

  test('Clear unpins the reference on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);

    await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0);
    await page.getByRole('button', { name: 'd4', exact: true }).click();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('button', { name: 'd4', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0);
  });

  test('mobile opens nothing on load when the plans have references to tap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);

    await expect(page.getByText('control the center and develop quickly')).toBeVisible();
    await expect(page.getByRole('figure')).toHaveCount(0);
  });
});

// On a phone the diagram sits above the plans. A tap focuses the button before
// it clicks, and anything that moves the layout in between lands the click on
// the paragraph instead, so the reference never pins.
test.describe('opening detail on a touch screen', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('tapping a reference in the last plan group pins it and shows its board', async ({
    page,
  }) => {
    await mockApiRoutes(page);
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);

    const reference = page.getByRole('button', { name: 'd4 square', exact: true });
    await reference.scrollIntoViewIfNeeded();
    await reference.tap();

    await expect(reference).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('The d4 square', { exact: true })).toBeInViewport();
  });

  test('pinning a reference below an open board keeps the tapped button in place', async ({
    page,
  }) => {
    await mockApiRoutes(page);
    await page.goto(`/opening/${encodeURIComponent(testOpenings[0].fen)}`);

    await page.getByRole('button', { name: 'd4', exact: true }).tap();
    await expect(page.getByRole('figure')).toBeVisible();

    const reference = page.getByRole('button', { name: 'd4 square', exact: true });
    await reference.scrollIntoViewIfNeeded();
    const before = (await reference.boundingBox())!.y;
    await reference.tap();

    await expect(reference).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('figure')).toHaveCount(1);
    const after = (await reference.boundingBox())!.y;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
  });
});
