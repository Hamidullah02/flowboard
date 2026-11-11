import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/*
 * E2E specs.
 *
 * These three specs map onto acceptance test 12 and the two core user journeys
 * from the plan. They are written against the DOM contract the reducer work
 * produces: `data-testid` attributes, `data-node-id` on nodes, and
 * `data-edge-id` on edges.
 *
 * Node positions are read from the shape's `x`/`y` attributes rather than
 * from a bounding box. A bounding box includes the stroke, and the stroke
 * widens from 2px to 3px when a node is selected, so a bounding box moves by
 * a pixel even when the document does not.
 */

function nodeById(page: Page, id: string): Locator {
  return page.getByTestId('nodes').locator(`g[data-node-id="${id}"]`);
}

async function positionOf(shape: Locator): Promise<{ x: number; y: number }> {
  const x = await shape.getAttribute('x');
  const y = await shape.getAttribute('y');
  if (x === null || y === null) throw new Error('the node shape has no x/y attributes');
  return { x: Number(x), y: Number(y) };
}

test('the demo opens with the fixture flowchart already loaded', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('canvas')).toBeVisible();
  await expect(page.getByTestId('nodes').locator('g[data-node-id]')).toHaveCount(6);
  await expect(page.getByTestId('edges').locator('[data-edge-id]')).toHaveCount(6);
});

test('dragging a node snaps it to the grid and undo restores it', async ({ page }) => {
  await page.goto('/');

  const node = nodeById(page, 'n2');
  const shape = node.locator('rect');

  const before = await positionOf(shape);
  const box = await node.boundingBox();
  if (!box) throw new Error('node n2 has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 37, box.y + box.height / 2 + 23, { steps: 10 });
  await page.mouse.up();

  const after = await positionOf(shape);

  // The drag moved the node.
  expect(after).not.toEqual(before);
  // The stored position is snapped to the 10px grid.
  expect(after.x % 10).toBe(0);
  expect(after.y % 10).toBe(0);

  await page.getByRole('button', { name: 'Undo' }).click();

  const restored = await positionOf(shape);
  expect(restored).toEqual(before);
});

test('a node can be selected and deleted with the Delete key', async ({ page }) => {
  await page.goto('/');

  await nodeById(page, 'n5').click();
  await page.keyboard.press('Delete');

  await expect(nodeById(page, 'n5')).toHaveCount(0);
  // n5 was connected to n3 and n6, so both edges must disappear with it.
  await expect(page.getByTestId('edges').locator('[data-edge-id]')).toHaveCount(4);
});
