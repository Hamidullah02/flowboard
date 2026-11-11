# Flowboard rules

- Stack: React, TypeScript strict, Vite, Vitest, Playwright. No React Flow or D3 in core.
- `src/core/` has no React or DOM imports. Pure functions only.
- DO NOT write code in `src/core/` or `tests/unit/`. Give hints, review my code, and explain errors.
- Allowed for you to write: config, boilerplate, CSS, README text, e2e scaffolding.
- Before any change: state the plan in 3 bullets. Tests first.
- Done means: `npm run lint && npm run typecheck && npm test` all pass.
- No new features outside docs/plan scope. Ask first.
- Commits: `type: short summary`, one logical change each.
- Skills: use /review before merge, /split-to-prs for large changes. Do not use animation skills unless I ask.
