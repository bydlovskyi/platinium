# Issue #11 — Test harness & quality gates

| | |
|---|---|
| **GitHub issue** | [#11](https://github.com/bydlovskyi/platinum/issues/11) |
| **Parent PRD** | [#8](https://github.com/bydlovskyi/platinum/issues/8) · [`PRD-008-testing-strategy-and-quality-gates.md`](../prd/PRD-008-testing-strategy-and-quality-gates.md) |
| **Type** | AFK |
| **Slice** | 1 of 41 |
| **Branch** | `feat/11-test-harness` |

## Parent PRD

#8 — [`docs/prd/PRD-008-testing-strategy-and-quality-gates.md`](../prd/PRD-008-testing-strategy-and-quality-gates.md)

## What to build

Stand up the test runner and the quality gates that every later slice depends on.
This is the harness half of PRD-008 and it deliberately runs first: every feature slice
lists tests in its acceptance criteria, so without a runner those tests get deferred and
written after the fact against code that was never shaped for them.

Vitest in jsdom with two named projects — `unit` (tests beside their subject) and
`integration` (a top-level directory organised by journey) — sharing the Vite config so
aliases, the Vue plugin and auto-imports behave identically in tests and in the app.
The MSW Node server and the test kit land here as stubs with the seams defined; they are
filled in by the mock slices. Husky hooks and a CI workflow run the same commands
locally and on every pull request.

A smoke test proves the harness works end to end.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `npm run test` runs both projects; `npm run test:unit` and `npm run test:integration` run each alone
- [ ] `npm run test:watch` re-runs on change; a single file and a single test name can be targeted
- [ ] `npm run test:coverage` produces a report; no numeric threshold gates the build
- [ ] Auto-imported globals (Vue, Router, Pinia, VueUse, project composables) resolve in test files without manual imports
- [ ] Path aliases resolve identically in tests and in the application
- [ ] Fake timers are available for date-dependent assertions
- [ ] Test kit exposes: mount-with-router-and-pinia, set-viewport-to-breakpoint, and seams for seed-session and reset-database
- [ ] Pre-commit hook lints staged files with autofix; pre-push hook runs type-check and the full suite
- [ ] Documented escape hatch for bypassing a hook in an emergency
- [ ] CI workflow runs install-from-lockfile, lint, type-check, test with coverage, and build on every push and pull request
- [ ] A smoke test asserting a trivial component mounts passes in both projects
- [ ] Suite completes in under 60 seconds on a cold run
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

None — foundation slice, branches off `main`.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/11-test-harness`

## User stories addressed

Referenced by number from the parent PRD:

- 1-9 (running tests, watch, coverage, targeting, speed)
- 14-15, 17-18 (kit helpers, globals, deterministic clock)
- 32-37 (hooks, CI, coverage visibility)
- 38-39 (documented strategy, naming and location conventions)
