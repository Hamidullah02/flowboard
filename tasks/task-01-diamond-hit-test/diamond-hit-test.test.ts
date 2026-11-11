import { describe, expect, it } from 'vitest';
import { containsPoint, hitTestNode } from '@core/geometry';
import type { FlowNode } from '@core/types';

/*
 * Task 1 grading tests: a diamond node's empty corner is clickable.
 *
 * Copy this file to `tests/unit/diamond-hit-test.test.ts` and run:
 *
 *   npm test -- tests/unit/diamond-hit-test.test.ts
 *
 * Every assertion here is objective. Nothing is left to judgement.
 */

function makeNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: 'n1',
    kind: 'rect',
    x: 0,
    y: 0,
    w: 120,
    h: 60,
    label: 'Node',
    ...overrides,
  };
}

describe('the hit test respects the shape of the node', () => {
  it('keeps the centre of a diamond inside it', () => {
    const diamond = makeNode({ kind: 'diamond' });

    expect(containsPoint(diamond, { x: 60, y: 30 })).toBe(true);
  });

  it('keeps the four corners of a diamond outside it', () => {
    const diamond = makeNode({ kind: 'diamond' });

    // The corners of the bounding box are empty space: the diamond is drawn
    // as a rotated square, so those points are outside the shape.
    expect(containsPoint(diamond, { x: 0, y: 0 })).toBe(false);
    expect(containsPoint(diamond, { x: 120, y: 0 })).toBe(false);
    expect(containsPoint(diamond, { x: 120, y: 60 })).toBe(false);
    expect(containsPoint(diamond, { x: 0, y: 60 })).toBe(false);
  });

  it('keeps a point on the border of a diamond inside it', () => {
    const diamond = makeNode({ kind: 'diamond' });

    // The top vertex, the right vertex, the bottom vertex and the left
    // vertex are all on the shape.
    expect(containsPoint(diamond, { x: 60, y: 0 })).toBe(true);
    expect(containsPoint(diamond, { x: 120, y: 30 })).toBe(true);
    expect(containsPoint(diamond, { x: 60, y: 60 })).toBe(true);
    expect(containsPoint(diamond, { x: 0, y: 30 })).toBe(true);
  });

  it('keeps the corners of a rectangle inside it', () => {
    const rect = makeNode({ kind: 'rect' });

    expect(containsPoint(rect, { x: 0, y: 0 })).toBe(true);
    expect(containsPoint(rect, { x: 120, y: 0 })).toBe(true);
    expect(containsPoint(rect, { x: 120, y: 60 })).toBe(true);
    expect(containsPoint(rect, { x: 0, y: 60 })).toBe(true);
  });

  it('keeps the corners of a terminal inside it', () => {
    const terminal = makeNode({ kind: 'terminal' });

    expect(containsPoint(terminal, { x: 0, y: 0 })).toBe(true);
    expect(containsPoint(terminal, { x: 120, y: 0 })).toBe(true);
    expect(containsPoint(terminal, { x: 120, y: 60 })).toBe(true);
    expect(containsPoint(terminal, { x: 0, y: 60 })).toBe(true);
  });
});

describe('hitTestNode respects the shape of the node', () => {
  it('skips a diamond when the point is in its empty corner', () => {
    const diamond = makeNode({ id: 'diamond', kind: 'diamond' });
    const rect = makeNode({ id: 'rect', kind: 'rect' });

    // The corner of the diamond is not the diamond, so the rect behind it
    // is the answer.
    expect(hitTestNode({ x: 2, y: 2 }, [rect, diamond])?.id).toBe('rect');
  });

  it('returns the diamond when the point is inside it', () => {
    const diamond = makeNode({ id: 'diamond', kind: 'diamond' });
    const rect = makeNode({ id: 'rect', kind: 'rect' });

    expect(hitTestNode({ x: 60, y: 30 }, [rect, diamond])?.id).toBe('diamond');
  });

  it('returns the top-most node when two nodes overlap', () => {
    const below = makeNode({ id: 'below', kind: 'rect' });
    const above = makeNode({ id: 'above', kind: 'rect' });

    // Later nodes are drawn on top, so the later one wins.
    expect(hitTestNode({ x: 60, y: 30 }, [below, above])?.id).toBe('above');
    expect(hitTestNode({ x: 60, y: 30 }, [above, below])?.id).toBe('below');
  });
});
