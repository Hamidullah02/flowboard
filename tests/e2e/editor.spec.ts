import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/*
 * E2E specs.
 *
 * These specs map onto acceptance test 12 and the two core user journeys
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

test('a node follows the pointer while it is being dragged', async ({ page }) => {
  await page.goto('/');

  const node = nodeById(page, 'n2');
  const shape = node.locator('rect');
  const box = await node.boundingBox();
  if (!box) throw new Error('node n2 has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // The button is still down: the node must already have moved.
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 40, { steps: 5 });

  const during = await positionOf(shape);
  expect(during.x).toBe(340);
  expect(during.y).toBe(180);

  await page.mouse.up();
});

test('two nodes can be connected by dragging from a port', async ({ page }) => {
  await page.goto('/');

  const before = await page.getByTestId('edges').locator('[data-edge-id]').count();

  // Hover n4 to reveal its ports, then drag from the top port to n6.
  const n4 = nodeById(page, 'n4');
  const n4Box = await n4.boundingBox();
  if (!n4Box) throw new Error('node n4 has no bounding box');

  await page.mouse.move(n4Box.x + n4Box.width / 2, n4Box.y + n4Box.height / 2);

  const port = page.locator('[data-port="n4:top"]');
  await expect(port).toBeVisible();

  const n6 = nodeById(page, 'n6');
  const n6Box = await n6.boundingBox();
  if (!n6Box) throw new Error('node n6 has no bounding box');

  await page.mouse.move(n4Box.x + n4Box.width / 2, n4Box.y);
  await page.mouse.down();
  await page.mouse.move(n6Box.x + n6Box.width / 2, n6Box.y + n6Box.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByTestId('edges').locator('[data-edge-id]')).toHaveCount(before + 1);
});

test('a node can be reached and edited with the keyboard', async ({ page }) => {
  await page.goto('/');

  // Focus the first node the way a keyboard user would.
  await nodeById(page, 'n1').focus();

  // Focusing selects the node, so the state is announced without a click.
  await expect(nodeById(page, 'n1')).toHaveAttribute('aria-pressed', 'true');

  // The focus ring is drawn as a stroke, since box-shadow does nothing on
  // an SVG element.
  const stroke = await nodeById(page, 'n1')
    .locator('rect')
    .evaluate((el) => {
      return getComputedStyle(el).stroke;
    });
  expect(stroke).toBe('rgb(37, 99, 235)');

  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Label for Start')).toBeVisible();
});

test('the empty canvas shows a hint', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByTestId('import-input').setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, nodes: [], edges: [] })),
  });

  await expect(page.getByTestId('empty-hint')).toBeVisible();
});

test('the layout fits a phone screen', async ({ page, isMobile }) => {
  await page.goto('/');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('the page has no viewport');

  const toolbar = await page.locator('.app__toolbar').boundingBox();
  if (!toolbar) throw new Error('the toolbar has no bounding box');

  if (isMobile) {
    // The toolbar moves to the bottom on a phone, so the canvas keeps the
    // full width and the thumb reaches the controls.
    expect(toolbar.y).toBeGreaterThan(viewport.height / 2);

    // The status bar is a single line, not a tall empty band.
    const status = await page.locator('.app__status').boundingBox();
    if (!status) throw new Error('the status bar has no bounding box');
    expect(status.height).toBeLessThan(60);
  } else {
    // On a desktop the toolbar stays at the top.
    expect(toolbar.y).toBeLessThan(viewport.height / 2);
  }

  // Nothing may overflow the viewport horizontally.
  const scrollWidth = await page.evaluate(() => {
    return document.documentElement.scrollWidth;
  });
  expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('a node can be dragged on a phone', async ({ page }) => {
  await page.goto('/');

  const node = nodeById(page, 'n2');
  const before = await positionOf(node.locator('rect'));

  const box = await node.boundingBox();
  if (!box) throw new Error('node n2 has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 40, { steps: 10 });
  await page.mouse.up();

  const after = await positionOf(node.locator('rect'));
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.y).toBeGreaterThan(before.y);
});
