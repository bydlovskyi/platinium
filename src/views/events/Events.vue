<script lang="ts" setup>
import type { IDataTableColumn } from '@/components/data-table/data-table.types'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

const list = useEventsList()
const {
  search,
  filters: listFilters,
  sort,
  setSearch,
  setFilter,
  setFilters,
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
  canBulkArchive,
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
  bulkArchive,
  deleteRow,
  csvExportLoading,
  exportCsv,
  onSelectionChanged
} = useEntityListPage<TEvent, typeof list.query.value>({
  entity: 'events',
  label: { singular: 'event', plural: 'events' },
  list,
  service: eventsService,
  archive: { message: 'This sets their status to completed.' },
  blockingRecordsRoute: id => ({ name: routeNames.tickets, query: { eventId: id } })
})

const columns: IDataTableColumn<TEvent>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'country', label: 'Country', cellSlot: 'country' },
  { key: 'venue', label: 'Venue' },
  { key: 'startDate', label: 'Dates', sortable: true, cellSlot: 'dates' },
  { key: 'status', label: 'Status', sortable: true, cardRole: 'badge', cellSlot: 'status' }
]

const activeFilters = computed(() => {
  const chips: { key: string; label: string }[] = []

  if (listFilters.status !== 'all') {
    chips.push({ key: 'status', label: `Status: ${STATUS_PRESENTATION[listFilters.status].label}` })
  }

  if (listFilters.country !== '') {
    chips.push({ key: 'country', label: `Country: ${countries.getCountryName(listFilters.country)}` })
  }

  if (listFilters.startDateFrom !== '' || listFilters.startDateTo !== '') {
    chips.push({
      key: 'dateRange',
      label: `Dates: ${listFilters.startDateFrom || '…'} – ${listFilters.startDateTo || '…'}`
    })
  }

  return chips
})

const dateRangeModel = computed<[string, string] | null>({
  get: (): [string, string] | null => (
    listFilters.startDateFrom || listFilters.startDateTo
      ? [listFilters.startDateFrom, listFilters.startDateTo]
      : null
  ),
  set: (value: [string, string] | null) => {
    void setFilters({ startDateFrom: value?.[0] ?? '', startDateTo: value?.[1] ?? '' })
  }
})

function onFilterRemoved (key: string): void {
  if (key === 'status') {
    void setFilter('status', 'all')
  } else if (key === 'country') {
    void setFilter('country', '')
  } else if (key === 'dateRange') {
    dateRangeModel.value = null
  }
}

function onRowAction ({ action, row }: { action: string; row: TEvent }): void {
  if (action === 'edit') {
    void router.push({ name: routeNames.eventEdit, params: { id: row.id }, query: { from: route.fullPath } })
  } else if (action === 'delete') {
    void deleteRow(row)
  }
}

function onCreateClicked (): void {
  void router.push({ name: routeNames.eventCreate, query: { from: route.fullPath } })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Events">
      <template #actions>
        <el-button :loading="csvExportLoading" @click="exportCsv">
          Export CSV
        </el-button>

        <el-button v-if="canCreate" type="primary" @click="onCreateClicked">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create event
        </el-button>
      </template>
    </PageHeader>

    <ListToolbar
      :search="search"
      :active-filters="activeFilters"
      search-placeholder="Search by name or venue…"
      @update:search="setSearch"
      @filter-removed="onFilterRemoved"
      @clear-all-requested="resetFilters"
    >
      <template #filters>
        <ListFilterField label="Status" class="w-40">
          <el-select
            :model-value="listFilters.status"
            placeholder="Status"
            class="!w-full"
            aria-label="Filter by status"
            @update:model-value="(value: TEventStatus | 'all') => setFilter('status', value)"
          >
            <el-option label="All statuses" value="all" />
            <el-option
              v-for="status in EVENT_STATUSES"
              :key="status"
              :label="STATUS_PRESENTATION[status].label"
              :value="status"
            />
          </el-select>
        </ListFilterField>

        <ListFilterField label="Country" class="w-48">
          <el-select
            :model-value="listFilters.country || undefined"
            placeholder="Country"
            clearable
            class="!w-full"
            aria-label="Filter by country"
            @update:model-value="(value: string | undefined) => setFilter('country', value ?? '')"
          >
            <el-option
              v-for="option in countries.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </ListFilterField>

        <template v-if="isMobile">
          <ListFilterField label="From">
            <el-date-picker
              :model-value="listFilters.startDateFrom || undefined"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="Start date"
              aria-label="Filter by start date from"
              class="!w-full"
              @update:model-value="(value: string | null) => setFilter('startDateFrom', value ?? '')"
            />
          </ListFilterField>

          <ListFilterField label="To">
            <el-date-picker
              :model-value="listFilters.startDateTo || undefined"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="End date"
              aria-label="Filter by start date to"
              class="!w-full"
              @update:model-value="(value: string | null) => setFilter('startDateTo', value ?? '')"
            />
          </ListFilterField>
        </template>

        <ListFilterField v-else label="Dates" class="w-72">
          <el-date-picker
            v-model="dateRangeModel"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="Start date"
            end-placeholder="End date"
            aria-label="Filter by date range"
            class="!w-full"
          />
        </ListFilterField>
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
      :sort="sort"
      :row-actions="rowActions"
      :can-create="canCreate"
      :selectable="canSelectRows"
      :selected-row-keys="selectedIds"
      :leaving-row-keys="leavingRowKeys"
      caption="Events"
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
      <template #cell-country="{ row }">
        {{ countries.getCountryName((row as TEvent).country) }}
      </template>

      <template #cell-dates="{ row }">
        {{ filters.formatDateRange((row as TEvent).startDate, (row as TEvent).endDate) }}
      </template>

      <template #cell-status="{ row }">
        <StatusTag :status="(row as TEvent).status" />
      </template>
    </AppDataTable>

    <BulkActionBar
      :selected-count="selectedIds.length"
      :can-delete="canBulkDelete"
      :can-archive="canBulkArchive"
      :running="bulkRunning"
      @delete-requested="bulkDelete"
      @archive-requested="bulkArchive"
      @clear-requested="clearSelection"
    />

    <BulkResultDialog
      v-model="bulkResultVisible"
      :result="bulkResult"
      entity-label="event"
      :names="bulkResultNames"
      :blocking-link="bulkBlockingLink"
    />
  </div>
</template>
