# Issue #39 — Bulk operations

| | |
|---|---|
| **GitHub issue** | [#39](https://github.com/bydlovskyi/platinum/issues/39) |
| **Parent PRD** | [#7](https://github.com/bydlovskyi/platinum/issues/7) · [`PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) |
| **Type** | AFK |
| **Slice** | 29 of 41 |
| **Branch** | `feat/39-bulk-operations` |

```
Parent: #7
Parent branch: feat/38-dashboard
Branch: feat/39-bulk-operations
Blocked by: #38
```

## Parent PRD

#7 — [`docs/prd/PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md)

## What to build

Give the row selection built in PRD-003 something to do. Until now the checkboxes
have been decorative.

A contextual bar appears with rows selected, offering the operations that make sense for
that entity. One shared composable owns selection state, the confirmation, the request,
the per-record result and the refresh; entity screens declare which operations they
support.

**Partial success is the expected case, not an edge case.** A bulk operation that reports
"done" when a third of it failed is worse than no bulk operation. The response carries
succeeded and failed identifiers with a reason each, and the UI reports both — including
records blocked by the dependency rules, with their blocking counts.

**Selection is cleared whenever the query changes.** Acting on rows that have scrolled out
of the current filter is the most dangerous bug this feature could have.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Contextual bar appears with rows selected, showing the count and the available operations
- [ ] Select-all visibly indicates it applies to the current page, not the whole dataset
- [ ] Selection cleared when filters, search, sort or page change
- [ ] Selection can be cleared in one action
- [ ] Bulk status change and bulk delete available for all three entities
- [ ] Bulk delete confirmed with the exact count
- [ ] Progress shown during the operation
- [ ] Partial failure reported per record with a reason; dependency-blocked records report their blocking count
- [ ] Total success and total failure both reported clearly
- [ ] List refreshes after the operation
- [ ] Operations hidden for a viewer per the capability composable
- [ ] One shared composable owns selection, confirmation, request, result and refresh; entity screens only declare supported operations
- [ ] Unit tests: selection lifecycle, clearing on query change, total success, total failure, partial success reporting
- [ ] Integration test: select rows, change status, assert the list updates; attempt a bulk delete including a referenced record and assert the partial-failure report
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #38 — *Dashboard screen*

This slice's branch is created off `feat/38-dashboard` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/39-bulk-operations`

## User stories addressed

Referenced by number from the parent PRD:

- 16-27 (selection, bar, scoping, bulk operations, progress, per-record results)
