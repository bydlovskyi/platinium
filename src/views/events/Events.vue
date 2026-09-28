<script lang="ts" setup>
import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const router = useRouter()
const route = useRoute()
const { confirm } = useConfirm()
const { canDo } = useCapability()
const { isMobile } = useBreakpoint()
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

const {
  search,
  filters: listFilters,
  sort,
  page,
  setSearch,
  setFilter,
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
} = useEventsList()

const { leavingRowKeys, removeRows } = useRowRemoval({ rows: data, page, setPage, refetch })

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

function onBulkDeleteComplete (): Promise<void> {
  return removeRows(bulkResult.value?.succeeded ?? [])
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

// Re-throws on 409 so useConfirm keeps the dialog open.
async function deleteEvent (event: TEvent): Promise<void> {
  await confirm({
    subject: event.name,
    onConfirm: async () => {
      try {
        await eventsService.delete(event.id)
      } catch (error) {
        notifyDependencyConflict(error, { entity: 'event', to: { name: routeNames.tickets, query: { eventId: event.id } } })
        throw error
      }

      notificationService.success({ message: 'Event deleted.' })

      await removeRows([event.id])
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
    exportFn: params => eventsService.exportCsv(params),
    params: { ...query.value, page: undefined, perPage: undefined },
    total: meta.value?.total ?? 0
  }).catch(() => undefined)
}

function onSelectionChanged (keys: string[]): void {
  selectedIds.value = keys
}

const bulkResultNames = computed(() => Object.fromEntries(data.value.map(event => [event.id, event.name])))

function bulkBlockingLink (failure: TBulkFailure) {
  if (failure.code !== 'CONFLICT' || failure.count === undefined) {
    return undefined
  }

  return {
    to: { name: routeNames.tickets, query: { eventId: failure.id } },
    label: `View ${failure.count} ticket${failure.count === 1 ? '' : 's'}`
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Events">
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
      selectable
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

    <BulkResultDialog
      v-model="bulkResultVisible"
      :result="bulkResult"
      entity-label="event"
      :names="bulkResultNames"
      :blocking-link="bulkBlockingLink"
    />
  </div>
</template>
