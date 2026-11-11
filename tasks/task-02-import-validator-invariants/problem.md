# Task 2: the import validator lets broken documents into the app

## The problem

Flowboard lets you import a flowchart from a JSON file. The validator is
supposed to reject any file that breaks one of the app's invariants, and it
is documented as doing exactly that:

> Validation covers the shape and every invariant the reducer maintains, so an
> invalid document can never enter the app.
> — `src/core/serialize.ts`

It does not. Two whole classes of broken document are accepted today.

### 1. A node off the grid is accepted

Every node the user can create is snapped to the 10px grid, so a node at
`x: 123, y: 87` cannot exist in a document the app produced. But import
accepts it and stores the raw values:

```json
{
  "version": 1,
  "nodes": [
    { "id": "n1", "kind": "rect", "x": 123, "y": 87, "w": 120, "h": 60, "label": "Off grid" }
  ],
  "edges": []
}
```

The result is a document that violates the "stored positions are snapped to
the grid" invariant. The node sits between two grid lines, so it does not
line up with anything else, and it cannot be reached by dragging it one
step, because every drag snaps.

### 2. A node with no size, or a negative size, is accepted

```json
{
  "version": 1,
  "nodes": [{ "id": "n1", "kind": "rect", "x": 0, "y": 0, "w": 0, "h": -5, "label": "Bad size" }],
  "edges": []
}
```

This is accepted too. A zero-width node is invisible and cannot be clicked.
A negative height is worse than useless: the node is drawn flipped, its
ports are in the wrong places, and every edge attached to it is routed to
the wrong point.

## What to do

Make `importDoc` enforce the invariants the app actually keeps.

- **Positions must be on the grid.** A node's `x` and `y` must be a
  multiple of 10. `snap` in `src/core/geometry.ts` is the function that
  defines the grid, so use it rather than hard-coding the number.
- **Size must be positive.** `w` and `h` must both be greater than zero.
- The rejected file must produce a **clear error message** naming the
  problem and the node it came from, in the same style as the existing
  errors.
- The current document must be **untouched** when an import is rejected.
  That already works and must keep working.

## Constraints

- `src/core/` must stay free of React and of DOM access.
- Do not "fix" the problem by silently snapping the values on import. The
  validator's job is to reject a document that the app could not have
  produced, not to repair it. A file that a user edited by hand should
  either be accepted as-is or be refused with a message they can act on.
- Keep accepting every document that is valid today. In particular, the
  bundled fixture `fixtures/login-flow.json` must still import cleanly.

## Success criteria

The grading tests are in this folder. Copy them into the repository and run
them:

```bash
cp tasks/task-02-import-validator-invariants/import-validator.test.ts tests/unit/
npm test -- tests/unit/import-validator.test.ts
```

The task is complete when:

1. A node whose `x` is not a multiple of 10 is **rejected**.
2. A node whose `y` is not a multiple of 10 is **rejected**.
3. A node with `w: 0` is **rejected**.
4. A node with `h: 0` is **rejected**.
5. A node with a negative `w` is **rejected**.
6. A node with a negative `h` is **rejected**.
7. A node that is on the grid and has a positive size is **accepted**.
8. The bundled fixture still imports cleanly.
9. A rejected import leaves the current document untouched.
10. The error message names the node that caused the rejection.

Every one of these is a test.
