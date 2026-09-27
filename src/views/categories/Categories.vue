<script lang="ts" setup>
import { DependencyConflictError } from '@/features/platform/api/interceptors/response.interceptor'

import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const route = useRoute()
const router = useRouter()

const {
  search,
  sort,
  page,
  setSearch,
  setSort,
  setPage,
  setPerPage,
  resetFilters,
  data,
  meta,
  loading,
  error,
  refetch,
  emptyReason
} = useCategoriesList()

const { openModal } = useModals()
const { confirm } = useConfirm()
const { canDo } = useCapability()
const {
  selectedIds,
  isRunning: bulkRunning,
  lastResult: bulkResult,
  clearSelection,
  runBulkOperation
} = useBulkOperations()
const { loading: csvExportLoading, exportCsv } = useCsvExport()
const { leavingRowKeys, playLeave } = useRowLeaveAnimation()

const columns: IDataTableColumn<TCategory>[] = [
  { key: 'name', label: 'Name', sortable: true, responsivePriority: 'high' },
  { key: 'description', label: 'Description', responsivePriority: 'low' }
]

// Only `name` is a column: passing a `createdAt` sort through would leave a stale header arrow in el-table.
const dataTableSort = computed(() => (
  sort.value?.field === 'name' ? { field: sort.value.field, order: sort.value.order } : undefined
))

// `createdAt` has no column, so this select drives its sort instead of a header click.
const NON_COLUMN_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' }
]

const nonColumnSortValue = computed<string | undefined>(() => (
  sort.value?.field === 'createdAt' ? `${sort.value.field}:${sort.value.order}` : undefined
))

// Writes sort/order to the URL directly: useListQuery's setSort only toggles, it can't set an exact order.
function onNonColumnSortChange (value: string | undefined): void {
  const query = { ...route.query, page: undefined }

  if (value === undefined) {
    void router.push({ query: { ...query, sort: undefined, order: undefined } })
    return
  }

  const [field, order] = value.split(':')

  void router.push({ query: { ...query, sort: field, order } })
}

function rowKey (row: TCategory): string {
  return row.id
}

const rowActions = computed<IDataTableRowAction<TCategory>[]>(() => {
  const actions: IDataTableRowAction<TCategory>[] = []

  if (canDo('categories', 'update')) {
    actions.push({ key: 'edit', label: 'Edit' })
  }

  if (canDo('categories', 'delete')) {
    actions.push({ key: 'delete', label: 'Delete', danger: true })
  }

  return actions
})

// Delete only: categories have no status, so bulk archive would always fail.
const canBulkDelete = computed(() => canDo('categories', 'delete'))

function selectionSubject (): string {
  const count = selectedIds.value.length
  return `${count} categor${count === 1 ? 'y' : 'ies'}`
}

async function onBulkDeleteComplete (): Promise<void> {
  const succeededIds = bulkResult.value?.succeeded ?? []
  const allVisibleRowsDeleted = data.value.length > 0 &&
    data.value.every(category => succeededIds.includes(category.id))

  await playLeave(succeededIds)

  if (allVisibleRowsDeleted && page.value > 1) {
    void setPage(page.value - 1)
  } else {
    void refetch()
  }
}

async function bulkDeleteCategories (): Promise<void> {
  await runBulkOperation('delete', {
    confirmSubject: selectionSubject(),
    bulk: body => categoriesService.bulk(body),
    onComplete: onBulkDeleteComplete
  })
}

async function deleteCategory (category: TCategory): Promise<void> {
  await confirm({
    subject: category.name,
    onConfirm: async () => {
      try {
        await categoriesService.delete(category.id)
      } catch (error) {
        if (error instanceof DependencyConflictError) {
          notificationService.error({
            title: 'Cannot delete category',
            message: `${error.count} ${error.entity}${error.count === 1 ? '' : 's'} reference this category and must be removed first.`
          })
        }

        throw error
      }

      notificationService.success({ message: 'Category deleted.' })

      await playLeave([category.id])

      if (data.value.length === 1 && page.value > 1) {
        void setPage(page.value - 1)
      } else {
        void refetch()
      }
    }
  })
}

function onRowAction ({ action, row }: { action: string; row: TCategory }): void {
  if (action === 'edit') {
    openModal('CategoryModal', { category: row, onSaved: refetch })
  } else if (action === 'delete') {
    void deleteCategory(row)
  }
}

function onCreateClicked (): void {
  openModal('CategoryModal', { category: undefined, onSaved: refetch })
}

function onExportCsvClicked (): void {
  // The interceptor already toasts failures; this only prevents an unhandled rejection.
  exportCsv({
    entity: 'categories',
    exportFn: (params, signal) => categoriesService.exportCsv(params, signal),
    params: {
      search: search.value || undefined,
      sort: sort.value?.field,
      order: sort.value?.order
    },
    total: meta.value?.total ?? 0
  }).catch(() => undefined)
}

function onSelectionChanged (keys: string[]): void {
  selectedIds.value = keys
}

const bulkResultVisible = computed({
  get: () => bulkResult.value !== undefined,
  set: (value: boolean) => {
    if (!value) {
      bulkResult.value = undefined
    }
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Categories">
      <template #actions>
        <el-button v-if="canDo('categories', 'create')" type="primary" @click="onCreateClicked">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create category
        </el-button>
      </template>
    </PageHeader>

    <ListToolbar
      :search="search"
      search-placeholder="Search by name or description…"
      @update:search="setSearch"
      @clear-all-requested="resetFilters"
    >
      <template #actions>
        <el-select
          :model-value="nonColumnSortValue"
          placeholder="Sort by"
          clearable
          class="!w-44"
          aria-label="Sort by creation date"
          @update:model-value="onNonColumnSortChange"
        >
          <el-option
            v-for="option in NON_COLUMN_SORT_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-button :loading="csvExportLoading" @click="onExportCsvClicked">
          Export CSV
        </el-button>
      </template>
    </ListToolbar>

    <AppDataTable
      :columns="columns"
      :rows="data"
      :row-key="rowKey"
      :meta="meta"
      :loading="loading"
      :error="error"
      :empty-reason="emptyReason"
      :sort="dataTableSort"
      :row-actions="rowActions"
      :can-create="canDo('categories', 'create')"
      selectable
      :selected-row-keys="selectedIds"
      :leaving-row-keys="leavingRowKeys"
      caption="Categories"
      @sort-requested="setSort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
      @row-action-invoked="onRowAction"
      @create-requested="onCreateClicked"
      @selection-changed="onSelectionChanged"
    />

    <el-affix v-if="selectedIds.length > 0" position="bottom" :offset="16">
      <el-card shadow="always" body-class="flex flex-wrap items-center gap-2 !py-3">
        <el-tag size="large">
          {{ selectedIds.length }} selected on this page
        </el-tag>

        <el-button
          v-if="canBulkDelete"
          type="danger"
          :loading="bulkRunning"
          @click="bulkDeleteCategories"
        >
          Delete
        </el-button>

        <el-button link @click="clearSelection">
          Clear selection
        </el-button>
      </el-card>
    </el-affix>

    <BulkResultDialog v-model="bulkResultVisible" :result="bulkResult" entity-label="category" />
  </div>
</template>
