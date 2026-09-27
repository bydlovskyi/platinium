<script lang="ts" setup generic="TRow extends Record<string, unknown>">
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
  /** Must be unique per row on the page — selection state is keyed by it. */
  rowKey: (row: TRow) => string
  meta?: TPaginationMeta
  loading?: boolean
  error?: unknown
  emptyReason?: TDataTableEmptyReason
  sort?: IDataTableSort
  rowActions?: IDataTableRowAction<TRow>[]
  selectable?: boolean
  selectedRowKeys?: string[]
  caption?: string
  pageSizes?: number[]
  canCreate?: boolean
  /** Keys animating out; the caller drops them from `rows` once the animation has played. */
  leavingRowKeys?: string[]
}>(), {
  meta: undefined,
  loading: false,
  error: undefined,
  emptyReason: 'none',
  sort: undefined,
  rowActions: () => [],
  selectable: false,
  selectedRowKeys: () => [],
  caption: undefined,
  pageSizes: () => [10, 20, 50, 100],
  canCreate: true,
  leavingRowKeys: () => []
})

const emit = defineEmits<{
  'sort-requested': [field: string]
  'page-requested': [page: number]
  'page-size-requested': [perPage: number]
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
  // `loading` before `error` so a retry-in-flight shows feedback instead of the stale error;
  // with rows already on hand that's the table/cards under a loading mask.
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

// The skeleton is the real `el-table` with placeholder rows, so columns match and nothing shifts on load.
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

// `el-table` renders its own body, so the leave animation goes through `row-class-name`, not `<TransitionGroup>`.

const leavingKeySet = computed(() => new Set(props.leavingRowKeys))

function rowClassName ({ row }: { row: TRow }): string {
  return leavingKeySet.value.has(props.rowKey(row)) ? 'app-table-row-leaving' : ''
}

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

const pageRowKeys = computed(() => props.rows.map(row => props.rowKey(row)))
const selectedSet = computed(() => new Set(props.selectedRowKeys))

const allOnPageSelected = computed(() => (
  pageRowKeys.value.length > 0 && pageRowKeys.value.every(key => selectedSet.value.has(key))
))
const someOnPageSelected = computed(() => (
  pageRowKeys.value.some(key => selectedSet.value.has(key)) && !allOnPageSelected.value
))

// `el-checkbox` doesn't forward `aria-describedby`, so the page-scope caveat goes in the
// select-all accessible name via a locale override scoped to this table.
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
    <div v-if="presentationMode === 'error'" role="alert" class="rounded-token-md border border-border">
      <el-result
        title="Something went wrong while loading this list."
        sub-title="Please try again."
      >
        <template #icon>
          <LoadFailedIllustration class="size-12 text-danger" />
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

    <div v-else-if="presentationMode === 'empty'" class="rounded-token-md border border-border">
      <el-empty
        v-if="emptyReason === 'no-data'"
        description="Nothing here yet. Create the first record to get started."
      >
        <template #image>
          <EmptyNoDataIllustration class="size-16 text-text-muted" />
        </template>
        <el-button v-if="canCreate" type="primary" @click="emit('create-requested')">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create
        </el-button>
      </el-empty>

      <el-empty v-else description="No results match your filters. Try clearing them to see the full list.">
        <template #image>
          <EmptyNoMatchesIllustration class="size-16 text-text-muted" />
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
      <!-- Visible (not just aria) so "select all" isn't mistaken for every filtered record. -->
      <p v-if="selectable && !isSkeleton" class="px-1 text-caption text-text-muted">
        Selecting applies to this page only ({{ pageRowKeys.length }} row{{ pageRowKeys.length === 1 ? '' : 's' }}).
      </p>

      <el-config-provider v-if="presentationMode === 'table' || isSkeleton" :locale="tableLocale">
        <el-table
          ref="tableRef"
          v-loading="loading && !isSkeleton"
          :data="tableRows"
          :row-key="tableRowKey"
          :default-sort="defaultSort"
          :row-class-name="rowClassName"
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

        <!-- Cards bypass `el-table`, so a real `<TransitionGroup>` can own the leave animation here. -->
        <TransitionGroup tag="div" class="contents" leave-active-class="app-table-row-leaving">
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
        </TransitionGroup>
      </div>

      <div v-if="meta && meta.total > 0 && !isSkeleton" class="flex justify-end pt-1">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :size="isMobile ? 'small' : 'default'"
          :pager-count="isMobile ? MOBILE_PAGER_COUNT : DESKTOP_PAGER_COUNT"
          :current-page="meta.page"
          :page-size="meta.perPage"
          :page-sizes="pageSizes"
          :total="meta.total"
          @current-change="(page: number) => emit('page-requested', page)"
          @size-change="(size: number) => emit('page-size-requested', size)"
        />
      </div>
    </template>
  </div>
</template>
