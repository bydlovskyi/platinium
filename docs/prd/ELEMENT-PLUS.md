# Element Plus Component Policy

Cross-cutting rule for every PRD in this folder and every slice in [`../issues/`](../issues/).
Where a PRD or issue says "a table", "a select", "a confirmation", this document says which
Element Plus component that is. Element Plus `2.13.x` is already a dependency, auto-registered
through `unplugin-vue-components`; it is the portal's component library, not an optional
extra.

## Why this document exists

The first ten PRDs described behaviour in library-neutral terms ("the component owns the
sorting affordances", "a skeleton matching the table shape"). Only three places named an
Element Plus component explicitly — the drawer, the notification API and the message box —
and those were the only three places an Element Plus component was used. Everywhere else the
builder read neutral wording as "build it": the data table (#23) became a hand-rolled
`<table>` with raw `<button>` sort headers, a hand-built skeleton and hand-built empty and
error panels; the shell (#20) got a hand-built sidebar, header buttons and breadcrumb. Each
of those re-implements behaviour Element Plus already ships, tested and accessible — and each
is now code the project has to maintain and test itself.

`architecture.md` already says "Check Element Plus first". That rule did not reach the
builder because the specs it built from never said it. This document makes it part of the
spec.

## The rule

1. **Element Plus first.** Every interactive control and every standard UI pattern is built
   from the Element Plus component listed below. Shared portal components (`AppDataTable`,
   `ListToolbar`, `CurrencyInput`, `RemoteSelect`, `StatusTag`, …) **wrap and configure**
   Element Plus components; they do not replace them.
2. **No raw interactive HTML in feature or shared code.** No `<button>`, `<input>`,
   `<select>`, `<textarea>`, `<table>` or native checkbox/radio where an Element Plus
   equivalent exists. Semantic layout elements (`<nav>`, `<section>`, `<h1>`) and Tailwind
   layout utilities around Element Plus components remain fine.
3. **A hand-built control needs a written reason.** If an Element Plus component genuinely
   cannot meet an acceptance criterion, the slice records *which* criterion and *why* in its
   PR description, and prefers extending the Element Plus component through its slots and
   props over replacing it. The only standing exceptions are listed at the end of this file.
4. **Theme through Element Plus CSS variables, not class overrides.** The token layer
   (PRD-010) maps onto `--el-*` variables (`--el-color-primary`, `--el-bg-color`,
   `--el-text-color-*`, `--el-border-color-*`, `--el-border-radius-base`, `--el-font-family`,
   `--el-transition-duration*`) in `src/assets/styles/element-reset/theme.css`, for both
   themes. Selector-level overrides of `.el-*` internals are a last resort and each one carries
   a comment naming what the variable could not express.
5. **Register the stylesheet with the component.** The resolver runs with
   `importStyle: false`; component CSS is imported by hand in
   `src/assets/styles/element-reset/components/index.css`. **Every slice that adopts a new
   Element Plus component adds its `element-plus/theme-chalk/el-<name>.css` import there in
   the same commit.** A component that renders unstyled in the browser but passes its tests is
   the symptom of forgetting this.
6. **One root `el-config-provider`** in `App.vue` owns size, z-index base, locale and
   `button.autoInsertSpace`, so no component sets those individually.
7. **Icons go inside Element Plus slots.** The type-safe `<Icon name>` component is passed
   through `#icon`, `#prefix`, `#suffix` or wrapped in `el-icon`. Element Plus's own
   `@element-plus/icons-vue` is not added — one icon set (PRD-010).

## Component map

### Shell and navigation (PRD-002)

| Need | Element Plus | Notes |
|---|---|---|
| Admin layout frame | `el-container`, `el-aside`, `el-header`, `el-main` | `el-aside :width` switches between full and icon rail |
| Sidebar navigation | `el-menu` + `el-menu-item` | `:collapse` for the tablet icon rail; `:default-active` from the current route **name**; navigate with `router.push({ name })` in `@select` — do **not** use `el-menu`'s `router` mode, it navigates by path |
| Sidebar scroll | `el-scrollbar` | |
| Mobile navigation | `el-drawer` | already in place |
| Header icon buttons (hamburger, rail toggle) | `el-button` `text` / `circle` + `#icon` | `aria-label` on every icon-only button |
| Page header | `PageHeader` wrapping `el-breadcrumb` / `el-breadcrumb-item :to="{ name }"`, an `<h1>` title and an `actions` slot of `el-button`s | `el-page-header` always renders a back control, so it is used only on screens that genuinely have one (a detail or form route returning to its list) — never as the generic list-screen header |
| Account menu | `el-dropdown` + `el-avatar` + `el-tag` (role) | trigger is an `el-button text`, not a raw button |
| Theme toggle | `el-button circle` + `el-tooltip`, or `el-segmented` for light / dark / system | |
| Tooltips | `el-tooltip` | |
| Not-found / forbidden / fatal pages | `el-result` | illustration through `#icon`, action through `#extra` |

### Authentication (PRD-002)

| Need | Element Plus |
|---|---|
| Login card | `el-card` |
| Form, fields, validation | `el-form` (`:rules`, `label-position="top"`), `el-form-item`, `el-input` (`show-password` for the password) |
| Submit with progress | `el-button type="primary" :loading native-type="submit"` |
| Credentials error | `el-alert` |

### Lists (PRD-003, reused by PRD-004–007)

| Need | Element Plus | Notes |
|---|---|---|
| Data table (tablet and up) | `el-table` + `el-table-column` generated from the column descriptors | `AppDataTable` wraps it; descriptors map to `prop`, `label`, `align`, `min-width`, `sortable` |
| Server-side sort | `sortable="custom"` + `@sort-change` → emit `sort-requested` | default `sort-orders` is `['ascending','descending',null]` — the three-state cycle is native; `el-table` sets `aria-sort` on the header itself |
| Sort state from the URL | `:default-sort` on mount; table ref `.sort(prop, order)` / `.clearSort()` when the URL changes externally | the URL stays the source of truth — the table mirrors it |
| Custom cells | `el-table-column` default slot `#default="{ row }"` forwarding to the descriptor's cell slot | |
| Row selection | `el-table-column type="selection"`, `row-key`, `@selection-change`; `reserve-selection` **off** (page scope) | when the parent clears `selectedRowKeys`, call `clearSelection()` / `toggleRowSelection()` so the table matches |
| Row actions | `el-dropdown` with an `el-button text circle` trigger, `el-dropdown-item` (`divided` before a destructive action) | |
| First-load skeleton | the same `el-table` fed placeholder rows whose cells render `el-skeleton-item` | identical columns and widths to the loaded table by construction — no layout shift |
| Refetch with rows on screen | `v-loading` on `el-table` | keeps rows visible instead of blanking |
| Empty states | `el-empty` (`#image` for the token illustration, default slot for the `el-button` action) rendered in place of the table / cards | three variants: no-data, no-matches, load-failed; rendered outside `el-table` so the mobile card presentation shares them |
| Load failed | `el-result` (or `el-empty` variant) + `el-button` retry | |
| Mobile card presentation | `el-card shadow="never"` per row, `el-checkbox`, `el-dropdown` | same descriptors, every column (title, badge, label/value fields) |
| Pagination | `el-pagination` `layout="total, sizes, prev, pager, next"`, `background`; `small` and a lower `pager-count` below tablet | renders the `PaginationMeta` envelope directly |
| Toolbar search | `el-input clearable` with a search `#prefix` | debounced in the composable, not in the input |
| Toolbar filters | `el-select` (`clearable`, `filterable`), `el-date-picker type="daterange"` | |
| Active-filter chips | `el-tag closable` | |
| Clear all | `el-button link` | |
| Filters on mobile | `el-drawer` opened by an `el-button` with `el-badge` showing the active-filter count | |
| Status tag | `el-tag` (`type` + `effect` mapped from the status enum) with a text label, never colour alone | `StatusTag` wraps it |
| Confirmation | `ElMessageBox.confirm` wrapped by `useConfirm` | `beforeClose` sets `instance.confirmButtonLoading = true` while the request is in flight — this is the "progress on the confirm button" criterion, built in |
| Notifications | `ElNotification` / `ElMessage` through the notification service | already in place |

### Forms (PRD-004–006)

| Need | Element Plus | Notes |
|---|---|---|
| Form and client rules | `el-form :model :rules`, `el-form-item prop` | validate through the form ref, not ad-hoc checks |
| Server-side field errors | `el-form-item :error` bound to the mapped 422 / 409 message | |
| Text fields, length bounds, counter | `el-input` with `maxlength` + `show-word-limit` | `show-word-limit` *is* the live character counter |
| Multiline text | `el-input type="textarea" autosize` | |
| Country and other static selects | `el-select filterable` + `el-option` | |
| Date pickers | `el-date-picker` | end-date constraint through `:disabled-date` |
| Inline warning (end date cleared) | `el-alert type="warning" :closable="false"` under the field, or `ElMessage` | |
| Status choice | `el-radio-group` / `el-segmented`, or `el-select` when more than four options | |
| Quantity | `el-input-number :min="0" :step="1" step-strictly :precision="0"` | |
| Money | `CurrencyInput` wrapping `el-input-number :precision` (from the currency) `:min="0" :controls="false"` with the symbol in `#prefix` | conversion to and from minor units lives only in the wrapper |
| Currency | `el-select` | required, no default |
| Remote entity pickers | `RemoteSelect` wrapping `el-select filterable remote :remote-method :loading` | `#loading` and `#empty` slots for dropdown states; `el-option` default slot for secondary detail; incremental load via a scroll listener on the dropdown's `el-scrollbar` (`popper-class` + VueUse `useInfiniteScroll`); `#footer` for the "loading more" row; preselected value merged into `options` so the label resolves |
| Fieldset grouping | `el-divider content-position="left"` or a heading between `el-form-item` groups | |
| Submit / cancel | `el-button type="primary" :loading` / `el-button` | |
| Unsaved-changes prompt | `ElMessageBox.confirm` | |
| Record not found on edit | `el-result icon="warning"` with a back-to-list `el-button` | |
| Modal forms | `el-dialog` via the modals registry, `:fullscreen` below tablet, `destroy-on-close` | focus return is inherited |

### Dashboard, bulk operations, export (PRD-007)

| Need | Element Plus | Notes |
|---|---|---|
| Headline figures | `el-statistic` (`title`, `value`, `#prefix` / `#suffix`) | count-up via VueUse `useTransition` feeding `:value` — the pattern from the Element Plus docs; disabled under reduced motion |
| Responsive figure grid | `el-row` / `el-col` with breakpoint spans | |
| Status breakdowns | `el-progress` per status (`:percentage`, `:color` from tokens, `:format` for the count) | see exceptions for a single stacked bar |
| Per-currency block | `el-descriptions` or a group of `el-statistic` under one labelled heading | never summed |
| Next events / nearly sold out | compact `el-table size="small"` or `el-timeline` | every row links to a filtered list |
| Linked figures | `el-link` / `router-link` wrapping the statistic | |
| Loading / failed | `el-skeleton` with a dashboard-shaped template / `el-result` + retry `el-button` | |
| Meaningful cards | `el-card shadow="never"` — only where a card is meaningful (PRD-010) | |
| Bulk contextual bar | `el-affix` (optional) containing `el-tag` count, `el-dropdown` status change, danger `el-button` delete, `el-button link` clear | |
| Bulk progress | `el-button :loading`, `el-progress` for multi-record progress | |
| Bulk results | `el-dialog` with `el-result` summary and an `el-table` of failed records and reasons | partial success is the expected case |
| Forbidden route | `el-result` 403 | |
| CSV export | `el-button :loading`; large-export warning via `ElMessageBox.confirm` | |

### Motion (PRD-010)

Element Plus's own transitions (drawer, dialog, dropdown, notification, `el-collapse-transition`)
are the motion for those components. They are tuned through `--el-transition-duration` and
`--el-transition-duration-fast`, mapped to the two duration tokens, and set to `0s` under
`prefers-reduced-motion`. Vue `<Transition>` is used for route transitions and the
skeleton-to-content crossfade. `el-table` renders its own body, so a deleted row animates out
through a `row-class-name` leaving class and a CSS animation before the refetch — not through
`<TransitionGroup>`.

## Testing Element Plus components (PRD-008)

- Mount with the real Element Plus components, never stubs — sorting, selection and
  validation behaviour *is* the Element Plus component, and a stub tests nothing.
- Drive through the rendered DOM Element Plus produces (header cell click for sort, the
  selection checkbox input, `el-select` option click), preferring roles and labels where it
  exposes them.
- Poppers (dropdown, select, date picker, message box) teleport to `document.body`; query
  there, or set `:teleported="false"` in the test mount.
- Accessibility attributes on wrapper components do not always reach the native control (see
  the `el-checkbox` / `aria-describedby` lesson in
  `.claude/skills/worker-team-agent/lessons-learned.md`) — assert on the real `<input>`.

## Standing exceptions

Hand-built is acceptable only for:

- The `<Icon>` SVG component (one icon set, PRD-010).
- Token-built line illustrations — placed *inside* `el-empty` / `el-result` slots.
- A single stacked proportional distribution bar, which `el-progress` cannot express; built
  from tokens with an accessible text equivalent. Per-status bars use `el-progress`.
- Page-level layout (spacing, grids, max content width) with Tailwind utilities.

Anything else hand-built is a review finding.
