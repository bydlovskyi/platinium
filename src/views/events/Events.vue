<script lang="ts" setup>
import { DependencyConflictError } from '@/features/platform/api/interceptors/response.interceptor'

import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const router = useRouter()
const route = useRoute()
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

const {
  search,
  filters: listFilters,
  sort,
  page,
  setSearch,
  setFilter,
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
} = useEventsList()

const columns: IDataTableColumn<TEvent>[] = [
  { key: 'name', label: 'Name', sortable: true, responsivePriority: 'high' },
  { key: 'country', label: 'Country', responsivePriority: 'high', cellSlot: 'country' },
  { key: 'venue', label: 'Venue', responsivePriority: 'low' },
  { key: 'startDate', label: 'Dates', sortable: true, responsivePriority: 'high', cellSlot: 'dates' },
  { key: 'status', label: 'Status', sortable: true, responsivePriority: 'high', cellSlot: 'status' }
]

const dataTableSort = computed(() => (
  sort.value ? { field: sort.value.field, order: sort.value.order } : undefined
))

const activeFilters = computed(() => {
  const chips: { key: string; label: string }[] = []

  if (listFilters.status !== 'all') {
    chips.push({ key: 'status', label: `Status: ${listFilters.status}` })
  }

  if (listFilters.country !== '') {
    chips.push({ key: 'country', label: `Country: ${countries.getCountryName(listFilters.country)}` })
  }

  if (listFilters.startDateFrom !== '' || listFilters.startDateTo !== '') {
    chips.push({
      key: 'dateRange',
      label: `Dates: ${listFilters.startDateFrom ?? '…'} – ${listFilters.startDateTo ?? '…'}`
    })
  }

  return chips
})

const statusFilterOptions: { value: TEventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' }
]

const dateRangeModel = computed<[string, string] | null>({
  get: (): [string, string] | null => (
    listFilters.startDateFrom || listFilters.startDateTo
      ? [listFilters.startDateFrom, listFilters.startDateTo]
      : null
  ),
  set: (value: [string, string] | null) => {
    void setFilter('startDateFrom', value?.[0] ?? '')
    void setFilter('startDateTo', value?.[1] ?? '')
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

function rowKey (row: TEvent): string {
  return row.id
}

// Filtered, not disabled: AppDataTable renders rowActions as given, so this keeps viewer-forbidden actions out of the DOM.
const rowActions = computed<IDataTableRowAction<TEvent>[]>(() => {
  const actions: IDataTableRowAction<TEvent>[] = []

  if (canDo('events', 'update')) {
    actions.push({ key: 'edit', label: 'Edit' })
  }

  if (canDo('events', 'delete')) {
    actions.push({ key: 'delete', label: 'Delete', danger: true })
  }

  return actions
})

const canBulkDelete = computed(() => canDo('events', 'delete'))
const canBulkArchive = computed(() => canDo('events', 'update'))

function selectionSubject (): string {
  const count = selectedIds.value.length
  return `${count} event${count === 1 ? '' : 's'}`
}

async function onBulkDeleteComplete (): Promise<void> {
  const succeededIds = bulkResult.value?.succeeded ?? []
  const allVisibleRowsDeleted = data.value.length > 0 && data.value.every(event => succeededIds.includes(event.id))

  await playLeave(succeededIds)

  if (allVisibleRowsDeleted && page.value > 1) {
    void setPage(page.value - 1)
  } else {
    void refetch()
  }
}

async function bulkDeleteEvents (): Promise<void> {
  await runBulkOperation('delete', {
    confirmSubject: selectionSubject(),
    bulk: body => eventsService.bulk(body),
    onComplete: onBulkDeleteComplete
  })
}

async function bulkArchiveEvents (): Promise<void> {
  await runBulkOperation('archive', {
    confirmSubject: selectionSubject(),
    confirmMessage: `Archive ${selectionSubject()}? This sets their status to completed.`,
    confirmButtonText: 'Archive',
    danger: false,
    bulk: body => eventsService.bulk(body),
    onComplete: refetch
  })
}

// Re-throws on 409 so useConfirm keeps the dialog open; useListResource doesn't adjust the page itself.
async function deleteEvent (event: TEvent): Promise<void> {
  await confirm({
    subject: event.name,
    onConfirm: async () => {
      try {
        await eventsService.delete(event.id)
      } catch (error) {
        if (error instanceof DependencyConflictError) {
          notificationService.error({
            title: 'Cannot delete event',
            message: `${error.count} ${error.entity}${error.count === 1 ? '' : 's'} reference this event and must be removed first.`
          })
        }

        throw error
      }

      notificationService.success({ message: 'Event deleted.' })

      await playLeave([event.id])

      if (data.value.length === 1 && page.value > 1) {
        void setPage(page.value - 1)
      } else {
        void refetch()
      }
    }
  })
}

function onRowAction ({ action, row }: { action: string; row: TEvent }): void {
  if (action === 'edit') {
    void router.push({ name: routeNames.eventEdit, params: { id: row.id }, query: { from: route.fullPath } })
  } else if (action === 'delete') {
    void deleteEvent(row)
  }
}

function onCreateClicked (): void {
  void router.push({ name: routeNames.eventCreate, query: { from: route.fullPath } })
}

function onExportCsvClicked (): void {
  // The interceptor already toasts failures; this only prevents an unhandled rejection.
  exportCsv({
    entity: 'events',
    exportFn: (params, signal) => eventsService.exportCsv(params, signal),
    params: {
      search: search.value ?? undefined,
      status: listFilters.status === 'all' ? undefined : listFilters.status,
      country: listFilters.country ?? undefined,
      startDateFrom: listFilters.startDateFrom ?? undefined,
      startDateTo: listFilters.startDateTo ?? undefined,
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
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-heading text-text-primary">
        Events
      </h1>
    </div>

    <ListToolbar
      :search="search"
      :active-filters="activeFilters"
      search-placeholder="Search by name or venue…"
      @update:search="setSearch"
      @filter-removed="onFilterRemoved"
      @clear-all-requested="resetFilters"
    >
      <template #filters>
        <el-select
          :model-value="listFilters.status"
          placeholder="Status"
          class="!w-40"
          aria-label="Filter by status"
          @update:model-value="(value: TEventStatus | 'all') => setFilter('status', value)"
        >
          <el-option label="All statuses" value="all" />
          <el-option
            v-for="option in statusFilterOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-select
          :model-value="listFilters.country || undefined"
          placeholder="Country"
          clearable
          class="!w-48"
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

        <el-date-picker
          v-model="dateRangeModel"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="Start date"
          end-placeholder="End date"
          aria-label="Filter by date range"
          class="!w-72"
        />
      </template>

      <template #actions>
        <el-button :loading="csvExportLoading" @click="onExportCsvClicked">
          Export CSV
        </el-button>

        <el-button v-if="canDo('events', 'create')" type="primary" @click="onCreateClicked">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create event
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
      selectable
      :selected-row-keys="selectedIds"
      :leaving-row-keys="leavingRowKeys"
      caption="Events"
      @sort-requested="setSort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
      @row-action-invoked="onRowAction"
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

    <el-affix v-if="selectedIds.length > 0" position="bottom" :offset="16">
      <el-card shadow="always" body-class="flex flex-wrap items-center gap-2 !py-3">
        <el-tag size="large">
          {{ selectedIds.length }} selected on this page
        </el-tag>

        <el-button
          v-if="canBulkDelete"
          type="danger"
          :loading="bulkRunning"
          @click="bulkDeleteEvents"
        >
          Delete
        </el-button>

        <el-button
          v-if="canBulkArchive"
          :loading="bulkRunning"
          @click="bulkArchiveEvents"
        >
          Archive
        </el-button>

        <el-button link @click="clearSelection">
          Clear selection
        </el-button>
      </el-card>
    </el-affix>

    <BulkResultDialog v-model="bulkResultVisible" :result="bulkResult" entity-label="event" />
  </div>
</template>
