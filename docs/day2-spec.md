# Day 2 — `geometry.ts` and `history.ts` (write these yourself)

Day 1 is done: toolchain, CI, UI shell, fixture. The core is untouched, as
your `agents.md` requires. This document is the hint sheet for Day 2.

Read `docs/core-spec.md` first — it defines the types and the actions. This
file only covers the two files you write today.

---

## 1. `src/core/geometry.ts`

Pure functions. No DOM, no React, no randomness. Every one of them is a
straight-line translation of the plan's section 9.4.

### 1.1 `snap`

```ts
export const GRID = 10;

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}
```

Worked examples to write as tests:

| input  | output | why                                           |
| ------ | ------ | --------------------------------------------- |
| `123`  | `120`  | 12.3 rounds to 12                             |
| `87`   | `90`   | 8.7 rounds to 9                               |
| `5`    | `10`   | 0.5 rounds **up**, away from zero             |
| `-5`   | `-10`  | `Math.round(-0.5)` is `-0`, so this is a trap |
| `0`    | `0`    |                                               |
| `-123` | `-120` |                                               |

The `-5` case is the one worth a test. `Math.round(-0.5)` returns `-0`, and
`-0 * 10` is `-0`. If your `snap(-5)` returns `-0`, `Object.is(-0, 0)` is
`false` and a `toBe` assertion will fail in a confusing way. Decide now: is
`-0` acceptable, or do you normalise it? Either is fine, but be deliberate.

### 1.2 `portPosition`

```ts
export function portPosition(node: FlowNode, side: PortSide): { x: number; y: number };
```

The midpoint of one side of the bounding box. `x, y` is the top-left corner,
`w, h` the size:

| side     | x                     | y                     |
| -------- | --------------------- | --------------------- |
| `top`    | `node.x + node.w / 2` | `node.y`              |
| `right`  | `node.x + node.w`     | `node.y + node.h / 2` |
| `bottom` | `node.x + node.w / 2` | `node.y + node.h`     |
| `left`   | `node.x`              | `node.y + node.h / 2` |

Worked example — node at `(100, 200)`, `120 x 60`:

| side     | result               |
| -------- | -------------------- |
| `top`    | `{ x: 160, y: 200 }` |
| `right`  | `{ x: 220, y: 230 }` |
| `bottom` | `{ x: 160, y: 260 }` |
| `left`   | `{ x: 100, y: 230 }` |

Write one test per side. A switch with an exhaustive return type is the
cleanest way to get the compiler to check you did all four.

### 1.3 `edgePath`

```ts
export function edgePath(
  from: FlowNode,
  fromSide: PortSide,
  to: FlowNode,
  toSide: PortSide,
): string;
```

v1 is a straight line: `M x1 y1 L x2 y2`.

Acceptance test 6 says "each endpoint is within 0.5px of its port position",
so the test must parse the path, not compare the whole string. The easy way:

```ts
const [start, end] =
  edgePath(a, 'right', b, 'left')
    .match(/-?\d+(\.\d+)?/g)
    ?.map(Number) ?? [];
```

then assert `start[0]` is `toBeCloseTo(portPosition(a, 'right').x)`.

If you would rather return a structured value than a string, that is a better
design — `{ from: Point; to: Point }` — but then the SVG component has to
build the `d` attribute. Pick one and say why in a comment. My recommendation:
return the string, because the SVG `d` attribute is the only consumer and the
elbow-routing stretch goal will need a path builder anyway.

### 1.4 `hitTestNode`

```ts
export function hitTestNode(point: { x: number; y: number }, nodes: FlowNode[]): FlowNode | null;
```

Returns the **top-most** node whose box contains the point, or `null`.

- "Contains" means `x <= point.x <= x + w` and `y <= point.y <= y + h`. Use
  `<=`, not `<`: a point exactly on the border is on the node.
- "Top-most" means the last one in the array, because later nodes are drawn
  later and therefore on top. **Search the array backwards** and return the
  first hit. If you search forwards you will pick the bottom-most node, which
  is a bug that looks fine until two nodes overlap.

Worked example — nodes `[{ id: 'a', x: 0, y: 0, w: 100, h: 50 }, { id: 'b', x: 50, y: 0, w: 100, h: 50 }]`,
point `{ x: 60, y: 10 }`:

- both boxes contain the point
- `b` is later in the array, so `b` is on top
- **result: `b`**

Write this exact case as a test. It is the single most likely bug in this
function.

### 1.5 `nearestPort`

```ts
export function nearestPort(node: FlowNode, point: { x: number; y: number }): PortSide;
```

The side whose port position is closest to `point`. Compute the distance from
`point` to each of the four port positions and return the closest side.

The obvious implementation computes `portPosition` four times and compares
squared distances. Squared distance is fine — you never need the square root
to compare two distances. Say so in a comment so a reviewer does not think you
forgot the root.

Tie-breaking matters: if `point` is exactly equidistant from two sides, the
result depends on your comparison order. Pick a deterministic order (e.g.
`top`, `right`, `bottom`, `left`) and write a test for a tie case. A
non-deterministic tie-break is a bug that only shows up on a user machine.

### 1.6 What does **not** belong in `geometry.ts`

`clientToSvg`. It touches the DOM. It is already written for you in
`src/ui/pointer.ts`:

```ts
clientToSvg(event: { clientX: number; clientY: number }, svg: SVGSVGElement): Point
```

Read it and understand it — it is the one piece of real SVG geometry in the
project. `getScreenCTM().inverse()` is the only correct bridge between client
pixels and SVG user units. Using `clientX` directly is the classic bug, and
it only shows up when the SVG is scaled or offset.

---

## 2. `src/core/history.ts`

You have a choice here, and the choice is worth defending.

### Option A — history functions inside the reducer file

```ts
function pushHistory(state: State, doc: Doc): State;
function undo(state: State): State;
function redo(state: State): State;
```

Pros: the reducer stays the single place that knows the rules. Cons: the file
grows, and the rules are harder to unit test in isolation.

### Option B — a separate `history.ts` with pure helpers

```ts
export function pushHistory(past: Doc[], doc: Doc): Doc[]; // capped at 100
export function undo(state: State): State;
export function redo(state: State): State;
```

Pros: `pushHistory` is trivially testable. Cons: `undo`/`redo` still need to
know about `State`.

My recommendation: **Option A**. History in this app is four rules and three
branches. Splitting it out creates a second file that mostly re-exports
knowledge already in the reducer, and the plan says "You can explain every file
in `src/core/` without notes" — fewer, denser files are easier to defend in an
interview than more, thinner ones. If you pick Option A, `history.ts` does not
exist, and that is fine. Just say so out loud in your explanation.

### 2.1 The rules

1. `past` holds whole `Doc` objects. `future` holds whole `Doc` objects.
2. `past` is capped at 100 entries. When you push the 101st, drop the oldest.
3. Any action other than `SELECT` clears `future`.
4. `SELECT` creates no history entry.
5. `UNDO` when `past` is empty is a no-op. Same for `REDO` when `future` is
   empty.
6. `UNDO` moves the current doc to `future`, and pops the last `past` entry
   into `doc`.

Rule 6 in detail — this is where undo/redo bugs live:

```
state = { doc: D2, past: [D0, D1], future: [D3] }

undo:
  doc   = D1        (pop from past)
  past  = [D0]      (the rest of past)
  future = [D3, D2] (current doc pushed onto future)

redo:
  doc    = D3       (pop from future)
  future = [D2]     (the rest of future)
  past   = [D0, D1, D2]  (current doc pushed onto past)
```

Note the asymmetry: `undo` pushes the current doc onto `future`, `redo` pushes
the current doc onto `past`. If you get one of those backwards, undo and redo
will appear to work once and then break.

### 2.2 Tests to write

| #   | Setup                 | Action         | Assert                                             |
| --- | --------------------- | -------------- | -------------------------------------------------- |
| 1   | fresh state           | `UNDO`         | state is unchanged (deep-equal)                    |
| 2   | fresh state           | `REDO`         | state is unchanged (deep-equal)                    |
| 3   | one edit              | `UNDO`         | doc is back to the original                        |
| 4   | one edit, then `UNDO` | `REDO`         | doc is back to the edited version                  |
| 5   | one edit, then `UNDO` | new edit       | `future` is empty                                  |
| 6   | 101 edits             | the 101st edit | `past.length` is 100, and the oldest doc is gone   |
| 7   | any state             | `SELECT`       | `past.length` unchanged, `future.length` unchanged |

Test 4 is the acceptance test 4, and it must use `toEqual` on the whole state,
not on `state.doc` alone. The plan's acceptance test 3 says "state deep-equals
the state before delete" — the _state_, including `past` and `future`.

### 2.3 A subtlety worth getting right

When you push to `past`, do you push the doc **before** the change, or **after**?

Push **before**. `past` is a stack of "documents you can go back to". After
editing `D0` into `D1`, `past` becomes `[D0]`, so undo returns to `D0`.

If you pushed after, `past` would be `[D1]` and undo would be a no-op. This is
the second most common history bug after the top-most hit test.

---

## 3. What the reducer needs from you (Day 3 preview)

`history.ts` and `geometry.ts` are self-contained. `reducer.ts` is where they
meet, and it is Day 3. But you can prepare by answering these:

1. Does `ADD_EDGE` for a rejected edge (self-loop, duplicate) push to `past`?
   **No.** The state must be deep-equal to before, and `past.length` must not
   grow. This is acceptance tests 8 and 9.
2. Does `MOVE_NODE` to the position the node is already at push to `past`?
   Your call. Recommend: no. A no-op move should not cost an undo step. But
   then you must return the _same_ state object, or at least a deep-equal one,
   so the test can assert `past.length` did not grow.
3. Does `IMPORT` clear the history, or push the old doc onto `past` so the
   import can be undone? Recommend: push it, so import is undoable. The plan
   does not say. Whatever you pick, write it in the README.

---

## 4. Definition of done for Day 2

- `npm run lint` — clean. The `src/core` rules (no React, no DOM globals, no
  `any`) are enforced by ESLint, so a clean lint run proves the boundary held.
- `npm run typecheck` — clean, with `strict` and `noUncheckedIndexedAccess`.
  Note: `noUncheckedIndexedAccess` means `nodes[0]` has type `FlowNode | undefined`.
  You will need to handle that in `hitTestNode`. This is the compiler doing its
  job, not an obstacle.
- `npm test` — the geometry and history tests pass, and coverage on
  `src/core/` is above 90%.
- `npm run coverage` — the threshold is enforced by the config, so it fails
  automatically if you are short.

One commit per file, `type: short summary`:

```
feat: add pure geometry helpers with tests
feat: add snapshot history with undo and redo
```
