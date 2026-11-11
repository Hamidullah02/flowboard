# Success criteria — Task 1

Every criterion below is a test. There is no criterion that needs a human to
decide whether it passed.

## How to run the grading tests

Copy the grading file into the repository and run it:

```bash
cp tasks/task-01-diamond-hit-test/diamond-hit-test.test.ts tests/unit/
npm test -- tests/unit/diamond-hit-test.test.ts
```

The file is named `diamond-hit-test.test.ts` rather than `*.test.ts` in the
task folder so that it does not run as part of the repository's own test
suite. Only the copy runs.

## The checks

| # | Check                                                                     | Test name                                    |
| - | ------------------------------------------------------------------------- | -------------------------------------------- |
| 1 | The centre of a diamond is inside it                                      | `keeps the centre of a diamond inside it`     |
| 2 | The four corners of a diamond are **outside** it                          | `keeps the four corners of a diamond outside it` |
| 3 | A point on the border of a diamond is inside it                           | `keeps a point on the border of a diamond inside it` |
| 4 | The four corners of a rectangle are still inside it                        | `keeps the corners of a rectangle inside it`  |
| 5 | The four corners of a terminal are still inside it                        | `keeps the corners of a terminal inside it`   |
| 6 | `hitTestNode` skips a diamond when the point is in its empty corner       | `skips a diamond when the point is in its empty corner` |
| 7 | `hitTestNode` returns the diamond when the point is inside it             | `returns the diamond when the point is inside it` |
| 8 | `hitTestNode` still returns the top-most node when two overlap            | `returns the top-most node when two nodes overlap` |

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

- **Against the starting commit:** 2 of the 8 grading tests fail —
  `keeps the four corners of a diamond outside it` and
  `skips a diamond when the point is in its empty corner`. The other 6 pass,
  because they describe behaviour that was already correct and must stay
  correct.
- **Against the reference solution:** all 8 pass, and the full suite passes
  at 167 tests.
