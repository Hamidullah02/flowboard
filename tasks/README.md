# Task packages

Two self-contained bug reports, each one a task a contributor could pick up.
They are the proof that this repository can be worked on by someone who did
not write it.

## Why this folder exists

A portfolio project shows that you can write code. It does not show that you
can write code that _other people_ can work on, or that you can specify
work objectively instead of by opinion.

A task package does both. Each one is a bug report with:

- a problem a newcomer can understand without reading the codebase first,
- success criteria that are **tests**, not opinions,
- the exact commit the task starts from,
- a reference solution, so a reviewer can check the task is solvable.

The two tasks here were both found in this codebase, both were verified by
running the tests before and after the fix, and both are marked with the
number of tests that fail on the starting commit.

## The tasks

| Task                                                                          | The bug                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`task-01-diamond-hit-test`](task-01-diamond-hit-test/)                       | A diamond node's empty corner counts as a hit, so clicking it selects nothing. |
| [`task-02-import-validator-invariants`](task-02-import-validator-invariants/) | The import validator accepts nodes off the grid and nodes with no size.        |

## How to run one

Every task follows the same three steps.

**1. Check out the starting commit.**

```bash
git checkout $(cat tasks/task-01-diamond-hit-test/starting-commit.txt)
```

**2. Copy the grading tests in and run them.**

```bash
cp tasks/task-01-diamond-hit-test/diamond-hit-test.test.ts tests/unit/
npm test -- tests/unit/diamond-hit-test.test.ts
```

The grading file is named `*.test.ts` inside the task folder so that it does
not run as part of this repository's own suite. Only the copy in
`tests/unit/` runs.

The tests should **fail** here. That is what proves the task is real: if
they pass on the starting commit, the task is describing behaviour that
already works.

**3. Fix the code, and run the tests again.**

They should now pass. The whole suite must pass too:

```bash
npm run lint && npm run typecheck && npm test && npm run e2e
```

## How to check the reference solution

Each task folder has a `reference-solution.patch`. Apply it to the starting
commit and the grading tests should pass:

```bash
git apply tasks/task-01-diamond-hit-test/reference-solution.patch
npm test -- tests/unit/diamond-hit-test.test.ts
```

If the reference solution does not make the tests pass, the task is broken
and should be rewritten or dropped. That is the rule the whole folder is
built on: **a task that cannot be graded objectively does not ship.**

## The rule for writing a new task

- The problem must be clear to someone who has never seen the codebase.
- The success criteria must be tests. Never "the code should be cleaner".
- The tests must fail on the starting commit and pass with the reference
  solution. Both runs must actually be performed.
- If the task is ambiguous, or you cannot grade it, rewrite it or drop it.

## Verified runs

| Task | Starting commit | Tests failing on start | Tests passing with the reference solution | Full suite with the fix |
| ---- | --------------- | ---------------------- | ----------------------------------------- | ----------------------- |
| 01   | `59adc09`       | 2 of 8                 | 8 of 8                                    | 167 passed              |
| 02   | `d95eb87`       | 8 of 11                | 11 of 11                                  | 170 passed              |

A task whose grading tests all pass on the starting commit is not testing
anything. The failing count above is the proof that each task describes a
real, currently-present defect.
