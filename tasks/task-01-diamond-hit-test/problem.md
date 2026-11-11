# Task 1: a diamond node's empty corner is clickable

## The problem

In the flowchart editor, clicking the empty corner of a **diamond** node does
nothing useful: it does not select the diamond, and it does not select
anything behind it either. The click simply misses.

A diamond is drawn as a rotated square, so its bounding box has four
triangular corners that are **not** part of the shape. The rectangle and the
rounded terminal fill their whole bounding box, so a click anywhere in their
box hits them. The diamond does not.

Try it: open the demo, find the `Valid?` diamond, and click the very top-left
corner of it. The click lands on empty canvas, so the selection clears
instead of selecting the diamond.

## What is wrong

The hit test treats every node as if it were a rectangle. `containsPoint` in
`src/core/geometry.ts` only checks the bounding box:

```ts
return (
  point.x >= node.x && point.x <= node.x + node.w && point.y >= node.y && point.y <= node.y + node.h
);
```

For a `rect` or a `terminal` that is exactly right. For a `diamond` it is
wrong in the four corners: those points are outside the shape.

`hitTestNode` uses `containsPoint`, so it inherits the same mistake. That
matters in two places:

- **Clicking to select.** A click on the corner of a diamond selects nothing.
- **Dropping a connection.** When you drag an edge from a port and release it
  over the corner of a diamond, the diamond is not recognised as a valid
  target, so the connection is dropped.

## What to do

Make the hit test respect the shape of the node.

- A `rect` and a `terminal` keep their current behaviour: the whole bounding
  box is clickable.
- A `diamond` is clickable only where the diamond actually is. The diamond is
  drawn with these points (see `diamondPoints` in `src/ui/Canvas.tsx`):

  ```
  top    = (x + w/2, y)
  right  = (x + w,   y + h/2)
  bottom = (x + w/2, y + h)
  left   = (x,       y + h/2)
  ```

  A point is inside the diamond when it is on the correct side of all four
  edges. You can work this out with the standard half-plane test, or with
  the fact that the diamond is the set of points whose normalised distance
  from the centre is at most one.

- The centre of a diamond must stay clickable.
- A point exactly on a diamond's border counts as inside, the same way a
  point exactly on a rectangle's border counts as inside today. The existing
  tests rely on that rule, so do not change it.

## Constraints

- `src/core/` must stay free of React and of DOM access. The fix belongs in
  `src/core/geometry.ts`.
- Do not change how the diamond is _drawn_. Only the hit test changes.
- Keep the existing behaviour of `rect` and `terminal` exactly as it is.

## Success criteria

The grading tests are in `tests/`. Copy them into the repository and run
them:

```bash
npm test -- tests/unit/diamond-hit-test.test.ts
```

The task is complete when:

1. The centre of a diamond is inside it.
2. Each of the four corners of a diamond's bounding box is **outside** it.
3. A point on the border of a diamond is inside it.
4. The four corners of a **rectangle** are still inside it.
5. The four corners of a **terminal** are still inside it.
6. `hitTestNode` skips a diamond when the point is in its empty corner, and
   returns the node behind it instead.
7. `hitTestNode` still returns the **top-most** node when two nodes overlap.

Every one of these is a test. There is nothing to judge by opinion.
