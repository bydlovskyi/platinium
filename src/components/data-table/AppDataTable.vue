<script lang="ts" setup generic="TRow extends Record<string, unknown>">
/**
 * Global, descriptor-driven data table (GitHub issue #23, PRD-003 "Data
 * table component (deep module)"). Every future entity screen (events,
 * categories, tickets) configures this with column descriptors instead of
 * writing table markup three times.
 *
 * It wraps Element Plus rather than replacing it (docs/prd/ELEMENT-PLUS.md):
 * `el-table` owns the table presentation, the three-state sort cycle and
 * `aria-sort`, and the selection column; `el-skeleton`, `el-empty`,
 * `el-result`, `el-card`, `el-dropdown` and `el-pagination` cover the rest.
 * What this component adds is the descriptor vocabulary, the mobile card
 * switch and keeping `el-table`'s internal sort/selection state mirrored
 * from props, because the URL (via `useListQuery`) is the source of truth.
 *
 * This component holds no fetching logic and no entity knowledge — it
 * consumes `data`/`meta`/`loading`/`error` exactly as `useListResource`
 * exposes them, and emits intent only (`sort-requested`, `page-requested`,
 * `row-action-invoked`, `selection-changed`).
 */
import en from 'element-plus/es/locale/lang/en'

import type { TableInstance } from 'element-plus'

import type {
  IDataTableColumn,
  IDataTableRowAction,
  IDataTableSort,
  TDataTableEmptyReason
} from './data-table.types'

const SKELETON_ROW_COUNT = 5
const MOBILE_PAGER_COUNT = 5
const DESKTOP_PAGER_COUNT = 7

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

const tableRef = ref<TableInstance>()

const cardColumns = computed(() => props.columns.filter(column => column.responsivePriority === 'high'))
const hasActions = computed(() => props.rowActions.length > 0)

type TPresentationMode = 'loading' | 'error' | 'empty' | 'table' | 'cards'

const presentationMode = computed<TPresentationMode>(() => {
  // `loading` is checked before `error` so a retry-in-flight (loading again
  // while a previous attempt's error is still on the props, before the
  // caller clears it) shows feedback instead of freezing on the stale error
  // panel. With no rows yet that's the skeleton; with rows already on hand
  // it's the same table/cards under a loading mask.
  if (props.loading) {
    return props.rows.length === 0 ? 'loading' : (isMobile.value ? 'cards' : 'table')
  }

  if (props.error) {
    return 'error'
  }

  if (props.rows.length === 0 && props.emptyReason !== 'none') {
    return 'empty'
  }

  return isMobile.value ? 'cards' : 'table'
})

// --- Skeleton ----------------------------------------------------------------
// The first-load skeleton is the real `el-table` fed placeholder rows whose
// cells render `el-skeleton-item`, so it has exactly the columns and widths
// the loaded table will have — no layout shift when content arrives.

const SKELETON_KEY_PREFIX = '__skeleton-'

const isSkeleton = computed(() => presentationMode.value === 'loading')

const skeletonRows = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => ({ [SKELETON_KEY_PREFIX]: index }) as unknown as TRow
)

const tableRows = computed(() => (isSkeleton.value ? skeletonRows : props.rows))

function tableRowKey (row: TRow): string {
  return isSkeleton.value ? `${SKELETON_KEY_PREFIX}${String(row[SKELETON_KEY_PREFIX])}` : props.rowKey(row)
}

// --- Sort --------------------------------------------------------------------

const EL_SORT_ORDER = { asc: 'ascending', desc: 'descending' } as const

const defaultSort = computed(() => (
  props.sort ? { prop: props.sort.field, order: EL_SORT_ORDER[props.sort.order] } : undefined
))

// `el-table.sort()` re-emits `sort-change`; this guard stops a prop-driven
// resync from being read back as a user request.
let isSyncingSort = false

function syncSortFromProps (): void {
  const table = tableRef.value

  if (!table) {
    return
  }

  if (!props.sort) {
    table.clearSort()
    return
  }

  isSyncingSort = true
  table.sort(props.sort.field, EL_SORT_ORDER[props.sort.order])
  isSyncingSort = false
}

watch(() => props.sort, syncSortFromProps, { deep: true, flush: 'post' })

function onSortChange ({ prop }: { prop: string | null }): void {
  if (isSyncingSort || !prop) {
    return
  }

  emit('sort-requested', prop)
}

// --- Selection (page-scoped) ------------------------------------------------

const pageRowKeys = computed(() => props.rows.map(row => props.rowKey(row)))
const selectedSet = computed(() => new Set(props.selectedRowKeys))

const allOnPageSelected = computed(() => (
  pageRowKeys.value.length > 0 && pageRowKeys.value.every(key => selectedSet.value.has(key))
))
const someOnPageSelected = computed(() => (
  pageRowKeys.value.some(key => selectedSet.value.has(key)) && !allOnPageSelected.value
))

// `el-table` labels its header checkbox from the locale and `el-checkbox`
// never forwards `aria-describedby` to its inner `<input>`, so the
// page-scope caveat travels in the accessible name through a locale
// override scoped to this table.
const selectAllAriaLabel = computed(() => (
  `Select all ${pageRowKeys.value.length} row${pageRowKeys.value.length === 1 ? '' : 's'} on this page`
))

const tableLocale = computed(() => ({
  ...en,
  el: {
    ...en.el,
    table: { ...en.el.table, selectAllLabel: selectAllAriaLabel.value }
  }
}))

function isRowSelected (row: TRow): boolean {
  return selectedSet.value.has(props.rowKey(row))
}

/** Keys selected on other pages survive a change made on this one. */
function emitPageSelection (selectedOnPage: string[]): void {
  const pageKeys = new Set(pageRowKeys.value)
  const offPage = props.selectedRowKeys.filter(key => !pageKeys.has(key))

  emit('selection-changed', [...offPage, ...selectedOnPage])
}

function onTableSelectionChange (selection: TRow[]): void {
  if (isSkeleton.value) {
    return
  }

  emitPageSelection(selection.map(row => props.rowKey(row)))
}

// `toggleRowSelection` does not emit `selection-change`, so mirroring the
// prop into the table never echoes back as a user change.
function syncSelectionFromProps (): void {
  const table = tableRef.value

  if (!table || !props.selectable || isSkeleton.value) {
    return
  }

  props.rows.forEach(row => table.toggleRowSelection(row, isRowSelected(row)))
}

watch([() => props.selectedRowKeys, () => props.rows, tableRef], syncSelectionFromProps, { flush: 'post' })

function toggleCardRow (row: TRow, value: IElementPlus['CheckboxValueType']): void {
  const key = props.rowKey(row)
  const others = pageRowKeys.value.filter(pageKey => pageKey !== key && selectedSet.value.has(pageKey))

  emitPageSelection(value ? [...others, key] : others)
}

function toggleCardSelectAll (value: IElementPlus['CheckboxValueType']): void {
  emitPageSelection(value ? pageRowKeys.value : [])
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
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Load failed: a condition with a way forward, not a crash. -->
    <div v-if="presentationMode === 'error'" role="alert" class="rounded-token-md border border-border">
      <el-result
        title="Something went wrong while loading this list."
        sub-title="Please try again."
      >
        <template #icon>
          <Icon name="alert-circle" class="size-12 text-danger" />
        </template>
        <template #extra>
          <el-button type="primary" @click="emit('retry-requested')">
            <template #icon>
              <Icon name="retry" />
            </template>
            Retry
          </el-button>
        </template>
      </el-result>
    </div>

    <!-- Empty states: distinct reasons, distinct affordances. -->
    <div v-else-if="presentationMode === 'empty'" class="rounded-token-md border border-border">
      <el-empty
        v-if="emptyReason === 'no-data'"
        description="Nothing here yet. Create the first record to get started."
      >
        <template #image>
          <Icon name="inbox" class="size-16 text-text-muted" />
        </template>
        <el-button type="primary" @click="emit('create-requested')">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create
        </el-button>
      </el-empty>

      <el-empty v-else description="No results match your filters. Try clearing them to see the full list.">
        <template #image>
          <Icon name="filter-off" class="size-16 text-text-muted" />
        </template>
        <el-button @click="emit('clear-filters-requested')">
          <template #icon>
            <Icon name="filter-off" />
          </template>
          Clear filters
        </el-button>
      </el-empty>
    </div>

    <template v-else>
      <!-- Selection hint: visible, not just an aria-label, so an
           administrator never mistakes "select all" for "select every
           filtered record" — the distinction PRD-007's bulk operations
           depend on. -->
      <p v-if="selectable && !isSkeleton" class="px-1 text-caption text-text-muted">
        Selecting applies to this page only ({{ pageRowKeys.length }} row{{ pageRowKeys.length === 1 ? '' : 's' }}).
      </p>

      <!-- Table presentation: tablet and above, and the first-load skeleton. -->
      <el-config-provider v-if="presentationMode === 'table' || isSkeleton" :locale="tableLocale">
        <el-table
          ref="tableRef"
          v-loading="loading && !isSkeleton"
          :data="tableRows"
          :row-key="tableRowKey"
          :default-sort="defaultSort"
          :aria-label="caption"
          @sort-change="onSortChange"
          @selection-change="onTableSelectionChange"
        >
          <el-table-column
            v-if="selectable"
            type="selection"
            width="48"
            :selectable="() => !isSkeleton"
          />

          <el-table-column
            v-for="column in columns"
            :key="column.key"
            :prop="column.key"
            :label="column.label"
            :align="column.align ?? 'left'"
            :sortable="column.sortable ? 'custom' : false"
          >
            <template #default="{ row }">
              <el-skeleton-item v-if="isSkeleton" variant="text" class="!w-4/5" />
              <slot
                v-else-if="column.cellSlot"
                :name="`cell-${column.cellSlot}`"
                :row="row"
                :column="column"
              >
                {{ row[column.key] }}
              </slot>
              <template v-else>{{ row[column.key] }}</template>
            </template>
          </el-table-column>

          <el-table-column v-if="hasActions" width="64" align="right">
            <template #header>
              <span class="sr-only">Row actions</span>
            </template>
            <template #default="{ row }">
              <el-skeleton-item v-if="isSkeleton" variant="text" class="!w-6" />
              <el-dropdown v-else trigger="click" placement="bottom-end">
                <el-button text circle aria-label="Row actions">
                  <template #icon>
                    <Icon name="more" />
                  </template>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="action in rowActions"
                      :key="action.key"
                      :disabled="isActionDisabled(action, row)"
                      :divided="action.danger"
                      :class="{ '!text-danger': action.danger }"
                      @click="onRowAction(action, row)"
                    >
                      <Icon v-if="action.icon" :name="action.icon" class="mr-2 size-4" />
                      {{ action.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </el-config-provider>

      <!-- Card presentation: below the tablet breakpoint. Same descriptors,
           only `responsivePriority: 'high'` columns shown. -->
      <div
        v-else-if="presentationMode === 'cards'"
        v-loading="loading"
        class="flex flex-col gap-2"
      >
        <div v-if="selectable" class="px-1">
          <el-checkbox
            :model-value="allOnPageSelected"
            :indeterminate="someOnPageSelected"
            :aria-label="selectAllAriaLabel"
            @change="toggleCardSelectAll"
          >
            Select all on this page
          </el-checkbox>
        </div>

        <el-card
          v-for="row in rows"
          :key="rowKey(row)"
          shadow="never"
          body-class="flex items-start justify-between gap-2 !p-3"
        >
          <el-checkbox
            v-if="selectable"
            :model-value="isRowSelected(row)"
            aria-label="Select this row"
            @change="(value: IElementPlus['CheckboxValueType']) => toggleCardRow(row, value)"
          />

          <div class="flex flex-1 flex-col gap-1">
            <div v-for="column in cardColumns" :key="column.key" class="flex flex-col">
              <span class="text-caption text-text-muted">{{ column.label }}</span>
              <span class="text-body text-text-primary">
                <slot v-if="column.cellSlot" :name="`cell-${column.cellSlot}`" :row="row" :column="column">
                  {{ row[column.key] }}
                </slot>
                <template v-else>{{ row[column.key] }}</template>
              </span>
            </div>
          </div>

          <el-dropdown v-if="hasActions" trigger="click" placement="bottom-end">
            <el-button text circle aria-label="Row actions">
              <template #icon>
                <Icon name="more" />
              </template>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="action in rowActions"
                  :key="action.key"
                  :disabled="isActionDisabled(action, row)"
                  :divided="action.danger"
                  :class="{ '!text-danger': action.danger }"
                  @click="onRowAction(action, row)"
                >
                  <Icon v-if="action.icon" :name="action.icon" class="mr-2 size-4" />
                  {{ action.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-card>
      </div>

      <!-- Pagination: renders the `PaginationMeta` envelope directly. -->
      <div v-if="meta && meta.total > 0 && !isSkeleton" class="flex justify-end pt-1">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :size="isMobile ? 'small' : 'default'"
          :pager-count="isMobile ? MOBILE_PAGER_COUNT : DESKTOP_PAGER_COUNT"
          :current-page="meta.page"
          :page-size="meta.perPage"
          :total="meta.total"
          @current-change="(page: number) => emit('page-requested', page)"
        />
      </div>
    </template>
  </div>
</template>
