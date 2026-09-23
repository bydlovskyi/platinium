# Issue #15 — MSW mock backend — browser worker, node server, handler factory, chaos controls

| | |
|---|---|
| **GitHub issue** | [#15](https://github.com/bydlovskyi/platinum/issues/15) |
| **Parent PRD** | [#1](https://github.com/bydlovskyi/platinum/issues/1) · [`PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md) |
| **Type** | AFK |
| **Slice** | 5 of 41 |
| **Branch** | `feat/15-msw-mock-backend` |

```
Parent: #1
Parent branch: feat/14-mock-database
Branch: feat/15-msw-mock-backend
Blocked by: #14
```

## Parent PRD

#1 — [`docs/prd/PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md)

## What to build

Turn the mock database into a backend that answers over the network.

MSW intercepts below axios, so application code is written exactly as it would be
against a real API — no branching, no injected fakes, nothing to remove later. The same
handler modules serve the browser during development and the Node server during
integration tests, which is what makes those tests exercise the real service layer.

The handler factory is the piece that keeps this from becoming a pile of copy-pasted
route code: given a collection name and its searchable, filterable and sortable field
declarations, it produces the standard five REST handlers. Entity slices supply a
declaration, not five hand-written handlers.

Chaos controls — inject latency, force a status on the next request, make a path fail
persistently — are what make the error-path stories in every later PRD demonstrable
rather than theoretical.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Browser service worker registered in development only, never in a production build
- [ ] Node server built from the same handler modules, started once per suite
- [ ] Unhandled requests fail loudly: the test fails, the browser logs a clear warning
- [ ] Handler factory produces list, create, read, update and delete handlers from a field declaration
- [ ] List handlers implement search, filtering, sorting and pagination server-side and return the shared envelope
- [ ] Handlers return realistic errors: 400 with per-field messages, 401, 404, 409, 500
- [ ] `GET /health` served and returning 200
- [ ] Chaos controls: configurable latency, force a status code on the next request to a path, make a path fail persistently
- [ ] Chaos controls exposed programmatically to tests and through a debug surface in the browser (`window.__mockChaos`, development only — a console API, so no hand-built UI)
- [ ] Mock database reset and re-seed exposed to the test kit
- [ ] Realistic default latency in development so loading states are visible
- [ ] Integration test proves the full query vocabulary works end to end through the service layer for one entity
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #14 — *Mock database — query engine and seed fixtures*

This slice's branch is created off `feat/14-mock-database` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/15-msw-mock-backend`

## User stories addressed

Referenced by number from the parent PRD:

- 5-6 (network-layer interception, same handlers in tests)
- 12 (simulated latency)
- 19 (forced failure modes)
