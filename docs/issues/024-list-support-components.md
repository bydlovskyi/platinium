# Issue #24 — List toolbar, pagination, confirmation, status tag, formatters

| | |
|---|---|
| **GitHub issue** | [#24](https://github.com/bydlovskyi/platinum/issues/24) |
| **Parent PRD** | [#3](https://github.com/bydlovskyi/platinum/issues/3) · [`PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md) |
| **Type** | AFK |
| **Slice** | 14 of 41 |
| **Branch** | `feat/24-list-support-components` |

```
Parent: #3
Parent branch: feat/23-data-table
Branch: feat/24-list-support-components
Blocked by: #23
```

## Parent PRD

#3 — [`docs/prd/PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The supporting pieces that complete the list experience, each shared so that
behaviour cannot diverge between entities.

The toolbar (`ListToolbar`) holds search (`el-input clearable`), filter controls
(`el-select`, `el-date-picker type="daterange"`), active-filter chips (`el-tag closable`),
a clear-all `el-button link` and a slot for page actions, collapsing into an `el-drawer`
behind an `el-button` + `el-badge` below the tablet breakpoint. Pagination is
`el-pagination` rendering the shared envelope directly.

The confirmation composable (`useConfirm`) is one call over `ElMessageBox.confirm` used by
every delete in the portal: it names the specific record, handles the confirm button's
in-flight state through `beforeClose` and `confirmButtonLoading`, and returns a resolved
intent. A generic "are you sure?" is how an administrator deletes the wrong row.

The status tag (`StatusTag`, wrapping `el-tag`) maps a status enum to a consistent
`type`, `effect` and label portal-wide, using the mapping defined in the design
foundation — a draft event and a draft ticket must look the same. Formatters extend the existing filters module with locale-aware dates and money
that takes minor units and a currency code, matching the integer-minor-units decision.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Built from `el-input`, `el-select` / `el-option`, `el-date-picker`, `el-tag`, `el-button`, `el-drawer`, `el-badge`, `el-pagination` and `ElMessageBox`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] Toolbar: search is an `el-input clearable` with a search icon in `#prefix` (debounce stays in the list query composable); filter controls are `el-select` (`clearable`, `filterable`) and `el-date-picker type="daterange"`; active-filter chips are `el-tag closable`, each individually removable via `@close`; clear-all is an `el-button link`; slot for page actions
- [ ] Below the tablet breakpoint the filters collapse into an `el-drawer`, opened by an `el-button` inside an `el-badge` showing the active-filter count
- [ ] Pagination is `el-pagination` with `layout="total, sizes, prev, pager, next"` and `background`, `small` with a lower `pager-count` below tablet, rendering the shared `PaginationMeta` envelope with total count visible and the `sizes` page-size selector
- [ ] `useConfirm` wraps `ElMessageBox.confirm`, names the record, and in `beforeClose` sets `instance.confirmButtonLoading = true` while the request is in flight (progress shown, second submit blocked), then resolves to a clear intent
- [ ] `StatusTag` wraps `el-tag`, mapping every event and ticket status to the `type` / `effect` and label defined in the design foundation; identical statuses look identical across entities
- [ ] Status tag is distinguishable in greyscale — always a text label, never colour alone
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet (`el-input`, `el-select`, `el-option`, `el-date-picker`, `el-tag`, `el-drawer`, `el-badge`, `el-pagination`, `el-message-box`, …) imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Component tests mount real Element Plus (no stubs) and query teleported poppers (`el-select` dropdown, date picker, message box) in `document.body`
- [ ] Date formatter is locale-aware; a date range renders as one readable string
- [ ] Money formatter takes minor units plus a currency code and renders with the correct symbol and grouping
- [ ] Unit tests for formatters including zero, a large value and each supported currency
- [ ] Unit tests for the confirmation composable covering confirm and cancel paths against the real `ElMessageBox`, including `confirmButtonLoading` while in flight
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #23 — *Data table — descriptor-driven, responsive, async states*

This slice's branch is created off `feat/23-data-table` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/24-list-support-components`

## User stories addressed

Referenced by number from the parent PRD:

- 3, 7-8 (clear search, filter chips, clear all)
- 13-15 (pagination, page size, persistence)
- 27-28 (named confirmation, in-flight confirm button)
- 30 (mobile filter drawer)
- 36-37 from PRD-004 (status badge, readable dates)
