import { expect, test } from '@playwright/test';

/*
 * E2E scaffolding.
 *
 * These three specs map onto acceptance test 12 and the two core user journeys
 * from the plan. They are written against the DOM contract that the reducer
 * work will produce (data-testid attributes and aria-labels), so they are
 * expected to fail until `src/core/` lands — that is intentional and matches
 * the plan: "CI runs and tests fail for the right reason".
 */

test('the demo opens with the fixture flowchart already loaded', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('canvas')).toBeVisible();
  await expect(page.getByTestId('nodes').locator('g[data-node-id]')).toHaveCount(6);
  await expect(page.getByTestId('edges').locator('line')).toHaveCount(6);
});

test('dragging a node snaps it to the grid and undo restores it', async ({ page }) => {
  await page.goto('/');

  const node = page.getByTestId('nodes').locator('g[data-node-id="n2"]');
  const box = await node.boundingBox();
  if (!box) throw new Error('node n2 has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 37, box.y + box.height / 2 + 23, { steps: 10 });
  await page.mouse.up();

  const moved = await node.boundingBox();
  if (!moved) throw new Error('node n2 disappeared during the drag');
  expect(Math.round(moved.x)).not.toBe(Math.round(box.x));

  await page.getByRole('button', { name: 'Undo' }).click();

  const restored = await node.boundingBox();
  if (!restored) throw new Error('node n2 disappeared after undo');
  expect(Math.round(restored.x)).toBe(Math.round(box.x));
  expect(Math.round(restored.y)).toBe(Math.round(box.y));
});

test('a node can be selected and deleted with the Delete key', async ({ page }) => {
  await page.goto('/');

  const node = page.getByTestId('nodes').locator('g[data-node-id="n5"]');
  await node.click();
  await page.keyboard.press('Delete');

  await expect(page.getByTestId('nodes').locator('g[data-node-id="n5"]')).toHaveCount(0);
  // n5 was connected to n3 and n6, so both edges must disappear with it.
  await expect(page.getByTestId('edges').locator('line')).toHaveCount(4);
});
