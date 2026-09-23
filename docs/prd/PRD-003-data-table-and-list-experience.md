# PRD-003 — Data Table & List Experience

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001, PRD-002 |
| **Blocks** | PRD-004, PRD-005, PRD-006, PRD-007 |

## Problem Statement

Three entity screens are coming — events, categories and tickets — and each one needs
search, filtering, sorting, pagination, loading states, an empty state, an error state
with a retry, row actions, a delete confirmation, and a responsive presentation that
survives a phone.

Built three times, that is three subtly different implementations. The events page
debounces at 300ms and the tickets page at 500ms. One resets to page 1 when a filter
changes and another does not, so an administrator filters a list and lands on an empty
page 7. One puts filters in the URL and another keeps them in local state, so half the
list views are shareable and half are not. Sorting is stable on one screen and
non-deterministic on another. Each would be individually defensible and collectively
incoherent.

The assessment names search, filtering, sorting and pagination as dashboard
requirements, and the mock API built in PRD-001 already implements them server-side
with one shared query vocabulary. What is missing is the client half of that contract:
a single place that owns list state, keeps it in the URL, and renders it consistently.

Responsiveness makes this worse rather than better. A seven-column ticket table cannot
be a table on a 375-pixel screen. Solving that once, in a shared component, is a
design decision. Solving it three times is three design decisions that will not agree.

## Solution

Build the list experience once, as a pair of deep modules, and let entity PRDs supply
only what is genuinely entity-specific.

**List state lives in the URL.** A single composable owns search text, active filters,
sort field and direction, and the current page — and it reads and writes them as query
parameters. That one decision produces several properties at once: a filtered view is
shareable by copying the address bar, it survives a reload, the browser back button
steps through filter changes as an administrator expects, and returning from an edit
screen restores the exact list the administrator left. It also makes list state
trivially inspectable in a test.

Rules that are easy to get wrong are encoded once here: search is debounced, changing
any search or filter resets to the first page, sort changes preserve the page only
when that is meaningful, and default values are omitted from the URL so a pristine list
has a clean address.

**One table component, configured by column descriptors.** Entity screens declare
their columns — key, label, whether it sorts, how a cell renders, and its responsive
priority — rather than writing table markup. `AppDataTable` wraps Element Plus
`el-table` and generates one `el-table-column` per descriptor; Element Plus supplies the
sorting affordances (`sortable="custom"`), the selection column (`type="selection"`), the
empty slot and the loading directive, and the wrapper configures them — the empty state,
the loading skeleton, the error-with-retry state, row selection and the actions column.

**The responsive answer is a presentation switch, not a media query on a table.** Above
the tablet breakpoint the descriptors render as an `el-table`. Below it, the same
descriptors render as a stacked list of `el-card shadow="never"` cards showing only the
columns marked as high priority, with the rest available on the detail view. The data, the sorting and the pagination are
identical; only the presentation changes. Because this lives in one component, every
entity screen is responsive the moment it is written.

**Every async state is a first-class state.** First load is the `el-table` itself fed
`el-skeleton-item` placeholder rows, matching the table shape, not a spinner that collapses the layout; a refetch with rows already on
screen uses `v-loading` on the `el-table`, which dims the rows instead of blanking them.
An empty result, rendered as `el-empty` in place of the table, distinguishes
"nothing exists yet" — which offers the create action — from "nothing matched your
filters", which offers to clear them. A failure renders `el-result` with what went wrong
and a retry `el-button` rather than an empty table that looks like no data.

**Destructive actions are confirmed once, consistently.** One confirmation composable,
`useConfirm` over `ElMessageBox.confirm`, naming the specific record, used by every
delete in the portal.

## User Stories

1. As an administrator, I want to search a list by typing, so that I can find a record
   without scrolling.
2. As an administrator, I want search to wait until I stop typing, so that the list
   does not flicker on every keystroke.
3. As an administrator, I want to clear the search in one action, so that I can get
   back to the full list quickly.
4. As an administrator, I want to be returned to the first page when I search, so that
   I am never shown an empty page of results that exist.
5. As an administrator, I want to filter a list by its meaningful attributes, so that I
   can narrow a large dataset.
6. As an administrator, I want to combine several filters, so that I can answer a
   specific question.
7. As an administrator, I want to see which filters are active as removable chips, so
   that I am never confused by a list that seems to be missing records.
8. As an administrator, I want to clear all filters in one action, so that I can start
   over.
9. As an administrator, I want to sort by clicking a column heading, so that I can
   order the list the way I am thinking about it.
10. As an administrator, I want a second click to reverse the sort and a third to
    remove it, so that I can get back to the default order.
11. As an administrator, I want the sorted column clearly marked with its direction, so
    that I can read the list correctly.
12. As an administrator, I want rows with equal sort values to hold a stable order, so
    that the list does not shuffle when I page through it.
13. As an administrator, I want pagination with the total count visible, so that I know
    how much data I am working with.
14. As an administrator, I want to change the page size, so that I can scan more rows
    at once on a large screen.
15. As an administrator, I want my page size remembered, so that I do not reset it on
    every visit.
16. As an administrator, I want to copy the URL of a filtered list and send it to a
    colleague, so that they see exactly what I see.
17. As an administrator, I want my filters to survive a reload, so that refreshing does
    not discard my work.
18. As an administrator, I want the browser back button to undo my last filter change,
    so that navigation behaves the way I expect.
19. As an administrator, I want to return from editing a record to the same filtered
    page I left, so that I can work through a list without losing my place.
20. As an administrator, I want a skeleton that matches the table while data loads, so
    that the layout does not jump.
21. As an administrator, I want the previous results dimmed rather than removed while a
    new page loads, so that the screen does not flash empty.
22. As an administrator, I want an empty list to tell me nothing exists yet and offer to
    create the first record, so that I know what to do next.
23. As an administrator, I want an empty filtered list to say so and offer to clear the
    filters, so that I do not think my data was deleted.
24. As an administrator, I want a failed load to show what went wrong and a retry
    button, so that a transient failure does not require a reload.
25. As an administrator, I want edit and delete available on every row, so that I can
    act without opening the record.
26. As an administrator, I want row actions grouped in a menu on small screens, so that
    they do not crowd the content.
27. As an administrator, I want a confirmation that names the record before I delete it,
    so that I do not remove the wrong one.
28. As an administrator, I want the confirm button to show progress and stay disabled
    while deleting, so that I do not submit it twice.
29. As an administrator using a phone, I want the list as readable cards rather than a
    table scrolled sideways, so that I can actually use it.
30. As an administrator using a phone, I want search and filters behind a control that
    does not consume the screen, so that I can see the data.
31. As an administrator, I want to select several rows, so that I can act on them
    together.
32. As an administrator, I want a select-all that clearly indicates it applies to this
    page, so that I do not believe I selected the whole dataset.
33. As a keyboard user, I want to reach every control in the toolbar and table in a
    sensible order, so that I can work without a mouse.
34. As a screen-reader user, I want sortable headings to announce their current sort
    state, so that I understand the list order.

## Implementation Decisions

### Component library

Every UI piece in this PRD is built from Element Plus, as mapped in the
[Element Plus component policy](ELEMENT-PLUS.md) (see its *Lists* table). The shared
components below — `AppDataTable`, `ListToolbar`, `StatusTag` and `useConfirm` — **wrap
and configure Element Plus rather than replace it**: no raw `<table>`, `<button>`,
`<input>` or `<select>` in any of them. Each slice that adopts a new Element Plus component
imports its `element-plus/theme-chalk/el-<name>.css` in
`src/assets/styles/element-reset/components/index.css` in the same commit (the resolver
runs with `importStyle: false`). Theming goes through `--el-*` variables, not `.el-*`
selector overrides.

| Module | Element Plus components |
|---|---|
| `AppDataTable` (table) | `el-table`, `el-table-column` (incl. `type="selection"`), `el-dropdown` row actions, `el-skeleton`, `v-loading`, `el-empty`, `el-result`, `el-button` |
| `AppDataTable` (mobile) | `el-card`, `el-checkbox`, `el-dropdown` |
| Pagination | `el-pagination` |
| `ListToolbar` | `el-input`, `el-select` / `el-option`, `el-date-picker`, `el-tag`, `el-button`, `el-drawer`, `el-badge` |
| `StatusTag` | `el-tag` |
| `useConfirm` | `ElMessageBox.confirm` |

### List query composable (deep module)

The centrepiece. It owns the full list query — search, filters, sort field, sort
direction, page, page size — synchronised bidirectionally with the route query.

Behaviour encoded once:

- Search is debounced before it reaches the URL, so intermediate keystrokes do not
  create history entries.
- Any change to search or a filter resets the page to one.
- Default values are absent from the URL. A pristine list has a clean address.
- Query parameters are parsed defensively: an out-of-range page, an unknown sort field
  or a malformed filter falls back to the default rather than propagating a bad request.
- Filter shape is declared per entity as a typed descriptor, so the composable stays
  generic while each screen remains type-safe.

It is generic over the entity's query type and tested in isolation with a memory
router — no components, no network.

### List resource composable

Sits above the query composable and binds it to a service call: watches the query,
fetches, and exposes data, pagination metadata, loading state, error state and a
refetch. Uses the existing abort-controller composable so a superseded request cannot
overwrite a newer result — a real defect on a fast-typing administrator, not a
theoretical one.

Entity screens consume this and the table component, and write almost no fetching
logic themselves.

### Data table component (deep module)

Driven entirely by column descriptors. A descriptor carries the field key, a label, a
sortable flag, an optional custom cell renderer, an alignment, and a responsive
priority that decides whether the column appears in the mobile card layout.

`AppDataTable` wraps `el-table` and maps each descriptor to an `el-table-column`
(`prop`, `label`, `align`, `min-width`, `sortable`); a custom cell renderer is forwarded
through the column's `#default="{ row }"` slot. It emits intent — sort requested, page
requested, row action invoked, selection changed — and holds no fetching logic and no
knowledge of any entity. How each owned concern is built:

- **Sorting.** Sortable columns use `sortable="custom"`; `@sort-change` emits
  `sort-requested` and the table never sorts rows itself. The native `sort-orders`
  (`['ascending', 'descending', null]`) give the three-state cycle, and `el-table` sets
  `aria-sort` on the header cell. The URL stays the source of truth: `:default-sort`
  seeds the state on mount, and the table ref's `sort(prop, order)` / `clearSort()`
  mirror the URL when it changes externally (back button, shared link).
- **Selection.** An `el-table-column type="selection"` with `row-key` and
  `@selection-change`; `reserve-selection` is **off**, so selection is page-scoped. When
  the parent resets `selectedRowKeys`, the wrapper calls `clearSelection()` /
  `toggleRowSelection()` so the table matches. The header checkbox is labelled as
  selecting "this page".
- **Row actions.** An `el-dropdown` per row with an `el-button text circle` trigger
  (`aria-label` naming the record) and `el-dropdown-item`s, `divided` before a
  destructive action.
- **Async states.** First load: the `el-table` fed placeholder rows whose cells render
  `el-skeleton-item`, so columns and widths match by construction. Refetch with rows on screen: `v-loading` on `el-table`.
  Empty: `el-empty`, rendered in place of the table and cards, in its no-data variant (create
  `el-button`) or no-matches variant (clear-filters `el-button`), with the token
  illustration in `#image`. Load failed: `el-result` with a retry `el-button`.

The two presentations share one descriptor set. The mobile card layout is not a
separate component that entity screens opt into; it is what the table renders below
the tablet breakpoint, using the breakpoint composable introduced in PRD-002 — one
`el-card shadow="never"` per row with an `el-checkbox` for selection and the same
`el-dropdown` row actions, showing only high-priority columns.

### Supporting pieces

**Toolbar.** `ListToolbar`: search is an `el-input clearable` with a search icon in
`#prefix` (debounced in the composable, not the input); filters are `el-select`
(`clearable`, `filterable`) with `el-option`s and `el-date-picker type="daterange"`;
active filters are `el-tag closable` chips; clear-all is an `el-button link`; plus a slot
for page actions. Below the tablet breakpoint the filters move into an `el-drawer`,
opened by an `el-button` wrapped in an `el-badge` showing the active-filter count.

**Pagination.** `el-pagination` with `layout="total, sizes, prev, pager, next"` and
`background`, `small` with a lower `pager-count` below tablet. Renders the
`PaginationMeta` envelope from PRD-001 directly. Page size choice persists per
administrator.

**Confirmation composable.** `useConfirm` wraps `ElMessageBox.confirm` into one call that
returns a resolved intent and accepts the record's name so the prompt is specific rather
than generic. The in-flight state is Element Plus's own: `beforeClose` sets
`instance.confirmButtonLoading = true` while the request runs, which shows progress and
blocks a second submit, then calls `done()` on success.

**Status tag.** `StatusTag` wraps `el-tag`, mapping a status enum value to a consistent
`type` + `effect` and a text label across the whole portal, so a `draft` event and a
`draft` ticket look the same — never colour alone.

**Formatters.** Extends the existing filters module with locale-aware date and
date-range formatting, and money formatting that takes minor units and a currency code
— matching the integer-minor-units decision from PRD-001.

### Testing boundary

Component tests mount the real Element Plus components — never stubs — because sorting,
selection and the empty slot *are* Element Plus behaviour. They drive the DOM Element Plus
renders (header cell click for sort, the selection checkbox `<input>`, `el-select` option
click) and query teleported poppers (dropdown, select, date picker, message box) in
`document.body`, per [ELEMENT-PLUS.md](ELEMENT-PLUS.md#testing-element-plus-components-prd-008).

- List query composable — unit tested: URL round-tripping, debounce, page reset on
  filter change, defaults omitted, defensive parsing of malformed parameters.
- List resource composable — unit tested: refetch on query change, abort of a
  superseded request, error state and recovery via retry.
- Data table — component tested against real `el-table`: descriptor-driven column
  rendering, sort cycling through three states via header clicks and `sort-change`,
  `aria-sort` on the header, URL-driven `sort()` / `clearSort()` sync,
  `el-skeleton`/`el-empty`/filtered-empty/`el-result` states, selection via the
  `type="selection"` checkboxes including `clearSelection()` sync, row actions in the
  `el-dropdown` popper, and the `el-card` presentation switch at the tablet breakpoint.
- Toolbar and pagination — component tested: `el-input` clear, `el-tag` close removes a
  filter, `el-drawer` + `el-badge` count on mobile, `el-pagination` page-size change.
- Formatters and status tag — unit tested, including a zero price, a large price and
  each currency.
- Confirmation composable — unit tested for confirm and cancel paths against the real
  `ElMessageBox`, including `confirmButtonLoading` while the request is in flight.

## API Contract Plan

None. This PRD consumes the shared query vocabulary and pagination envelope introduced
by PRD-001 and introduces no new endpoint, parameter or schema component.

## Out of Scope

- Any entity-specific screen, column set or filter definition — PRD-004, PRD-005,
  PRD-006.
- Executing bulk operations. This PRD delivers row selection; acting on a selection is
  PRD-007.
- CSV export — PRD-007.
- Infinite scrolling and virtualised rendering. Offset pagination is the chosen model;
  the alternatives are discussed in `TECHNICAL_REVIEW.md` as the path to very large
  datasets.
- Drag-and-drop reordering, column resizing, column reordering and per-administrator
  saved views.
- Server-driven column configuration.

## Further Notes

This is the highest-leverage PRD in the project and the one most at risk of being
undercut by the PRDs that follow. The moment an entity screen adds a `v-if` to the
table component or keeps one filter in a local ref instead of the URL, the abstraction
starts leaking and the next entity copies the leak. The review gate for PRD-004 through
PRD-006 should explicitly check that no entity screen contains list-state logic.

Putting list state in the URL is the decision a reviewer is most likely to probe. It
costs more than local refs — parsing, defaults, history semantics — and it buys
shareable views, reload survival, correct back-button behaviour and preserved context
on return from an edit. Those are product properties, not developer conveniences, and
the trade-off should be stated as such in `TECHNICAL_REVIEW.md`.

Selection semantics deserve care. Selecting all rows on a page is not selecting the
whole filtered dataset, and a control that blurs the two will cause an administrator to
bulk-delete far more than they intended once PRD-007 lands. The distinction must be
visible in the UI from this PRD onward, before there is anything destructive to
attach to it.
