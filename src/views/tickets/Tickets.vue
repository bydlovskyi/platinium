<script lang="ts" setup>
import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const route = useRoute()
const router = useRouter()
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
  appliedSearch,
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
} = useTicketsList()

// AppDataTable's mobile card only renders `high` columns.
const columns: IDataTableColumn<TTicket>[] = [
  { key: 'name', label: 'Name', sortable: true, responsivePriority: 'high' },
  { key: 'price', label: 'Price', sortable: true, responsivePriority: 'high', align: 'right', cellSlot: 'price' },
  { key: 'quantity', label: 'Quantity', sortable: true, responsivePriority: 'low', align: 'right', cellSlot: 'quantity' },
  { key: 'status', label: 'Status', sortable: true, responsivePriority: 'high', cardRole: 'badge', cellSlot: 'status' },
  { key: 'eventName', label: 'Event', responsivePriority: 'low' },
  { key: 'categoryName', label: 'Category', responsivePriority: 'low' },
  { key: 'createdAt', label: 'Created', sortable: true, responsivePriority: 'low', cellSlot: 'createdAt' }
]

const dataTableSort = computed(() => (
  sort.value ? { field: sort.value.field, order: sort.value.order } : undefined
))

const STATUS_FILTER_OPTIONS: { value: TTicketStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'on_sale', label: 'On sale' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'archived', label: 'Archived' }
]

const CURRENCY_FILTER_OPTIONS: { value: TCurrency; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' }
]

// resolveOption lets a deep-linked id show a name before any options are loaded.

async function fetchEventOptions ({ search: term, page: pageNumber }: { search: string; page: number }) {
  return eventsService.list({ search: term, page: pageNumber })
}

function resolveEventOption (id: string): Promise<TEvent> {
  return eventsService.get(id)
}

async function fetchCategoryOptions ({ search: term, page: pageNumber }: { search: string; page: number }) {
  return categoriesService.list({ search: term, page: pageNumber })
}

function resolveCategoryOption (id: string): Promise<TCategory> {
  return categoriesService.get(id)
}

const eventFilterModel = computed<string | undefined>({
  get: () => listFilters.eventId || undefined,
  set: (value) => {
    void setFilter('eventId', value ?? '')
  }
})

const categoryFilterModel = computed<string | undefined>({
  get: () => listFilters.categoryId || undefined,
  set: (value) => {
    void setFilter('categoryId', value ?? '')
  }
})

// URL/request state is integer minor units; the inputs show whole-currency amounts.
const priceMinModel = computed<number | undefined>({
  get: () => (listFilters.priceMin === undefined ? undefined : minorUnitsToPriceFilter(listFilters.priceMin)),
  set: (value) => {
    void setFilter('priceMin', value === undefined ? undefined : priceFilterToMinorUnits(value))
  }
})

const priceMaxModel = computed<number | undefined>({
  get: () => (listFilters.priceMax === undefined ? undefined : minorUnitsToPriceFilter(listFilters.priceMax)),
  set: (value) => {
    void setFilter('priceMax', value === undefined ? undefined : priceFilterToMinorUnits(value))
  }
})

const activeFilters = computed(() => {
  const chips: { key: string; label: string }[] = []

  if (listFilters.eventId !== '') {
    chips.push({ key: 'eventId', label: `Event: ${eventChipLabel.value}` })
  }

  if (listFilters.categoryId !== '') {
    chips.push({ key: 'categoryId', label: `Category: ${categoryChipLabel.value}` })
  }

  if (listFilters.status !== 'all') {
    chips.push({ key: 'status', label: `Status: ${STATUS_FILTER_OPTIONS.find(option => option.value === listFilters.status)?.label ?? listFilters.status}` })
  }

  if (listFilters.currency !== 'all') {
    chips.push({ key: 'currency', label: `Currency: ${listFilters.currency}` })
  }

  if (listFilters.priceMin !== undefined || listFilters.priceMax !== undefined) {
    const minLabel = priceMinModel.value ?? '…'
    const maxLabel = priceMaxModel.value ?? '…'
    chips.push({ key: 'priceRange', label: `Price: ${minLabel} – ${maxLabel}` })
  }

  return chips
})

const eventChipLabel = ref('…')
const categoryChipLabel = ref('…')

watch(() => listFilters.eventId, async (id) => {
  if (id === '') {
    return
  }

  eventChipLabel.value = '…'

  try {
    const event = await eventsService.get(id, { showNotification: false })
    eventChipLabel.value = event.name
  } catch {
    eventChipLabel.value = 'Unknown'
  }
}, { immediate: true })

watch(() => listFilters.categoryId, async (id) => {
  if (id === '') {
    return
  }

  categoryChipLabel.value = '…'

  try {
    const category = await categoriesService.get(id)
    categoryChipLabel.value = category.name
  } catch {
    categoryChipLabel.value = 'Unknown'
  }
}, { immediate: true })

function onFilterRemoved (key: string): void {
  if (key === 'eventId') {
    void setFilter('eventId', '')
  } else if (key === 'categoryId') {
    void setFilter('categoryId', '')
  } else if (key === 'status') {
    void setFilter('status', 'all')
  } else if (key === 'currency') {
    void setFilter('currency', 'all')
  } else if (key === 'priceRange') {
    void setFilter('priceMin', undefined)
    void setFilter('priceMax', undefined)
  }
}

function rowKey (row: TTicket): string {
  return row.id
}

const rowActions = computed<IDataTableRowAction<TTicket>[]>(() => {
  const actions: IDataTableRowAction<TTicket>[] = []

  if (canDo('tickets', 'update')) {
    actions.push({ key: 'edit', label: 'Edit' })
  }

  if (canDo('tickets', 'delete')) {
    actions.push({ key: 'delete', label: 'Delete', danger: true })
  }

  return actions
})

const canBulkDelete = computed(() => canDo('tickets', 'delete'))
const canBulkArchive = computed(() => canDo('tickets', 'update'))

function selectionSubject (): string {
  const count = selectedIds.value.length
  return `${count} ticket${count === 1 ? '' : 's'}`
}

async function onBulkDeleteComplete (): Promise<void> {
  const succeededIds = bulkResult.value?.succeeded ?? []
  const allVisibleRowsDeleted = data.value.length > 0 && data.value.every(ticket => succeededIds.includes(ticket.id))

  await playLeave(succeededIds)

  if (allVisibleRowsDeleted && page.value > 1) {
    void setPage(page.value - 1)
  } else {
    void refetch()
  }
}

async function bulkDeleteTickets (): Promise<void> {
  await runBulkOperation('delete', {
    confirmSubject: selectionSubject(),
    bulk: body => ticketsService.bulk(body),
    onComplete: onBulkDeleteComplete
  })
}

async function bulkArchiveTickets (): Promise<void> {
  await runBulkOperation('archive', {
    confirmSubject: selectionSubject(),
    confirmMessage: `Archive ${selectionSubject()}? This sets their status to archived.`,
    confirmButtonText: 'Archive',
    danger: false,
    bulk: body => ticketsService.bulk(body),
    onComplete: refetch
  })
}

// Tickets are leaves: no DependencyConflictError is possible here.
async function deleteTicket (ticket: TTicket): Promise<void> {
  await confirm({
    subject: ticket.name,
    onConfirm: async () => {
      await ticketsService.delete(ticket.id)

      notificationService.success({ message: 'Ticket deleted.' })

      await playLeave([ticket.id])

      if (data.value.length === 1 && page.value > 1) {
        void setPage(page.value - 1)
      } else {
        void refetch()
      }
    }
  })
}

function onRowAction ({ action, row }: { action: string; row: TTicket }): void {
  if (action === 'edit') {
    void router.push({ name: routeNames.ticketEdit, params: { id: row.id }, query: { from: route.fullPath } })
  } else if (action === 'delete') {
    void deleteTicket(row)
  }
}

function onCreateClicked (): void {
  void router.push({ name: routeNames.ticketCreate, query: { from: route.fullPath } })
}

function onExportCsvClicked (): void {
  // The interceptor already toasts failures; this only prevents an unhandled rejection.
  exportCsv({
    entity: 'tickets',
    exportFn: (params, signal) => ticketsService.exportCsv(params, signal),
    params: {
      search: appliedSearch.value || undefined,
      eventId: listFilters.eventId || undefined,
      categoryId: listFilters.categoryId || undefined,
      status: listFilters.status === 'all' ? undefined : listFilters.status,
      currency: listFilters.currency === 'all' ? undefined : listFilters.currency,
      priceMin: listFilters.priceMin,
      priceMax: listFilters.priceMax,
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
    <PageHeader title="Tickets">
      <template #actions>
        <el-button :loading="csvExportLoading" @click="onExportCsvClicked">
          Export CSV
        </el-button>

        <el-button v-if="canDo('tickets', 'create')" type="primary" @click="onCreateClicked">
          <template #icon>
            <Icon name="plus" />
          </template>
          Create ticket
        </el-button>
      </template>
    </PageHeader>

    <ListToolbar
      :search="search"
      :active-filters="activeFilters"
      search-placeholder="Search by name…"
      @update:search="setSearch"
      @filter-removed="onFilterRemoved"
      @clear-all-requested="resetFilters"
    >
      <template #filters>
        <ListFilterField label="Event" class="w-48">
          <RemoteSelect
            v-model="eventFilterModel"
            :fetch-options="fetchEventOptions"
            :resolve-option="resolveEventOption"
            :option-value="(event: TEvent) => event.id"
            :option-label="(event: TEvent) => event.name"
            placeholder="Event"
            class="!w-full"
            aria-label="Filter by event"
          />
        </ListFilterField>

        <ListFilterField label="Category" class="w-48">
          <RemoteSelect
            v-model="categoryFilterModel"
            :fetch-options="fetchCategoryOptions"
            :resolve-option="resolveCategoryOption"
            :option-value="(category: TCategory) => category.id"
            :option-label="(category: TCategory) => category.name"
            placeholder="Category"
            class="!w-full"
            aria-label="Filter by category"
          />
        </ListFilterField>

        <ListFilterField label="Status" class="w-40">
          <el-select
            :model-value="listFilters.status"
            placeholder="Status"
            class="!w-full"
            aria-label="Filter by status"
            @update:model-value="(value: TTicketStatus | 'all') => setFilter('status', value)"
          >
            <el-option label="All statuses" value="all" />
            <el-option
              v-for="option in STATUS_FILTER_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </ListFilterField>

        <ListFilterField label="Currency" class="w-36">
          <el-select
            :model-value="listFilters.currency"
            placeholder="Currency"
            class="!w-full"
            aria-label="Filter by currency"
            @update:model-value="(value: TCurrency | 'all') => setFilter('currency', value)"
          >
            <el-option label="All currencies" value="all" />
            <el-option
              v-for="option in CURRENCY_FILTER_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </ListFilterField>

        <ListFilterField label="Price" class="w-60">
          <div class="flex items-center gap-1" role="group" aria-label="Filter by price range">
            <el-input-number
              v-model="priceMinModel"
              :min="0"
              :precision="2"
              :controls="false"
              placeholder="Min price"
              aria-label="Minimum price"
              class="!w-auto min-w-0 flex-1"
            />
            <span class="text-text-muted">–</span>
            <el-input-number
              v-model="priceMaxModel"
              :min="0"
              :precision="2"
              :controls="false"
              placeholder="Max price"
              aria-label="Maximum price"
              class="!w-auto min-w-0 flex-1"
            />
          </div>
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
      :sort="dataTableSort"
      :row-actions="rowActions"
      selectable
      :selected-row-keys="selectedIds"
      :leaving-row-keys="leavingRowKeys"
      caption="Tickets"
      @sort-requested="setSort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
      @row-action-invoked="onRowAction"
      @selection-changed="onSelectionChanged"
    >
      <template #cell-price="{ row }">
        <span class="tabular-nums">{{ filters.formatMoney((row as TTicket).price, (row as TTicket).currency) }}</span>
      </template>

      <template #cell-quantity="{ row }">
        <!-- Zero quantity reads as a stock state, not a data-entry mistake (never colour alone). -->
        <el-tag v-if="(row as TTicket).quantity === 0" type="danger" effect="light">
          Sold out (0)
        </el-tag>
        <span v-else class="tabular-nums">{{ (row as TTicket).quantity }}</span>
      </template>

      <template #cell-status="{ row }">
        <StatusTag :status="(row as TTicket).status" />
      </template>

      <template #cell-createdAt="{ row }">
        {{ filters.formatDate((row as TTicket).createdAt) }}
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
          @click="bulkDeleteTickets"
        >
          Delete
        </el-button>

        <el-button
          v-if="canBulkArchive"
          :loading="bulkRunning"
          @click="bulkArchiveTickets"
        >
          Archive
        </el-button>

        <el-button link @click="clearSelection">
          Clear selection
        </el-button>
      </el-card>
    </el-affix>

    <BulkResultDialog v-model="bulkResultVisible" :result="bulkResult" entity-label="ticket" />
  </div>
</template>
