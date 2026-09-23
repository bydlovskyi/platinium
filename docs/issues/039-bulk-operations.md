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

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

Give the row selection built in PRD-003 something to do. Until now the checkboxes
have been decorative.

A contextual bar — an `el-affix` holding an `el-tag` with the selected count, an
`el-dropdown` for status change, a danger `el-button` for delete and an `el-button link` to
clear — appears with rows selected in `AppDataTable`'s `el-table-column type="selection"`,
offering the operations that make sense for that entity. One shared composable owns
selection state, the confirmation, the request, the per-record result and the refresh;
entity screens declare which operations they support.

**Partial success is the expected case, not an edge case.** A bulk operation that reports
"done" when a third of it failed is worse than no bulk operation. The response carries
succeeded and failed identifiers with a reason each, and the UI reports both in an
`el-dialog` holding an `el-result` summary (success / warning / error) and an `el-table` of
failed records with their reasons — including records blocked by the dependency rules,
with their blocking counts. Confirmation is `ElMessageBox.confirm` via `useConfirm`, with
`beforeClose` setting `confirmButtonLoading` while the request runs; `el-progress` shows
multi-record progress.

**Selection is cleared whenever the query changes.** Acting on rows that have scrolled out
of the current filter is the most dangerous bug this feature could have. The composable
clears its keys and calls the table's `clearSelection()` so `el-table` matches;
`reserve-selection` stays off.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Contextual `el-affix` bar appears with rows selected, showing the count in an `el-tag` and the available operations
- [ ] Select-all visibly indicates it applies to the current page, not the whole dataset (the `el-tag` reads "on this page")
- [ ] Selection cleared when filters, search, sort or page change; `el-table` `clearSelection()` keeps the checkboxes in sync; `reserve-selection` off
- [ ] Selection can be cleared in one action (`el-button link`)
- [ ] Bulk status change (`el-dropdown`) and bulk delete (danger `el-button`) available for all three entities
- [ ] Bulk delete confirmed with the exact count through `ElMessageBox.confirm` via `useConfirm`
- [ ] Progress shown during the operation: `confirmButtonLoading` in `beforeClose`, and `el-progress` for multi-record progress
- [ ] Partial failure reported per record with a reason in an `el-dialog` with an `el-result` summary and an `el-table` of failures; dependency-blocked records report their blocking count
- [ ] Total success and total failure both reported clearly (`el-result` success / error)
- [ ] Built from `el-affix`, `el-tag`, `el-dropdown`, `el-button`, `ElMessageBox`, `el-progress`, `el-dialog`, `el-result`, `el-table`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] Every newly adopted Element Plus component's `theme-chalk` stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] List refreshes after the operation
- [ ] Operations hidden for a viewer per the capability composable
- [ ] One shared composable owns selection, confirmation, request, result and refresh; entity screens only declare supported operations
- [ ] Unit tests: selection lifecycle, clearing on query change, total success, total failure, partial success reporting
- [ ] Integration test: select rows via the `el-table` selection checkboxes, change status via the `el-dropdown`, assert the list updates; attempt a bulk delete including a referenced record, confirm in the `ElMessageBox`, and assert the partial-failure `el-dialog`
- [ ] Tests mount real Element Plus components (no stubs); teleported poppers queried in `document.body`
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
