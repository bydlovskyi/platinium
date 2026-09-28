<script lang="ts" setup>
import type { IDataTableColumn } from '@/components/data-table/data-table.types'

const { openModal } = useModals()

const list = useCategoriesList()
const {
  search,
  sort,
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
  emptyReason
} = list

const {
  canCreate,
  canSelectRows,
  canBulkDelete,
  rowKey,
  rowActions,
  selectedIds,
  bulkRunning,
  bulkResult,
  bulkResultVisible,
  bulkResultNames,
  bulkBlockingLink,
  clearSelection,
  leavingRowKeys,
  bulkDelete,
  deleteRow,
  csvExportLoading,
  exportCsv,
  onSelectionChanged
} = useEntityListPage<TCategory, typeof list.query.value>({
  entity: 'categories',
  label: { singular: 'category', plural: 'categories' },
  list,
  service: categoriesService,
  // No archive: categories have no status.
  blockingRecordsRoute: id => ({ name: routeNames.tickets, query: { categoryId: id } })
})

const columns: IDataTableColumn<TCategory>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description' },
  { key: 'createdAt', label: 'Created', sortable: true, cellSlot: 'createdAt' }
]

function onRowAction ({ action, row }: { action: string; row: TCategory }): void {
  if (action === 'edit') {
    openModal('CategoryModal', { category: row, onSaved: refetch })
  } else if (action === 'delete') {
    void deleteRow(row)
  }
}

function onCreateClicked (): void {
  openModal('CategoryModal', { category: undefined, onSaved: refetch })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Categories">
      <template #actions>
        <el-button :loading="csvExportLoading" @click="exportCsv">
          Export CSV
        </el-button>

        <el-button v-if="canCreate" type="primary" @click="onCreateClicked">
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
      :can-create="canCreate"
      :selectable="canSelectRows"
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

    <BulkActionBar
      :selected-count="selectedIds.length"
      :can-delete="canBulkDelete"
      :running="bulkRunning"
      @delete-requested="bulkDelete"
      @clear-requested="clearSelection"
    />

    <BulkResultDialog
      v-model="bulkResultVisible"
      :result="bulkResult"
      entity-label="category"
      :names="bulkResultNames"
      :blocking-link="bulkBlockingLink"
    />
  </div>
</template>
