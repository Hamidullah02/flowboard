/*
 * Geometry helpers.
 *
 * Pure functions over the document model. No DOM access lives here: the one
 * function that needs the browser (`clientToSvg`) is in `src/ui/pointer.ts`,
 * because `src/core/` must stay DOM-free.
 */

import type { FlowNode, PortSide } from '@core/types';

export interface Point {
  x: number;
  y: number;
}

/** Grid the canvas snaps to, in SVG user units. */
export const GRID = 10;

/**
 * Snap a value to the grid.
 *
 * `Math.round` rounds halves towards positive infinity, so `snap(5)` is `10`
 * but `snap(-5)` is `0`. That asymmetry is inherited from `Math.round`, and
 * it is documented here rather than papered over.
 *
 * The result is normalised so it is never negative zero: `Math.round(-0.5)`
 * is `-0`, and `-0 * GRID` stays `-0`. Leaving that in place would make
 * `Object.is(snap(-1), 0)` false and quietly break equality checks.
 */
export function snap(value: number): number {
  const snapped = Math.round(value / GRID) * GRID;
  // `Math.round(-0.5)` is `-0`; `-0 * GRID` stays `-0`. Normalise it away.
  return snapped === 0 ? 0 : snapped;
}

/** Snap both coordinates of a point. */
export function snapPoint(point: Point): Point {
  return { x: snap(point.x), y: snap(point.y) };
}

/**
 * The midpoint of one side of a node's bounding box.
 */
export function portPosition(node: FlowNode, side: PortSide): Point {
  switch (side) {
    case 'top':
      return { x: node.x + node.w / 2, y: node.y };
    case 'right':
      return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'bottom':
      return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'left':
      return { x: node.x, y: node.y + node.h / 2 };
  }
}

/**
 * The two endpoints of an edge, in SVG user units.
 *
 * Structured rather than a path string, so a test can compare an endpoint
 * against a port position directly. `edgePath` is built on top of this.
 */
export function edgeEndpoints(
  from: FlowNode,
  fromSide: PortSide,
  to: FlowNode,
  toSide: PortSide,
): { from: Point; to: Point } {
  return {
    from: portPosition(from, fromSide),
    to: portPosition(to, toSide),
  };
}

/**
 * The SVG path for an edge. Version 1 routes edges as straight lines.
 */
export function edgePath(
  from: FlowNode,
  fromSide: PortSide,
  to: FlowNode,
  toSide: PortSide,
): string {
  const { from: start, to: end } = edgeEndpoints(from, fromSide, to, toSide);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/**
 * The top-most node whose bounding box contains the point, or `null`.
 *
 * Later nodes are drawn later and therefore sit on top, so the search runs
 * backwards through the array and returns the first hit. Searching forwards
 * would return the bottom-most node, which is wrong whenever two nodes
 * overlap.
 */
export function hitTestNode(point: Point, nodes: readonly FlowNode[]): FlowNode | null {
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index];
    if (node === undefined) continue;

    if (containsPoint(node, point)) return node;
  }
  return null;
}

/**
 * The side of the node whose port is closest to the point.
 *
 * Distances are compared squared: the square root is monotonic, so it never
 * changes the ordering and there is no reason to compute it.
 *
 * Ties are broken by the fixed order top, right, bottom, left, so the result
 * is deterministic for a given point.
 */
export function nearestPort(node: FlowNode, point: Point): PortSide {
  const sides: PortSide[] = ['top', 'right', 'bottom', 'left'];
  let bestSide: PortSide = 'top';
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const side of sides) {
    const port = portPosition(node, side);
    const dx = point.x - port.x;
    const dy = point.y - port.y;
    const distance = dx * dx + dy * dy;

    // Strictly less, so the first side wins a tie.
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSide = side;
    }
  }

  return bestSide;
}

/**
 * The centre of a node's bounding box.
 */
export function nodeCenter(node: FlowNode): Point {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

/**
 * Whether a point is inside a node's bounding box. The border counts as
 * inside, so a click exactly on the edge still selects the node.
 */
export function containsPoint(node: FlowNode, point: Point): boolean {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.w &&
    point.y >= node.y &&
    point.y <= node.y + node.h
  );
}
