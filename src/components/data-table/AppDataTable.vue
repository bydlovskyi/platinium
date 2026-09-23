<script lang="ts" setup generic="TRow extends Record<string, unknown>">
/**
 * Global, descriptor-driven data table (GitHub issue #23, PRD-003 "Data
 * table component (deep module)"). Every future entity screen (events,
 * categories, tickets) configures this with column descriptors instead of
 * writing table markup three times.
 *
 * This component holds no fetching logic and no entity knowledge — it
 * consumes `data`/`meta`/`loading`/`error` exactly as `useListResource`
 * exposes them, and emits intent only (`sort-requested`, `page-requested`,
 * `row-action-invoked`, `selection-changed`). The caller wires those events
 * back into `useListQuery`/`useListResource`.
 *
 * The responsive answer is a presentation switch driven by `useBreakpoint`
 * (PRD-002), not a media query living inside the table: at/above the tablet
 * breakpoint the descriptors render as a real table, below it they render
 * as stacked cards showing only `responsivePriority: 'high'` columns. Both
 * presentations read the same `columns` prop.
 */
import type {
  IDataTableColumn,
  IDataTableRowAction,
  IDataTableSort,
  TDataTableEmptyReason
} from './data-table.types'

const SKELETON_ROW_COUNT = 5

const props = withDefaults(defineProps<{
  columns: IDataTableColumn<TRow>[]
  rows: TRow[]
  /** Must return a value unique per row on the current page — selection state is keyed by it, so two rows sharing a key are treated as one. */
  rowKey: (row: TRow) => string
  meta?: TPaginationMeta
  loading?: boolean
  error?: unknown
  /** Why the list is empty — the table has no notion of "filters" itself. */
  emptyReason?: TDataTableEmptyReason
  sort?: IDataTableSort
  rowActions?: IDataTableRowAction<TRow>[]
  /** Opts into the checkbox column and page-scoped select-all. */
  selectable?: boolean
  selectedRowKeys?: string[]
  caption?: string
}>(), {
  meta: undefined,
  loading: false,
  error: undefined,
  emptyReason: 'none',
  sort: undefined,
  rowActions: () => [],
  selectable: false,
  selectedRowKeys: () => [],
  caption: undefined
})

const emit = defineEmits<{
  'sort-requested': [field: string]
  'page-requested': [page: number]
  'row-action-invoked': [payload: { action: string; row: TRow }]
  'selection-changed': [keys: string[]]
  'create-requested': []
  'clear-filters-requested': []
  'retry-requested': []
}>()

const { isMobile } = useBreakpoint()

const isEmpty = computed(() => !props.loading && !props.error && props.rows.length === 0)
const showEmptyState = computed(() => isEmpty.value && props.emptyReason !== 'none')

const visibleColumns = computed(() => props.columns)
const cardColumns = computed(() => props.columns.filter(column => column.responsivePriority === 'high'))

const hasSelection = computed(() => props.selectable)
const hasActions = computed(() => (props.rowActions?.length ?? 0) > 0)

type TPresentationMode = 'loading' | 'error' | 'empty' | 'table' | 'cards'

const presentationMode = computed<TPresentationMode>(() => {
  // `loading` is checked before `error` so a retry-in-flight (loading again
  // while a previous attempt's error is still on the props, before the
  // caller clears it) shows feedback instead of freezing on the stale error
  // panel. With no rows yet that's the skeleton; with rows already on hand
  // it's the same dimmed table/cards a superseded fetch uses.
  if (props.loading) {
    return props.rows.length === 0 ? 'loading' : (isMobile.value ? 'cards' : 'table')
  }

  if (props.error) {
    return 'error'
  }

  if (showEmptyState.value) {
    return 'empty'
  }

  return isMobile.value ? 'cards' : 'table'
})

function alignClass (align: IDataTableColumn<TRow>['align']): string {
  if (align === 'center') {
    return 'text-center'
  }

  if (align === 'right') {
    return 'text-right'
  }

  return 'text-left'
}

function ariaSortFor (column: IDataTableColumn<TRow>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.sortable) {
    return undefined
  }

  if (props.sort?.field !== column.key) {
    return 'none'
  }

  return props.sort.order === 'asc' ? 'ascending' : 'descending'
}

function sortIcon (column: IDataTableColumn<TRow>): TIcons {
  if (props.sort?.field !== column.key) {
    return 'sort'
  }

  return props.sort.order === 'asc' ? 'sort-ascending' : 'sort-descending'
}

function onHeaderActivate (column: IDataTableColumn<TRow>): void {
  if (!column.sortable) {
    return
  }

  emit('sort-requested', column.key)
}

function cellValue (row: TRow, column: IDataTableColumn<TRow>): unknown {
  return row[column.key]
}

// --- Selection (page-scoped) ------------------------------------------------

const pageRowKeys = computed(() => props.rows.map(row => props.rowKey(row)))
const selectedSet = computed(() => new Set(props.selectedRowKeys))

// Element Plus's `el-checkbox` never forwards arbitrary attrs (like
// `aria-describedby`) to its inner `<input>`, only to its outer wrapping
// label — so the page-scope caveat has to travel in the accessible name
// itself for a screen reader to announce it on the focused control.
const selectAllAriaLabel = computed(() => (
  `Select all ${pageRowKeys.value.length} row${pageRowKeys.value.length === 1 ? '' : 's'} on this page`
))

const allOnPageSelected = computed(() => (
  pageRowKeys.value.length > 0 && pageRowKeys.value.every(key => selectedSet.value.has(key))
))
const someOnPageSelected = computed(() => (
  pageRowKeys.value.some(key => selectedSet.value.has(key)) && !allOnPageSelected.value
))

function isRowSelected (row: TRow): boolean {
  return selectedSet.value.has(props.rowKey(row))
}

function toggleRow (row: TRow, checked: boolean): void {
  const key = props.rowKey(row)
  const next = new Set(props.selectedRowKeys)

  if (checked) {
    next.add(key)
  } else {
    next.delete(key)
  }

  emit('selection-changed', Array.from(next))
}

/** `el-checkbox`'s `change` payload is typed as `CheckboxValueType`
 * (`string | number | boolean`) even though this checkbox never carries a
 * `label`/`value`, so it only ever emits a boolean at runtime. */
function onRowCheckboxChange (row: TRow, value: IElementPlus['CheckboxValueType']): void {
  toggleRow(row, Boolean(value))
}

function toggleSelectAllOnPage (checked: boolean): void {
  const next = new Set(props.selectedRowKeys)

  if (checked) {
    pageRowKeys.value.forEach(key => next.add(key))
  } else {
    pageRowKeys.value.forEach(key => next.delete(key))
  }

  emit('selection-changed', Array.from(next))
}

function onSelectAllCheckboxChange (value: IElementPlus['CheckboxValueType']): void {
  toggleSelectAllOnPage(Boolean(value))
}

// --- Row actions -------------------------------------------------------------

function isActionDisabled (action: IDataTableRowAction<TRow>, row: TRow): boolean {
  return action.disabled ? action.disabled(row) : false
}

function onRowAction (action: IDataTableRowAction<TRow>, row: TRow): void {
  if (isActionDisabled(action, row)) {
    return
  }

  emit('row-action-invoked', { action: action.key, row })
}

// --- Pagination ----------------------------------------------------------

function onPageChange (page: number): void {
  emit('page-requested', page)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Loading skeleton: matches the table's column shape so real content
         never causes layout shift when it arrives. -->
    <div v-if="presentationMode === 'loading'" class="overflow-hidden rounded-token-md border border-border">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-border bg-surface-raised">
            <th v-if="hasSelection" class="w-10 p-(--table-cell-padding-y)" />
            <th
              v-for="column in visibleColumns"
              :key="column.key"
              class="p-(--table-cell-padding-y) px-3 text-left"
            >
              <el-skeleton-item variant="text" class="!w-2/3" />
            </th>
            <th v-if="hasActions" class="w-10 p-(--table-cell-padding-y)" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="skeletonRow in SKELETON_ROW_COUNT"
            :key="skeletonRow"
            class="border-b border-border-subtle last:border-b-0"
            style="height: var(--row-height)"
          >
            <td v-if="hasSelection" class="p-(--table-cell-padding-y) px-3">
              <el-skeleton-item variant="text" class="!size-4" />
            </td>
            <td
              v-for="column in visibleColumns"
              :key="column.key"
              class="p-(--table-cell-padding-y) px-3"
            >
              <el-skeleton-item variant="text" class="!w-4/5" />
            </td>
            <td v-if="hasActions" class="p-(--table-cell-padding-y) px-3">
              <el-skeleton-item variant="text" class="!w-6" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Error state: load failed, offer retry. -->
    <div
      v-else-if="presentationMode === 'error'"
      role="alert"
      class="flex flex-col items-center gap-3 rounded-token-md border border-border p-12 text-center"
    >
      <Icon name="alert-circle" class="size-8 text-danger" />
      <p class="text-label text-text-primary">Something went wrong while loading this list.</p>
      <p class="text-caption text-text-muted">Please try again.</p>
      <button
        type="button"
        class="mt-1 inline-flex items-center gap-1.5 rounded-token-md bg-accent px-3 py-1.5
          text-label text-white transition-colors hover:bg-accent-hover"
        @click="emit('retry-requested')"
      >
        <Icon name="retry" class="size-4" />
        Retry
      </button>
    </div>

    <!-- Empty states: three distinct reasons, three distinct affordances. -->
    <div
      v-else-if="presentationMode === 'empty'"
      class="flex flex-col items-center gap-3 rounded-token-md border border-border p-12 text-center"
    >
      <Icon name="inbox" class="size-8 text-text-muted" />

      <template v-if="emptyReason === 'no-data'">
        <p class="text-label text-text-primary">Nothing here yet.</p>
        <p class="text-caption text-text-muted">Create the first record to get started.</p>
        <button
          type="button"
          class="mt-1 inline-flex items-center gap-1.5 rounded-token-md bg-accent px-3 py-1.5
            text-label text-white transition-colors hover:bg-accent-hover"
          @click="emit('create-requested')"
        >
          <Icon name="plus" class="size-4" />
          Create
        </button>
      </template>

      <template v-else-if="emptyReason === 'no-matches'">
        <p class="text-label text-text-primary">No results match your filters.</p>
        <p class="text-caption text-text-muted">Try clearing them to see the full list.</p>
        <button
          type="button"
          class="mt-1 inline-flex items-center gap-1.5 rounded-token-md border border-border px-3 py-1.5
            text-label text-text-primary transition-colors hover:bg-surface-raised"
          @click="emit('clear-filters-requested')"
        >
          <Icon name="filter-off" class="size-4" />
          Clear filters
        </button>
      </template>
    </div>

    <template v-else>
      <!-- Selection hint: visible, not just an aria-label, so an
           administrator never mistakes "select all" for "select every
           filtered record" — the distinction PRD-007's bulk operations
           depend on. -->
      <p v-if="hasSelection" class="px-1 text-caption text-text-muted">
        Selecting applies to this page only ({{ pageRowKeys.length }} row{{ pageRowKeys.length === 1 ? '' : 's' }}).
      </p>

      <!-- Table presentation: tablet and above. -->
      <table
        v-if="presentationMode === 'table'"
        class="w-full border-collapse overflow-hidden rounded-token-md border border-border"
        :class="{ 'opacity-60': loading }"
      >
        <caption v-if="caption" class="sr-only">{{ caption }}</caption>
        <thead>
          <tr class="border-b border-border bg-surface-raised">
            <th v-if="hasSelection" class="w-10 p-(--table-cell-padding-y) px-3">
              <el-checkbox
                :model-value="allOnPageSelected"
                :indeterminate="someOnPageSelected"
                :aria-label="selectAllAriaLabel"
                @change="onSelectAllCheckboxChange"
              />
            </th>
            <th
              v-for="column in visibleColumns"
              :key="column.key"
              scope="col"
              class="p-(--table-cell-padding-y) px-3 text-label text-text-muted"
              :class="alignClass(column.align)"
              :aria-sort="ariaSortFor(column)"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="inline-flex items-center gap-1 rounded-token-sm text-label text-text-muted
                  transition-colors hover:text-text-primary"
                :class="{ 'text-text-primary': sort?.field === column.key }"
                @click="onHeaderActivate(column)"
              >
                {{ column.label }}
                <Icon :name="sortIcon(column)" class="size-3.5" />
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
            <th v-if="hasActions" class="w-10 p-(--table-cell-padding-y) px-3">
              <span class="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="rowKey(row)"
            class="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-surface-raised"
            :class="{ 'bg-accent/5': isRowSelected(row) }"
          >
            <td v-if="hasSelection" class="p-(--table-cell-padding-y) px-3">
              <el-checkbox
                :model-value="isRowSelected(row)"
                aria-label="Select row"
                @change="(value: IElementPlus['CheckboxValueType']) => onRowCheckboxChange(row, value)"
              />
            </td>
            <td
              v-for="column in visibleColumns"
              :key="column.key"
              class="p-(--table-cell-padding-y) px-3 text-body text-text-primary"
              :class="alignClass(column.align)"
            >
              <slot v-if="column.cellSlot" :name="`cell-${column.cellSlot}`" :row="row" :column="column">
                {{ cellValue(row, column) }}
              </slot>
              <template v-else>{{ cellValue(row, column) }}</template>
            </td>
            <td v-if="hasActions" class="p-(--table-cell-padding-y) px-3 text-right">
              <el-dropdown trigger="click" placement="bottom-end">
                <button
                  type="button"
                  class="inline-flex size-8 items-center justify-center rounded-token-sm text-text-muted
                    transition-colors hover:bg-surface hover:text-text-primary"
                  aria-label="Row actions"
                >
                  <Icon name="more" class="size-4" />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="action in rowActions"
                      :key="action.key"
                      :disabled="isActionDisabled(action, row)"
                      :class="{ '!text-danger': action.danger }"
                      @click="onRowAction(action, row)"
                    >
                      <Icon v-if="action.icon" :name="action.icon" class="mr-2 size-4" />
                      {{ action.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Card presentation: below the tablet breakpoint. Same descriptors,
           only `responsivePriority: 'high'` columns shown. -->
      <div v-else-if="presentationMode === 'cards'" class="flex flex-col gap-2" :class="{ 'opacity-60': loading }">
        <div v-if="hasSelection" class="flex items-center gap-2 px-1">
          <el-checkbox
            :model-value="allOnPageSelected"
            :indeterminate="someOnPageSelected"
            :aria-label="selectAllAriaLabel"
            @change="onSelectAllCheckboxChange"
          />
          <span class="text-caption text-text-muted">Select all on this page</span>
        </div>

        <div
          v-for="row in rows"
          :key="rowKey(row)"
          class="flex flex-col gap-2 rounded-token-md border border-border p-3 transition-colors
            hover:bg-surface-raised"
          :class="{ 'bg-accent/5': isRowSelected(row) }"
        >
          <div class="flex items-start justify-between gap-2">
            <el-checkbox
              v-if="hasSelection"
              :model-value="isRowSelected(row)"
              aria-label="Select row"
              @change="(value: IElementPlus['CheckboxValueType']) => onRowCheckboxChange(row, value)"
            />

            <div class="flex-1 flex flex-col gap-1">
              <div v-for="column in cardColumns" :key="column.key" class="flex flex-col">
                <span class="text-caption text-text-muted">{{ column.label }}</span>
                <span class="text-body text-text-primary">
                  <slot v-if="column.cellSlot" :name="`cell-${column.cellSlot}`" :row="row" :column="column">
                    {{ cellValue(row, column) }}
                  </slot>
                  <template v-else>{{ cellValue(row, column) }}</template>
                </span>
              </div>
            </div>

            <el-dropdown v-if="hasActions" trigger="click" placement="bottom-end">
              <button
                type="button"
                class="inline-flex size-8 items-center justify-center rounded-token-sm text-text-muted
                  transition-colors hover:bg-surface hover:text-text-primary"
                aria-label="Row actions"
              >
                <Icon name="more" class="size-4" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="action in rowActions"
                    :key="action.key"
                    :disabled="isActionDisabled(action, row)"
                    :class="{ '!text-danger': action.danger }"
                    @click="onRowAction(action, row)"
                  >
                    <Icon v-if="action.icon" :name="action.icon" class="mr-2 size-4" />
                    {{ action.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- Pagination: renders the `PaginationMeta` envelope directly. -->
      <div v-if="meta && meta.total > 0" class="flex items-center justify-between gap-3 pt-1">
        <p class="text-caption text-text-muted">{{ meta.total }} total</p>
        <el-pagination
          layout="prev, pager, next"
          :current-page="meta.page"
          :page-size="meta.perPage"
          :total="meta.total"
          @current-change="onPageChange"
        />
      </div>
    </template>
  </div>
</template>
