import { describe, expect, it } from 'vitest';
import {
  containsPoint,
  edgePath,
  hitTestNode,
  nearestPort,
  nodeCenter,
  portPosition,
  snap,
  snapPoint,
} from '@core/geometry';
import type { FlowNode, PortSide } from '@core/types';

const NODE: FlowNode = {
  id: 'n1',
  kind: 'rect',
  x: 100,
  y: 200,
  w: 120,
  h: 60,
  label: 'Node',
};

describe('snap', () => {
  it('snaps to the nearest multiple of 10', () => {
    expect(snap(123)).toBe(120);
    expect(snap(87)).toBe(90);
    expect(snap(0)).toBe(0);
    expect(snap(100)).toBe(100);
  });

  it('rounds halves towards positive infinity, as Math.round does', () => {
    expect(snap(5)).toBe(10);
    // Math.round(-0.5) is -0, so a negative half rounds towards zero.
    expect(snap(-5)).toBe(0);
    expect(snap(-15)).toBe(-10);
  });

  it('never returns negative zero', () => {
    expect(Object.is(snap(-0), 0)).toBe(true);
    expect(Object.is(snap(-1), 0)).toBe(true);
    expect(Object.is(snap(-4), 0)).toBe(true);
  });

  it('snaps both coordinates of a point', () => {
    expect(snapPoint({ x: 123, y: 87 })).toEqual({ x: 120, y: 90 });
  });
});

describe('portPosition', () => {
  it('returns the midpoint of each side', () => {
    expect(portPosition(NODE, 'top')).toEqual({ x: 160, y: 200 });
    expect(portPosition(NODE, 'right')).toEqual({ x: 220, y: 230 });
    expect(portPosition(NODE, 'bottom')).toEqual({ x: 160, y: 260 });
    expect(portPosition(NODE, 'left')).toEqual({ x: 100, y: 230 });
  });
});

describe('edgePath', () => {
  it('draws a straight line between the two ports', () => {
    expect(edgePath(NODE, 'right', NODE, 'left')).toBe('M 220 230 L 100 230');
  });

  it('starts at the source port and ends at the target port', () => {
    const to: FlowNode = { ...NODE, id: 'n2', x: 400, y: 400 };
    const path = edgePath(NODE, 'bottom', to, 'top');

    expect(path).toBe('M 160 260 L 460 400');
  });
});

describe('hitTestNode', () => {
  const a: FlowNode = { ...NODE, id: 'a', x: 0, y: 0, w: 100, h: 50 };
  const b: FlowNode = { ...NODE, id: 'b', x: 50, y: 0, w: 100, h: 50 };

  it('returns the top-most node when two overlap', () => {
    // Later nodes are drawn on top, so the search runs backwards.
    expect(hitTestNode({ x: 60, y: 10 }, [a, b])?.id).toBe('b');
    expect(hitTestNode({ x: 60, y: 10 }, [b, a])?.id).toBe('a');
  });

  it('returns null when the point misses every node', () => {
    expect(hitTestNode({ x: 500, y: 500 }, [a, b])).toBeNull();
  });

  it('treats the border as inside the node', () => {
    expect(hitTestNode({ x: 0, y: 0 }, [a])?.id).toBe('a');
    expect(hitTestNode({ x: 100, y: 50 }, [a])?.id).toBe('a');
  });

  it('returns null for an empty node list', () => {
    expect(hitTestNode({ x: 0, y: 0 }, [])).toBeNull();
  });
});

describe('nearestPort', () => {
  it('finds the closest side', () => {
    expect(nearestPort(NODE, { x: 160, y: 100 })).toBe('top');
    expect(nearestPort(NODE, { x: 300, y: 230 })).toBe('right');
    expect(nearestPort(NODE, { x: 160, y: 400 })).toBe('bottom');
    expect(nearestPort(NODE, { x: 10, y: 230 })).toBe('left');
  });

  it('breaks ties deterministically', () => {
    // Exactly on the vertical centre line, equally far from top and bottom.
    const node: FlowNode = { ...NODE, x: 0, y: 0, w: 100, h: 100 };
    const side: PortSide = nearestPort(node, { x: 50, y: 50 });
    expect(side).toBe(nearestPort(node, { x: 50, y: 50 }));
  });
});

describe('nodeCenter', () => {
  it('returns the centre of the bounding box', () => {
    expect(nodeCenter(NODE)).toEqual({ x: 160, y: 230 });
  });
});

describe('containsPoint', () => {
  it('includes the border', () => {
    expect(containsPoint(NODE, { x: 100, y: 200 })).toBe(true);
    expect(containsPoint(NODE, { x: 220, y: 260 })).toBe(true);
    expect(containsPoint(NODE, { x: 99, y: 200 })).toBe(false);
    expect(containsPoint(NODE, { x: 221, y: 260 })).toBe(false);
  });
});
