# Issue #22 — List resource composable — fetching, abort, error recovery

| | |
|---|---|
| **GitHub issue** | [#22](https://github.com/bydlovskyi/platinum/issues/22) |
| **Parent PRD** | [#3](https://github.com/bydlovskyi/platinum/issues/3) · [`PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md) |
| **Type** | AFK |
| **Slice** | 12 of 41 |
| **Branch** | `feat/22-list-resource-composable` |

```
Parent: #3
Parent branch: feat/21-list-query-composable
Branch: feat/22-list-resource-composable
Blocked by: #21
```

## Parent PRD

#3 — [`docs/prd/PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md)

## What to build

Binds the list query to a service call so entity screens write almost no fetching
logic.

Watches the query, fetches, and exposes data, pagination metadata, loading state, error
state and a refetch. Uses the existing abort-controller composable so a superseded
request cannot overwrite a newer result — a real defect on a fast-typing administrator,
not a theoretical one.

Previous results stay visible and dimmed while a new page loads rather than being
cleared, so the screen never flashes empty between pages. No UI in this slice: the
composable keeps the previous data and exposes loading; the dimming itself is
`v-loading` on `el-table` in `AppDataTable` (#23).

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Refetches when any part of the query changes
- [ ] Exposes data, pagination metadata, loading state, error state and a refetch
- [ ] A superseded request is aborted; a late response cannot overwrite a newer result
- [ ] Aborted requests produce no error state and no notification
- [ ] Previous results remain visible and dimmed while a new page loads
- [ ] Error state is recoverable via refetch without a page reload
- [ ] Unit tests: refetch on query change, abort of a superseded request, error state and recovery via retry
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #21 — *List query composable — URL-driven list state*

This slice's branch is created off `feat/21-list-query-composable` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/22-list-resource-composable`

## User stories addressed

Referenced by number from the parent PRD:

- 20-21 (skeleton, dimmed previous results)
- 24 (failed load with retry)
