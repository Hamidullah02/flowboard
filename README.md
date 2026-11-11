# Flowboard

[![CI](https://github.com/Hamidullah02/flowboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamidullah02/flowboard/actions/workflows/ci.yml)

A React + TypeScript SVG flowchart editor, built as a portfolio project to prove
frontend and interactive-graphics skill.

> **Status: the editor works.** The toolchain, the UI shell, the fixture, and the CI
> pipeline are in place, and the document model (`src/core/`) is implemented and
> wired into the UI. The app loads the fixture flowchart, and you can add, move,
> rename, connect, select, and delete nodes, with undo and redo.

## Why this project exists

The goal is not a product. draw.io, Excalidraw, and React Flow already do this
better. The goal is a public repo that proves:

- React + TypeScript (strict, zero `any` in `src/core/`) competence
- Real geometry work (SVG coordinate transforms, port maths, hit testing)
- Reducer-based state management with working undo/redo
- Objective verification: 25+ unit tests, 3 e2e tests, coverage gated at 90%

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Three commands, that is the whole setup.

## Scripts

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Vite dev server                                      |
| `npm run build`     | Typecheck (`tsc -b`) then production build           |
| `npm run preview`   | Serve the production build locally                   |
| `npm run lint`      | ESLint, strict type-checked rules                    |
| `npm run typecheck` | `tsc -b --noEmit`                                    |
| `npm test`          | Vitest unit + component tests                        |
| `npm run coverage`  | Vitest with coverage, fails below 90% on `src/core/` |
| `npm run e2e`       | Playwright end-to-end tests                          |
| `npm run format`    | Prettier, write mode                                 |

## Architecture

```
src/
  core/      # pure logic: no React, no DOM
  ui/        # React components
  styles/    # design tokens and app styles
fixtures/    # reference flowchart, as JSON
tests/
  unit/      # Vitest specs for core/
  component/ # Vitest + Testing Library specs for ui/
  e2e/       # Playwright specs
```

The one rule that shapes the codebase: **`core/` never imports from `ui/`**.
`core/` is plain TypeScript with no React and no DOM, so every rule about the
document model can be tested as a pure function. ESLint enforces this boundary
with `no-restricted-imports`, so the rule cannot rot.

### State model

```ts
type NodeKind = 'rect' | 'diamond' | 'terminal';
type PortSide = 'top' | 'right' | 'bottom' | 'left';

interface FlowNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}
interface FlowEdge {
  id: string;
  from: { nodeId: string; side: PortSide };
  to: { nodeId: string; side: PortSide };
}
interface Doc {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
interface State {
  doc: Doc;
  selection: { nodeIds: string[]; edgeIds: string[] };
  past: Doc[];
  future: Doc[];
}
```

The reducer is a pure function: `(state, action) => state`. No React, no DOM, no
randomness. Positions are stored snapped to a 10px grid. History is
snapshot-based (`past` / `future` hold whole `Doc` objects, capped at 100) and
`SELECT` never creates a history entry.

### How the editor works

| Action                       | What happens                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Drag a node                  | It follows the pointer, snapped to the 10px grid; the edges follow it. Releasing commits one undo step.                             |
| Hover a node                 | Its four ports appear. Drag from a port to another node to connect. A ghost line follows the pointer and a valid target highlights. |
| Double-click a node          | Its label becomes editable. Enter confirms, Escape cancels.                                                                         |
| Enter on a selected node     | Starts editing the label.                                                                                                           |
| Delete / Backspace           | Deletes the selection. A node takes its edges with it.                                                                              |
| Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z | Undo and redo.                                                                                                                      |

The drag preview lives in component state, not in the reducer. The reducer is
only told the final position, once, on pointer up — that is what keeps one drag
equal to one undo step.

### Decisions worth stating

A few rules are not obvious from the code alone, so they are written down here.

- **History lives inside `src/core/reducer.ts`, not in its own `history.ts`.**
  The rules are four sentences and three branches. A separate file would
  re-export knowledge the reducer already has and make "what counts as a
  history entry" something you have to look in two places to answer.
- **`past` holds the document _before_ the change.** After editing `D0` into
  `D1`, `past` is `[D0]`, so undo returns to `D0`. Pushing the document after
  the change would make undo a no-op.
- **`IMPORT` pushes the old document onto `past`,** so an import can be undone
  like any other edit. The import is validated first: an invalid file changes
  nothing and shows an inline error.
- **A move that does not move the node is not a change,** so it costs no undo
  step. The same goes for a rejected edge (self-loop or duplicate): the state
  is returned unchanged, by reference, and no history entry is created.
- **The default id generator derives ids from the document** instead of
  keeping a counter. React's StrictMode calls a reducer twice in development,
  and a counter would burn two ids per change.
- **`clientToSvg` lives in `src/ui/pointer.ts`, not in `src/core/geometry.ts`.**
  It reads the SVG screen CTM, so it touches the DOM. A DOM-free `core/` is the
  stronger rule.

## Contributing

This project follows a written workflow:

- One logical change per commit, `type: short summary`.
- Tests before behaviour.
- `npm run lint && npm run typecheck && npm test` must pass before a commit.

## License

MIT

# flowboard
