# Success criteria — Task 2

Every criterion below is a test. There is no criterion that needs a human to
decide whether it passed.

## How to run the grading tests

Copy the grading file into the repository and run it:

```bash
cp tasks/task-02-import-validator-invariants/import-validator.test.ts tests/unit/
npm test -- tests/unit/import-validator.test.ts
```

The file is named `import-validator.test.ts` rather than `*.test.ts` in the
task folder so that it does not run as part of the repository's own test
suite. Only the copy runs.

## The checks

| #   | Check                                                   | Test name                                   |
| --- | ------------------------------------------------------- | ------------------------------------------- |
| 1   | A node whose `x` is not on the grid is **rejected**     | `rejects a node whose x is not on the grid` |
| 2   | A node whose `y` is not on the grid is **rejected**     | `rejects a node whose y is not on the grid` |
| 3   | A node with `w: 0` is **rejected**                      | `rejects a node with no width`              |
| 4   | A node with `h: 0` is **rejected**                      | `rejects a node with no height`             |
| 5   | A node with a negative `w` is **rejected**              | `rejects a node with a negative width`      |
| 6   | A node with a negative `h` is **rejected**              | `rejects a node with a negative height`     |
| 7   | A node on the grid with a positive size is **accepted** | `accepts a node with a positive size`       |
| 8   | The bundled fixture still imports cleanly               | `still imports cleanly`                     |
| 9   | A rejected import leaves the current document untouched | `leaves the current document untouched`     |
| 10  | The error message names the offending node              | `names the node that caused the rejection`  |

There are 11 assertions in the file: the 10 checks above, plus one that a
node on the grid is accepted as it is.

## What must not regress

The task is only correct if the whole existing suite still passes:

```bash
npm run lint
npm run typecheck
npm test
npm run e2e
```

The reference solution was checked against all four. A change that makes the
grading tests pass but breaks an existing test is not a solution.

## Verified runs

This task was validated by running it, not by inspection:

- **Against the starting commit:** 8 of the 11 grading tests fail — the two
  grid checks, the four size checks, and the two that check the rejection
  path. The other 3 pass, because they describe behaviour that was already
  correct and must stay correct.
- **Against the reference solution:** all 11 pass, and the full suite passes
  at 170 tests.
