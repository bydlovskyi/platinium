# Issue #34 — Tickets list — cross-entity filters, deep-link entry, deletion

| | |
|---|---|
| **GitHub issue** | [#34](https://github.com/bydlovskyi/platinum/issues/34) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 24 of 41 |
| **Branch** | `feat/34-tickets-list` |

```
Parent: #6
Parent branch: feat/33-remote-select
Branch: feat/34-tickets-list
Blocked by: #33
```

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The list that answers the question administrators actually ask: not "show me
tickets" but "show me the VIP tickets for the Berlin show that are still on sale".

That is a filter spanning two foreign keys and a status, computed server-side against a
dataset the client never fully holds. Event and category filters use the remote select
from the previous slice.

This is also where the deep links from PRD-004 and PRD-005 land. Arriving with an event
or category filter in the URL must apply it and show it as an active chip — which works
by construction because list state lives in the URL, and which should be verified rather
than assumed.

Zero-quantity tickets are surfaced distinctly so they do not look like a data-entry
mistake.

The screen is the PRD-003 list, configured: `AppDataTable` over `el-table`, `ListToolbar`
of Element Plus filter controls, `el-pagination`, `StatusTag` (`el-tag`), `el-dropdown`
row actions and `useConfirm` (`ElMessageBox.confirm`) for deletion.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Built from `AppDataTable` (`el-table` / `el-table-column`), `ListToolbar` (`el-input`, `el-select`, `RemoteSelect`, `CurrencyInput`, `el-tag`, `el-button`), `el-pagination`, `StatusTag`, `el-dropdown` and `ElMessageBox`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] Columns: name, price with currency, quantity, status, event name, category name — `el-table-column` descriptors with responsive priorities set; custom cells through the descriptor cell slot
- [ ] Event and category shown by name, never by identifier
- [ ] Search by name in an `el-input clearable` with a search `#prefix`, debounced in the composable, reflected in the URL
- [ ] Filters: event, category, status, currency and a price range — each reflected in the URL and shown as a removable `el-tag closable` chip, with an `el-button link` clear-all
- [ ] Event and category filters use `RemoteSelect` (`el-select` remote); status and currency use `el-select clearable`; the price range uses two `CurrencyInput` (`el-input-number`) controls so no conversion happens outside the wrapper
- [ ] On mobile the filters open in an `el-drawer` from an `el-button` carrying an `el-badge` active-filter count
- [ ] Combined filters work together and are sent as a single request
- [ ] Sorting by name, price, quantity, status and creation date via `sortable="custom"` + `@sort-change`; sort state mirrored from the URL (`:default-sort`, table ref `.sort()` / `.clearSort()`)
- [ ] Prices formatted through the shared money formatter with correct symbol and grouping; numeric columns right-aligned (`align="right"`) with tabular figures
- [ ] Zero-quantity tickets visually distinguished with an `el-tag` marker (text label, not colour alone) in the quantity cell
- [ ] Status rendered through `StatusTag` (`el-tag` type/effect from the status enum, with a text label)
- [ ] First load shows an `el-skeleton`; refetch keeps rows with `v-loading`; no-data / no-matches / load-failed use `el-empty` (in the `el-table` `#empty` slot) or `el-result` with an `el-button` retry
- [ ] Pagination through `el-pagination` (`total, sizes, prev, pager, next`), `small` below tablet
- [ ] Arriving with an event or category filter in the URL applies it and shows it as an active `el-tag` chip, with the `RemoteSelect` label resolved
- [ ] Delete as an `el-dropdown-item` row action (`divided`) with a named `ElMessageBox.confirm` via `useConfirm` whose `beforeClose` sets `confirmButtonLoading`; succeeds without a dependency check
- [ ] Mobile card presentation (`el-card shadow="never"`) shows name, price and status
- [ ] Integration tests mount real Element Plus components (no stubs) and query teleported poppers (`el-select` dropdowns, `el-dropdown` menus, `ElMessageBox`) in `document.body`: combined event and category filtering asserts the request the mock receives and the rendered result; deep-link entry applies the filter and shows the chip
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #33 — *Remote select — paginated, searchable, preselected-value resolution*

This slice's branch is created off `feat/33-remote-select` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/34-tickets-list`

## User stories addressed

Referenced by number from the parent PRD:

- 1-15 (list, columns, search, all filters, sorting, pagination, deep-link entry)
- 39-45 (deletion, zero quantity, mobile cards, price formatting)
