# : Full Build Plan and Studies

Plan for Hamid: a React + TypeScript SVG flowchart editor, built as proof of skill for frontend task-writing work.

## 1. Reality check

- 100% success is not possible. You do not control the hiring decision. Do not plan around it.
- You control 3 things: repo quality, the proof it shows, and how well you can explain it.
- This plan makes the repo as strong as one 2-week project can be.
- Success is measured by the checks in section 3, not by getting the job.

## 2. Goal

- Main goal: a public repo that proves React + TypeScript + SVG skill, with objective tests and written tasks.
- Second goal: reusable proof for freelance work, internships, and the profile review.
- Not a goal: a product to sell. draw.io, Excalidraw and React Flow already exist.

## 3. Success criteria (all must be true)

- Live demo on Vercel. It opens with the fixture flowchart already loaded.
- CI is green on GitHub Actions: lint, typecheck, unit tests, e2e tests.
- TypeScript strict mode on. Zero `any` in `src/core/`.
- Core coverage 90%+ lines. 25+ unit tests. 3 e2e tests.
- All 12 acceptance tests in section 10 pass.
- README has a GIF, an architecture diagram, and setup in 3 commands.
- 40+ meaningful commits over 10+ days.
- 2 task packages in `tasks/` (section 12).
- You can explain every file in `src/core/` without notes.

## 4. Feasibility study

### Technical

- The stack is common and well documented. Risk: low.
- No backend, no database, no login. This removes most risk.
- Hard parts: SVG pointer math, undo with dragging, edge routing. All have known patterns (section 9).

### Skills

- Needed: React hooks, TS discriminated unions, reducer pattern, SVG basics, Vitest, Playwright.
- Likely gaps: strict TS, Playwright, SVG coordinate transforms. Budget 1 day of learning for each.
- Transfers from your work: state management from Flutter, geometry math from the three.js steering model.

### Time

- Estimate: 60-70 hours. That is 14 calendar days at 4-5 hours per day, including 4 buffer days.
- Leave extra buffer for exams and lab deadlines.
- Cut list if late, in this order: SVG export, elbow routing, e2e count from 3 to 2, keyboard nudging.
- Never cut: reducer tests, README, live demo, `tasks/` folder.

### Cost

- Cash: 0. GitHub, Vercel free tier, Vitest and Playwright are free.
- Hardware: any laptop that runs Node 20+.

### Verdict

- Feasible. Effort is medium and technical risk is low.
- The real risks are schedule slip and scope creep, not skill.

## 5. Business study

- Purpose: a portfolio asset. Think ROI, not revenue.
- Investment: about 65 hours and no cash.
- Possible returns:
  - Eligibility for frontend task-writing roles. The posted pay is $640-800 per approved task. For you it is unproven, and task volume is not guaranteed.
  - Small freelance jobs in React and SVG.
  - Proof for internships and your CV.
- Honest odds: unknown. Profile review also looks at history length. A 2-week repo helps but is not the same as years of work.
- Opportunity cost: 65 hours taken from coursework, thesis work, and Flutter freelance work.
- Break-even: one approved task (about $640) covers the time if you value your hours at about $10 each.
- Market: generic React freelancing is crowded. Your niche is interactive graphics (SVG, Canvas, three.js). Position yourself as a frontend engineer for interactive graphics.
- Monetization now: none. Do not build features for imaginary customers.

### Decision gates

- Gate 1, end of Day 4: core logic and tests done? If not, cut scope or stop.
- Gate 2, end of Day 8: usable editor from start to finish? If not, drop stretch items.
- Gate 3, end of Day 14: all section 3 checks pass? If yes, pin the repo and apply. If not, extend by 4 days at most, then ship what you have.

## 6. Scope

### In (MVP)

- 3 node types: rectangle, diamond, terminal (rounded).
- Drag nodes with snap to a 10px grid.
- Connect nodes by dragging from a port to another node.
- Edit labels, select, delete (deleting a node also deletes its edges).
- Undo and redo.
- Import and export JSON.
- A reference fixture: a screenshot plus the JSON that reproduces it.

### Stretch (only after Gate 2)

- SVG export.
- Elbow edge routing.
- Keyboard nudging.

### Out (do not build)

- Zoom, pan, multi-select, themes, collaboration, accounts, cloud save.

## 7. UX design

### Users

- Reviewer: an engineer or recruiter who spends 2 minutes on your demo.
- Editor user: someone drawing a flowchart.

### Reviewer journey (design for this first)

- Open demo. A flowchart is already loaded.
- Drag a node. It snaps. Edges follow.
- Press undo. It restores.
- Click the README link. See the tests and the architecture.

### Core flows

- Add node: click a toolbar button. The node appears at the canvas center, snapped, and selected.
- Move: drag the node. Edges follow live. Release commits one history entry.
- Connect: hover a node to show 4 ports. Drag from a port. A ghost line follows the pointer. Valid targets highlight. Release on a node creates the edge. Release on empty space cancels.
- Edit label: double-click or press Enter on a selected node. Enter confirms, Escape cancels.
- Delete: press Delete or Backspace, or use the toolbar button.
- Undo and redo: toolbar buttons and shortcuts.
- Import and export: toolbar buttons.

### Interaction states

| State        | Enter when                | Exit when               |
| ------------ | ------------------------- | ----------------------- |
| idle         | default                   | any pointer down        |
| draggingNode | pointer down on node body | pointer up or Escape    |
| connecting   | pointer down on a port    | pointer up or Escape    |
| editingLabel | double-click or Enter     | Enter or Escape or blur |

### Keyboard map

- Delete / Backspace: delete selection.
- Ctrl/Cmd+Z: undo. Ctrl/Cmd+Shift+Z or Ctrl+Y: redo.
- Arrow keys: nudge selected node by 10px (stretch).
- Tab: move focus between nodes.
- Enter: edit label. Escape: cancel the current action.

### Empty and error states

- Empty canvas shows a hint: Add a node to start.
- Invalid import shows an inline error message. The current document is untouched. No crash.
- Invalid connection (self-loop, duplicate edge) is ignored with a brief visual shake, no error dialog.

### Accessibility

- Visible focus ring on every focusable node.
- Each node has an `aria-label` with kind and label text.
- Text contrast 4.5:1 or better.
- Selection is not shown by color alone (also thicker outline).
- Respect `prefers-reduced-motion`.

### Responsive

- Desktop first. On mobile, viewing and dragging must work. Toolbar moves to the bottom.

## 8. UI design

### Layout

```
+--------------------------------------------------+
| Flowboard   [Rect][Diamond][Terminal] | Undo Redo | Import Export |
+--------------------------------------------------+
|                                                  |
|            SVG canvas (dot grid, 10px)           |
|                                                  |
+--------------------------------------------------+
| status: 8 nodes, 9 edges | selection: 1 node     |
+--------------------------------------------------+
```

### Design tokens (CSS variables)

- Spacing scale: 4, 8, 12, 16, 24 px.
- Font: system UI stack. Sizes 12, 14, 16.
- Colors: background, surface, border, text, accent, danger. Define light and dark sets. Dark set under `prefers-color-scheme`.
- Radius: 6px for UI, 12px for terminal nodes.
- Stroke: 2px for nodes and edges, 3px accent outline when selected.

### Node visuals

- Rectangle: 120 x 60.
- Diamond: 120 x 80 bounding box.
- Terminal: 120 x 48, fully rounded ends.
- Label centered, max 2 lines, truncated with an ellipsis.
- Ports: 8px circles at the 4 side midpoints, visible on hover or while connecting.

### Edge visuals

- 2px stroke, arrowhead marker at the target.
- Selected edge: accent color and 3px stroke.

### Components

- `Toolbar`, `Canvas`, `NodeView`, `EdgeView`, `PortHandle`, `LabelEditor`, `StatusBar`, `ErrorBanner`.

## 9. Logic design

### 9.1 Data model

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

- `x, y` is the top-left corner. All stored positions are multiples of 10.
- IDs come from a counter or an injected id generator, so tests are deterministic.

### 9.2 Actions (discriminated union)

- `ADD_NODE`, `MOVE_NODE`, `RENAME_NODE`, `ADD_EDGE`, `DELETE_SELECTION`, `SELECT`, `IMPORT`, `UNDO`, `REDO`.
- The reducer is a pure function: `(state, action) => state`. No React, no DOM, no randomness inside.

### 9.3 Invariants (test every one)

- Node IDs are unique.
- Every edge points to nodes that exist.
- No self-loops. No duplicate edges (same from and to).
- Stored positions are snapped to the grid.
- Deleting a node removes all edges that touch it.
- Undo then redo returns a deep-equal state.

### 9.4 Geometry (`geometry.ts`)

- `snap(v) = Math.round(v / 10) * 10`.
- `portPosition(node, side)`: midpoint of the chosen side of the bounding box.
- `edgePath(from, to)`: v1 is a straight line between the two port positions.
- `hitTestNode(point, nodes)`: top-most node whose box contains the point.
- `nearestPort(node, point)`: side with the smallest distance to the point.
- `clientToSvg(evt, svg)`: use `svg.getScreenCTM().inverse()` to convert pointer coordinates. Never use raw `clientX` as SVG units.

### 9.5 History

- Snapshot history: `past` and `future` hold whole `Doc` objects. The doc is immutable, so structural sharing keeps memory small.
- Cap `past` at 100 entries.
- Any new action (except SELECT) clears `future`.
- SELECT does not create history.

### 9.6 Drag handling

- During a drag, keep the preview position in local component state (or a ref). Do not dispatch on every pointer move.
- On pointer up, dispatch one `MOVE_NODE` with the snapped final position. This makes one drag equal one undo step.
- Use `setPointerCapture` so the drag survives leaving the node.
- Escape during a drag cancels with no history entry.

### 9.7 Serialization

- Export: `JSON.stringify(doc, null, 2)` with a `version` field.
- Import: validate shape and invariants first (hand-written validator or Zod). Reject on any failure and return a readable error. Never partially apply an import.

### 9.8 Edge routing

- v1: straight lines. Deterministic and easy to test.
- v2 (stretch): elbow routing with at most 3 segments, chosen by the port sides. Pure function, tested with a table of cases.

## 10. Test plan

### Layers

- Unit (Vitest): reducer, geometry, history, serialize. Target 90%+ line coverage in `src/core/`.
- Component (Vitest + Testing Library): toolbar buttons, label editor, error banner.
- e2e (Playwright): 3 tests on the real demo build.
- Fixture test: load `fixtures/login-flow.json` and compare to expected counts and positions.

### Acceptance tests (write these before the code)

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

### Quality tooling

- ESLint, Prettier, `tsc --noEmit`.
- GitHub Actions on every push: lint, typecheck, unit, e2e.
- Coverage report in CI. Fail below 90% for `src/core/`.

## 11. Architecture and structure

```
flowboard/
  src/
    core/            # no React, no DOM
      types.ts
      reducer.ts
      geometry.ts
      history.ts
      serialize.ts
    ui/
      App.tsx
      Canvas.tsx
      NodeView.tsx
      EdgeView.tsx
      Toolbar.tsx
      hooks/usePointerDrag.ts
    styles/tokens.css
  fixtures/
    login-flow.png
    login-flow.json
  tests/
    unit/  e2e/
  tasks/
    task-01-edge-above-source/
    task-02-undo-drag-bug/
  README.md
```

- Rule: `core/` never imports from `ui/`. This keeps core testable and shows clean design.
- Do not use React Flow or D3 for the core. The point is to show your own code.

## 12. The `tasks/` folder (your real edge for this role)

Each task package contains:

- `problem.md`: the task as a contributor would receive it.
- `screenshot.png` (or a short recording) showing the bug or the target behavior.
- `starting-commit.txt`: the repo commit the task starts from.
- `success-criteria.md`: objective pass/fail checks.
- `tests/`: the tests that prove it.
- `reference-solution` branch or patch.

Task ideas:

- Task 1: edges look wrong when the target is above the source. Fix the path. Pass if the 4 geometry tests pass.
- Task 2: one drag creates many undo steps. Fix it. Pass if acceptance test 11 passes.

Rules for a good task:

- Hard for AI to solve in one shot, but clear to a human.
- The success criteria are tests, not opinions.
- Run the tests against the starting commit (must fail) and the reference solution (must pass).
- If a task is ambiguous or you cannot grade it, rewrite or drop it.

## 13. Day-by-day plan

| Day | Work                                                                                                                     | Done when                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | Vite + React + TS strict, ESLint, Prettier, Vitest, CI skeleton. Write `types.ts` and acceptance tests as failing tests. | CI runs and tests fail for the right reason |
| 2   | `geometry.ts` and `history.ts` with tests                                                                                | geometry and history tests pass             |
| 3   | `reducer.ts`, all invariants                                                                                             | tests 1-4, 8, 9 pass                        |
| 4   | `serialize.ts` and validator. Gate 1 check.                                                                              | tests 5, 7, 10 pass                         |
| 5   | `Canvas`, `NodeView`, render fixture                                                                                     | demo shows the fixture flowchart            |
| 6   | Drag with snap, `usePointerDrag`, one history entry per drag                                                             | test 11 passes                              |
| 7   | Ports, connect flow, `EdgeView`, select, delete                                                                          | connect and delete work in the browser      |
| 8   | Label editor, toolbar, undo/redo buttons, shortcuts. Gate 2 check.                                                       | editor usable end to end                    |
| 9   | Playwright e2e (3 tests), accessibility pass                                                                             | test 12 passes                              |
| 10  | Deploy to Vercel, mobile pass, dark mode                                                                                 | live demo works on a phone                  |
| 11  | README with GIF and architecture diagram                                                                                 | a stranger can run it in 3 commands         |
| 12  | `tasks/` folder: 2 task packages with verified failing and passing runs                                                  | both tasks validated                        |
| 13  | Buffer, stretch (SVG export or elbow routing), polish                                                                    | optional                                    |
| 14  | Final checklist, pin repo, update profile README. Gate 3 check.                                                          | all section 3 items true                    |

## 14. Git strategy and AI policy

### Git

- Work on a branch per feature. Merge with a short PR description (even alone). This shows process.
- Commit messages: `type: short summary` (for example `feat: snap node to grid`, `test: add undo redo cases`).
- Commit every working step. Never one large dump.
- Do not fake dates or history.

### AI use

- Good uses: boilerplate, config files, debugging, test case ideas, README polish.
- Write yourself: `reducer.ts`, `geometry.ts`, `history.ts`, and the task success criteria.
- After any AI-written code, explain it back in your own words before you commit it.
- Test your understanding: close the AI tab and re-derive one function from scratch each day.

## 15. Risk register

| Risk                                    | Chance | Impact | Fix                                                                       |
| --------------------------------------- | ------ | ------ | ------------------------------------------------------------------------- |
| Scope creep                             | High   | High   | Section 6 is the contract. Stretch only after Gate 2.                     |
| Pointer math bugs (SVG coordinates)     | Medium | Medium | Use `getScreenCTM`, test geometry as pure functions.                      |
| Drag creates many undo steps            | Medium | Medium | Local preview state, one dispatch on pointer up.                          |
| TypeScript strict errors slow you down  | Medium | Low    | Learn discriminated unions on Day 1. Avoid `any`.                         |
| Playwright setup problems               | Medium | Low    | Start with one smoke test on Day 9.                                       |
| Exams or lab deadlines eat the schedule | High   | Medium | 4 buffer days, cut list in section 4.                                     |
| You cannot explain your own code        | Medium | High   | Daily re-derive exercise. Write core files by hand.                       |
| Weak README or no demo                  | Low    | High   | Days 10-11 are protected time.                                            |
| Profile review still rejects you        | Medium | Medium | The repo still helps freelance and CV. Do not depend on this one outcome. |

## 16. Pre-publish checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e` all pass locally and in CI.
- [ ] Live demo opens with the fixture loaded.
- [ ] README has a GIF, architecture diagram, scripts list, and test instructions.
- [ ] No secrets, no `test.html` style leftovers, no dead code.
- [ ] 40+ commits with clear messages.
- [ ] Both task packages verified: fail at start, pass with the reference solution.
- [ ] Repo pinned. Profile README headline updated to Frontend / Graphics Engineer (React, TypeScript, SVG, three.js).
- [ ] Flutter tutorial repos unpinned.

## 17. Next step

- Day 1 now: create the repo, set up Vite + TS strict + Vitest + CI, and commit `types.ts` with the 12 acceptance tests as failing tests.
- Ask me for the starter code for `types.ts`, the reducer, and the first test file when you are ready. Write the reducer yourself first, then compare.
