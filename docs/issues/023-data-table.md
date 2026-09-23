# Issue #23 — Data table — descriptor-driven, responsive, async states

| | |
|---|---|
| **GitHub issue** | [#23](https://github.com/bydlovskyi/platinum/issues/23) |
| **Parent PRD** | [#3](https://github.com/bydlovskyi/platinum/issues/3) · [`PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md) |
| **Type** | AFK |
| **Slice** | 13 of 41 |
| **Branch** | `feat/23-data-table` |

```
Parent: #3
Parent branch: feat/22-list-resource-composable
Branch: feat/23-data-table
Blocked by: #22
```

## Parent PRD

#3 — [`docs/prd/PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

One table component for the whole portal, configured by column descriptors rather
than written three times. `AppDataTable` wraps Element Plus `el-table` and configures it;
it does not re-implement it.

A descriptor carries a field key, a label, a sortable flag, an optional cell renderer, an
alignment and a responsive priority, and maps to one `el-table-column` (`prop`, `label`,
`align`, `min-width`, `sortable`), with the cell renderer forwarded through the column's
`#default="{ row }"` slot. Sorting is `sortable="custom"` + `@sort-change`, with the native
three-state `sort-orders` and the `aria-sort` `el-table` sets itself; `:default-sort` and
the table ref's `sort()` / `clearSort()` mirror the URL, which stays the source of truth.
Selection is an `el-table-column type="selection"` with `row-key`; row actions are an
`el-dropdown` per row. First load is the same `el-table` fed placeholder rows of
`el-skeleton-item`, a refetch is `v-loading` on the table, empty states render `el-empty`
and a failed load renders `el-result` — both in place of the table, so the mobile cards
share them.
It emits intent — sort requested, page requested, row action invoked, selection changed
— and holds no fetching logic and no knowledge of any entity.

The responsive answer is a presentation switch, not a media query on a table. Above the
tablet breakpoint the descriptors render as an `el-table`; below it, the same descriptors
render as stacked `el-card` cards showing only high-priority columns. Because this lives
in one component, every entity screen is responsive the moment it is written.

Selection is page-scoped, and the UI must say so — a select-all that blurs page and
dataset is how an administrator bulk-deletes far more than they intended once PRD-007
lands. `reserve-selection` stays off so selection never survives a page change.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Built from `el-table`, `el-table-column`, `el-dropdown`, `el-skeleton`, `v-loading`, `el-empty`, `el-result`, `el-card`, `el-checkbox` and `el-button`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] Rendering driven entirely by column descriptors, each mapped to an `el-table-column` (`prop`, `label`, `align`, `min-width`, `sortable`) with custom cells through `#default="{ row }"`; no entity knowledge in the component
- [ ] Sortable columns use `sortable="custom"`; `@sort-change` emits `sort-requested` and the table never sorts rows client-side
- [ ] Sort cycles through ascending, descending and unsorted on repeated header activation via the native `sort-orders` `['ascending', 'descending', null]`
- [ ] Sorted column marked with its direction; `aria-sort` on the header cell (set by `el-table`) announces the sort state to assistive technology
- [ ] Sort state mirrors the URL: `:default-sort` on mount, table ref `sort(prop, order)` / `clearSort()` when the URL changes externally
- [ ] `el-table` presentation above the tablet breakpoint; stacked `el-card shadow="never"` presentation below, using the same descriptors and showing only high-priority columns
- [ ] First load is the real `el-table` rendering placeholder rows of `el-skeleton-item`, so it matches the table shape including column widths — no layout shift when content arrives
- [ ] Refetch with rows on screen uses `v-loading` on `el-table`; previous rows stay visible and dimmed
- [ ] Three distinct empty states: nothing exists yet (`el-empty`, create `el-button`), nothing matched the filters (`el-empty`, clear-filters `el-button`), and load failed (`el-result` with a retry `el-button`)
- [ ] Row actions per row in an `el-dropdown` with an `el-button text circle` trigger carrying an `aria-label`, `el-dropdown-item`s and `divided` before a destructive action; the same menu on mobile cards
- [ ] Row selection through `el-table-column type="selection"` with `row-key` and `@selection-change`, `reserve-selection` off; parent-driven resets call `clearSelection()` / `toggleRowSelection()` so the table matches `selectedRowKeys`
- [ ] Select-all header checkbox visibly indicates it applies to the current page only; mobile cards select through `el-checkbox`
- [ ] Every toolbar and table control reachable by keyboard in a sensible order
- [ ] Interactive rows have hover feedback and a visible focus ring, themed through `--el-*` variables rather than `.el-table` selector overrides
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet (`el-table`, `el-table-column`, `el-checkbox`, `el-dropdown`, `el-skeleton`, `el-loading`, `el-empty`, `el-result`, `el-card`, …) imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Component tests mount real Element Plus (no stubs): descriptor-driven rendering, three-state sort cycling via header clicks, `aria-sort`, URL-driven `sort()` / `clearSort()`, each async state, selection via the real checkbox `<input>` including `clearSelection()` sync, row actions queried in the teleported `el-dropdown` popper in `document.body`, and the presentation switch at the tablet breakpoint
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #22 — *List resource composable — fetching, abort, error recovery*

This slice's branch is created off `feat/22-list-resource-composable` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/23-data-table`

## User stories addressed

Referenced by number from the parent PRD:

- 9-12 (sorting, cycling, marking, stability)
- 20-26 (async states, row actions)
- 29-34 (mobile cards, selection semantics, keyboard, screen reader)
