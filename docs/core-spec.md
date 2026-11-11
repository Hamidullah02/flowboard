# `src/core/types.ts` — spec (write this yourself first)

Your `agents.md` says core logic is yours to write. This is the contract the
rest of the app is written against, so implement it exactly.

## 1. Types

```ts
export type NodeKind = 'rect' | 'diamond' | 'terminal';
export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export interface FlowNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface FlowEdge {
  id: string;
  from: { nodeId: string; side: PortSide };
  to: { nodeId: string; side: PortSide };
}

export interface Doc {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
}

export interface State {
  doc: Doc;
  selection: Selection;
  past: Doc[];
  future: Doc[];
}
```

`x, y` is the top-left corner of the bounding box. `w`, `h` are the box size.

## 2. Actions — a discriminated union

```ts
export type Action =
  | { type: 'ADD_NODE'; kind: NodeKind; x: number; y: number }
  | { type: 'MOVE_NODE'; id: string; x: number; y: number }
  | { type: 'RENAME_NODE'; id: string; label: string }
  | {
      type: 'ADD_EDGE';
      from: { nodeId: string; side: PortSide };
      to: { nodeId: string; side: PortSide };
    }
  | { type: 'DELETE_SELECTION' }
  | { type: 'SELECT'; nodeIds?: string[]; edgeIds?: string[] }
  | { type: 'IMPORT'; doc: Doc }
  | { type: 'UNDO' }
  | { type: 'REDO' };
```

Notes:

- `ADD_NODE` does not carry an id. The reducer generates it, so ids are
  deterministic in tests only if you inject the generator. Recommended shape:
  `reducer(state, action, deps?)` where `deps` defaults to `{ nextId }`, and tests
  pass a counter. The plan says "IDs come from a counter or an injected id
  generator, so tests are deterministic" — pick the injected generator, it is the
  one that makes the acceptance tests reproducible.
- `SELECT` with no arguments clears the selection.

## 3. Invariants (the reducer must hold all of these)

1. Node ids are unique.
2. Every edge endpoint refers to a node that exists.
3. No self-loops (`from.nodeId === to.nodeId`).
4. No duplicate edges (same `from` and same `to`).
5. Stored positions are multiples of 10.
6. Deleting a node removes every edge that touches it.
7. `UNDO` then `REDO` returns a deep-equal state.

## 4. Behaviour per action

| Action             | Effect on `doc`                 | Effect on `selection` | History                           |
| ------------------ | ------------------------------- | --------------------- | --------------------------------- |
| `ADD_NODE`         | append a node, snapped          | select the new node   | push                              |
| `MOVE_NODE`        | set position, snapped           | unchanged             | push                              |
| `RENAME_NODE`      | set label                       | unchanged             | push                              |
| `ADD_EDGE`         | append an edge, if valid        | unchanged             | push (only if the edge was added) |
| `DELETE_SELECTION` | remove selected nodes and edges | clear                 | push                              |
| `SELECT`           | unchanged                       | replace               | **none**                          |
| `IMPORT`           | replace the whole doc           | clear                 | push                              |
| `UNDO`             | restore previous doc            | unchanged             | move `past` → `future`            |
| `REDO`             | restore next doc                | unchanged             | move `future` → `past`            |

Rejection rules: `ADD_EDGE` for a self-loop or a duplicate is a no-op. The state
must be **deep-equal to before**, not just "visually the same". Return the same
object reference if you can — that makes `toBe` assertions possible and is the
cheapest way to guarantee "no history entry".

`past` is capped at 100 entries. Any action other than `SELECT` clears `future`.

## 5. File split

| File                    | Contents                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `src/core/types.ts`     | the types above                                                                           |
| `src/core/reducer.ts`   | `reducer(state, action, deps?)` and `initialState`                                        |
| `src/core/geometry.ts`  | `snap`, `portPosition`, `edgePath`, `hitTestNode`, `nearestPort`, `clientToSvg`           |
| `src/core/history.ts`   | `pushHistory`, `undo`, `redo` (or keep these inside the reducer — your call, but say why) |
| `src/core/serialize.ts` | `exportDoc(doc)`, `importDoc(raw): { ok: true; doc } \| { ok: false; error: string }`     |

`src/core/` must have zero React imports, zero DOM access, and zero `any`.

## 6. Geometry signatures

```ts
export const GRID = 10;

export function snap(v: number): number; // Math.round(v / 10) * 10
export function portPosition(node: FlowNode, side: PortSide): { x: number; y: number };
export function edgePath(
  from: FlowNode,
  fromSide: PortSide,
  to: FlowNode,
  toSide: PortSide,
): string;
export function hitTestNode(point: { x: number; y: number }, nodes: FlowNode[]): FlowNode | null;
export function nearestPort(node: FlowNode, point: { x: number; y: number }): PortSide;
```

`clientToSvg` is the one function that touches the DOM, so it does **not** belong
in `core/`. Put it in `src/ui/hooks/usePointerDrag.ts` or `src/ui/pointer.ts`.
The plan puts it under geometry, but a DOM-free `core/` is the stronger rule and
the ESLint config enforces it. If you disagree, say so and we can allow
`clientToSvg` as the single exception.

`hitTestNode` returns the **top-most** node whose box contains the point. Define
"top-most" explicitly: last in the `nodes` array is drawn on top, so the search
should go from the end of the array backwards and return the first hit.

`edgePath` v1 is a straight line between the two port positions. Elbow routing
is a stretch goal.

## 7. The 12 acceptance tests

Write these in `tests/unit/` before writing the implementation. They map 1:1 to
the table in the plan.

| #   | Given                          | When                 | Then                                                         |
| --- | ------------------------------ | -------------------- | ------------------------------------------------------------ |
| 1   | node at (0,0)                  | move to (123, 87)    | position is (120, 90)                                        |
| 2   | node with 2 edges              | delete node          | node and both edges are gone                                 |
| 3   | state after delete             | undo                 | state deep-equals the state before delete                    |
| 4   | state after undo               | redo                 | state deep-equals the state after delete                     |
| 5   | any doc                        | export then import   | deep-equal to the original                                   |
| 6   | edge between two nodes         | read endpoints       | each is within 0.5px of its port position                    |
| 7   | fixture JSON                   | load                 | node count, edge count and positions match the expected file |
| 8   | two nodes                      | add edge A to A      | rejected, state unchanged                                    |
| 9   | edge A to B exists             | add the same edge    | rejected, state unchanged                                    |
| 10  | invalid JSON                   | import               | error returned, current doc unchanged                        |
| 11  | one drag with 20 pointer moves | pointer up           | exactly one history entry                                    |
| 12  | demo build                     | e2e: drag node, undo | node returns to the original position                        |

Notes per test:

- **1** goes through `MOVE_NODE` with `x: 123, y: 87`. The reducer snaps, so
  the stored value must be `(120, 90)`. Do not snap in the test.
- **2** delete a node that has two edges attached. Both edges must disappear
  (invariant 6).
- **3 / 4** compare with `toEqual`, and use a deep clone of the "before" state.
  Do not compare against a reference you mutated later.
- **5** round-trip: `importDoc(exportDoc(doc))` must equal `doc`.
- **6** `edgePath` endpoints must land on `portPosition` within 0.5px. Assert
  with `toBeCloseTo`, not `toBe`.
- **7** `fixtures/login-flow.json` is the fixture. The expected counts are in
  the file: 6 nodes, 6 edges. Assert the node positions too — that is the point
  of the fixture.
- **8 / 9** assert the state is **deep-equal** to before, and that `past.length`
  did not grow.
- **10** feed `"not json"` and `{ version: 2 }`. Both must return an error and
  leave the doc untouched.
- **11** this one is at the UI layer: dispatch `MOVE_NODE` once on pointer up,
  and assert `past.length` grew by exactly 1 across 20 pointer moves. The
  preview position during the drag lives in component state, not in the reducer.
- **12** already written as `tests/e2e/editor.spec.ts`.

## 8. Coverage

`npm run coverage` fails the build below 90% lines, functions, branches, and
statements for `src/core/`. The config already sets that threshold.
