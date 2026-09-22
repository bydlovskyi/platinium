# Issue #14 — Mock database — query engine and seed fixtures

| | |
|---|---|
| **GitHub issue** | [#14](https://github.com/bydlovskyi/platinum/issues/14) |
| **Parent PRD** | [#1](https://github.com/bydlovskyi/platinum/issues/1) · [`PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md) |
| **Type** | AFK |
| **Slice** | 4 of 41 |
| **Branch** | `feat/14-mock-database` |

```
Parent: #1
Parent branch: feat/13-api-contract-foundation
Branch: feat/14-mock-database
Blocked by: #13
```

## Parent PRD

#1 — [`docs/prd/PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md)

## What to build

The deep module the entire mock backend stands on, and the single most valuable
thing in PRD-001 to test in isolation.

An in-memory store exposing a narrow typed collection interface — list with query
options, get by id, insert, update, remove. All query semantics live here: text search
across declared fields, equality and range filters, stable sorting with a deterministic
tiebreaker, and offset pagination. Every entity handler reuses it, so filtering
behaviour cannot diverge between entities.

It is pure and synchronous: no MSW, no Vue, no network. Alongside it, deterministic
seed fixtures producing enough data for pagination and filtering to mean something, and
a versioned `localStorage` adapter that discards rather than migrates on a version
mismatch.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Collection interface: list with query options, get by id, insert, update, remove — all typed
- [ ] Text search across a declared set of searchable fields per collection
- [ ] Equality filters and range filters supported generically
- [ ] Sorting is stable: equal sort values hold a deterministic order across pages
- [ ] Offset pagination returns the page plus total count and total page count
- [ ] Seed fixtures produce several dozen events across multiple countries and statuses, a handful of categories, and several hundred tickets spread across events, categories, statuses and currencies
- [ ] Seeding is deterministic: the same dataset on every run
- [ ] Every seeded ticket references a real event and a real category
- [ ] Persistence adapter hydrates from and flushes to `localStorage` under a versioned key
- [ ] A version mismatch discards stored data and re-seeds rather than attempting a migration
- [ ] Persistence is disabled under test so suites start from a deterministic seed
- [ ] Unit tests cover search, each filter type, sort stability, and pagination boundaries including the first page, the last page and an out-of-range page
- [ ] Unit tests assert fixture determinism and referential integrity
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #13 — *API contract foundation — local OpenAPI spec, offline generation, type helpers*

This slice's branch is created off `feat/13-api-contract-foundation` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/14-mock-database`

## User stories addressed

Referenced by number from the parent PRD:

- 7-9 (server-side query semantics, reset to known state, data spanning pages)
- 10-11 (survives reload, resettable)
