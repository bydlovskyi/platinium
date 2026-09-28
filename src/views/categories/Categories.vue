<script lang="ts" setup>
import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const {
  search,
  sort,
  page,
  setSearch,
  setSort,
  applySort,
  setPage,
  setPerPage,
  resetFilters,
  data,
  meta,
  loading,
  error,
  refetch,
  query,
  emptyReason
} = useCategoriesList()

const { leavingRowKeys, removeRows } = useRowRemoval({ rows: data, page, setPage, refetch })

const { openModal } = useModals()
const { confirm } = useConfirm()
const { canDo } = useCapability()
const {
  selectedIds,
  isRunning: bulkRunning,
  lastResult: bulkResult,
  resultVisible: bulkResultVisible,
  clearSelection,
  runBulkOperation
} = useBulkOperations()
const { loading: csvExportLoading, exportCsv } = useCsvExport()
const { notifyDependencyConflict } = useDependencyConflictNotice()

const columns: IDataTableColumn<TCategory>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description' },
  { key: 'createdAt', label: 'Created', sortable: true, cellSlot: 'createdAt' }
]

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

function onBulkDeleteComplete (): Promise<void> {
  return removeRows(bulkResult.value?.succeeded ?? [])
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
        notifyDependencyConflict(error, { entity: 'category', to: { name: routeNames.tickets, query: { categoryId: category.id } } })
        throw error
      }

      notificationService.success({ message: 'Category deleted.' })

      await removeRows([category.id])
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
    exportFn: params => categoriesService.exportCsv(params),
    params: { ...query.value, page: undefined, perPage: undefined },
    total: meta.value?.total ?? 0
  }).catch(() => undefined)
}

function onSelectionChanged (keys: string[]): void {
  selectedIds.value = keys
}

const bulkResultNames = computed(() => Object.fromEntries(data.value.map(category => [category.id, category.name])))

function bulkBlockingLink (failure: TBulkFailure) {
  if (failure.code !== 'CONFLICT' || failure.count === undefined) {
    return undefined
  }

  return {
    to: { name: routeNames.tickets, query: { categoryId: failure.id } },
    label: `View ${failure.count} ticket${failure.count === 1 ? '' : 's'}`
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Categories">
      <template #actions>
        <el-button :loading="csvExportLoading" @click="onExportCsvClicked">
          Export CSV
        </el-button>

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
    />

    <AppDataTable
      :columns="columns"
      :rows="data"
      :row-key="rowKey"
      :meta="meta"
      :loading="loading"
      :error="error"
      :empty-reason="emptyReason"
      :sort="sort"
      :row-actions="rowActions"
      :can-create="canDo('categories', 'create')"
      selectable
      :selected-row-keys="selectedIds"
      :leaving-row-keys="leavingRowKeys"
      caption="Categories"
      @sort-requested="setSort"
      @sort-changed="applySort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
      @row-action-invoked="onRowAction"
      @create-requested="onCreateClicked"
      @selection-changed="onSelectionChanged"
    >
      <template #cell-createdAt="{ row }">
        {{ filters.formatDate((row as TCategory).createdAt) }}
      </template>
    </AppDataTable>

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

    <BulkResultDialog
      v-model="bulkResultVisible"
      :result="bulkResult"
      entity-label="category"
      :names="bulkResultNames"
      :blocking-link="bulkBlockingLink"
    />
  </div>
</template>
