# Issue #13 — API contract foundation — local OpenAPI spec, offline generation, type helpers

| | |
|---|---|
| **GitHub issue** | [#13](https://github.com/bydlovskyi/platinum/issues/13) |
| **Parent PRD** | [#1](https://github.com/bydlovskyi/platinum/issues/1) · [`PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md) |
| **Type** | AFK |
| **Slice** | 3 of 41 |
| **Branch** | `feat/13-api-contract-foundation` |

```
Parent: #1
Parent branch: feat/12-design-system-foundation
Branch: feat/13-api-contract-foundation
Blocked by: #12
```

## Parent PRD

#1 — [`docs/prd/PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md)

## What to build

Replace the remote third-party schema with a contract this repository owns.

A hand-written OpenAPI 3.1 document becomes the single source of truth for the whole API
surface. Types are generated from that local file, so generation is offline,
deterministic and reviewable in a diff. The `postinstall` script that downloads a schema
from `fakerestapi.azurewebsites.net` is removed — it makes the build non-reproducible
and hands control of our type definitions to a third party.

This slice introduces only the shared vocabulary every later contract slice builds on,
plus a trivial `/health` endpoint that proves generation and typing work end to end.
The existing generated-type helpers assume a versioned content key inherited from the
third-party schema; they are corrected here to match this document.

**This is the only slice in PRD-001 that may edit `openapi.yaml` or commit a regenerated
`schema.ts`.**

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `src/mocks/openapi.yaml` exists as an OpenAPI 3.1 document and is valid
- [ ] `npm run openapi-generate` reads the local file and writes `src/features/platform/api/schema.ts` with no network access
- [ ] The remote-fetching `postinstall` script is removed
- [ ] Shared components defined: `PaginationMeta`, `ErrorResponse`, `ValidationError`
- [ ] Reusable query parameters defined: `search`, `sort`, `order`, `page`, `perPage`
- [ ] Reusable responses defined: `BadRequest` 400, `Unauthorized` 401, `NotFound` 404, `Conflict` 409, `InternalError` 500
- [ ] Enum components defined: `EventStatus`, `TicketStatus`, `Currency`, `SortOrder`
- [ ] `GET /health` declared and typed
- [ ] Type helpers corrected: response content key is `application/json`; path and query parameter helpers match this document
- [ ] Domain aliases exported from the api dts barrel so feature code never imports a raw generated path type
- [ ] `npm run type-check` passes against the regenerated schema
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #12 — *Design system foundation — tokens, typography, dark palette, motion*

This slice's branch is created off `feat/12-design-system-foundation` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/13-api-contract-foundation`

## User stories addressed

Referenced by number from the parent PRD:

- 1-4 (contract in-repo, offline generation, generated not hand-written, short aliases)
