import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/*
 * Records the demo GIF for the README.
 *
 * This is not a test. It drives the app the way a first-time visitor would
 * and leaves the frames behind in `docs/demo/` for ffmpeg to assemble.
 *
 *   npm run demo:record
 *   npm run demo:build
 *
 * The two steps are separate on purpose: the frames are re-recorded only
 * when the app changes, and the GIF is re-encoded from the frames that are
 * already on disk.
 *
 * This file lives outside `tests/e2e/` on purpose. It is a local tool, not a
 * test, so it must not be picked up by `npm run e2e` or by CI. The recorder
 * writes into the working tree, and it needs ffmpeg, which the CI runner does
 * not have.
 */

const FRAMES = 'docs/demo';

test('record the demo', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 620 });
  await page.goto('/');
  await page.waitForTimeout(400);

  let frame = 0;
  const shot = async (): Promise<void> => {
    await page.screenshot({
      path: `${FRAMES}/frame-${String(frame).padStart(3, '0')}.png`,
      // CSS pixels, not device pixels. Without this the frames come out at
      // the device scale factor, which differs per Playwright profile.
      scale: 'css',
    });
    frame += 1;
    await page.waitForTimeout(120);
  };

  await shot();

  // Select a node, so the selection state is visible.
  await clickNode(page, 'n2');
  await expect(page.locator('g[data-node-id="n2"]')).toHaveAttribute('aria-pressed', 'true');
  await shot();

  // Drag it to a new place and watch the edges follow.
  const box = await page.locator('g[data-node-id="n2"]').boundingBox();
  if (!box) throw new Error('node n2 has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 + 60, { steps: 12 });
  await shot();
  await page.mouse.up();
  await shot();

  // Undo puts it back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await shot();

  // Reveal the ports on a node, then drag a connection.
  const n4 = await page.locator('g[data-node-id="n4"]').boundingBox();
  if (!n4) throw new Error('node n4 has no bounding box');

  await page.mouse.move(n4.x + n4.width / 2, n4.y + n4.height / 2);
  await expect(page.locator('[data-port="n4:top"]')).toBeVisible();
  await shot();

  const port = page.locator('[data-port="n4:top"]');
  const portBox = await port.boundingBox();
  if (!portBox) throw new Error('the top port has no bounding box');

  const n6 = await page.locator('g[data-node-id="n6"]').boundingBox();
  if (!n6) throw new Error('node n6 has no bounding box');

  await page.mouse.move(portBox.x + portBox.width / 2, portBox.y + portBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(n6.x + n6.width / 2, n6.y + n6.height / 2, { steps: 14 });
  await shot();
  await page.mouse.up();

  // The new connection must exist, or the GIF would not show it.
  await expect(page.getByTestId('edges').locator('[data-edge-id]')).toHaveCount(7);
  await shot();

  // Edit a label.
  await page.locator('g[data-node-id="n3"]').dblclick();
  const labelInput = page.getByLabel('Label for Valid?');
  await expect(labelInput).toBeVisible();
  await shot();

  await page.keyboard.press('Escape');
  await shot();
});

async function clickNode(page: Page, id: string): Promise<void> {
  await page.locator(`g[data-node-id="${id}"]`).click();
}
