<script lang="ts" setup>
import type { IDataTableColumn } from '@/components/data-table/data-table.types'

const route = useRoute()
const router = useRouter()

const list = useTicketsList()
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
  clearSelection,
  leavingRowKeys,
  bulkDelete,
  bulkArchive,
  deleteRow,
  csvExportLoading,
  exportCsv,
  onSelectionChanged
} = useEntityListPage<TTicket, typeof list.query.value>({
  entity: 'tickets',
  label: { singular: 'ticket', plural: 'tickets' },
  list,
  service: ticketsService,
  archive: { message: 'This sets their status to archived.' }
})

const columns: IDataTableColumn<TTicket>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'price', label: 'Price', sortable: true, align: 'right', cellSlot: 'price' },
  { key: 'quantity', label: 'Quantity', sortable: true, align: 'right', cellSlot: 'quantity' },
  { key: 'status', label: 'Status', sortable: true, cardRole: 'badge', cellSlot: 'status' },
  { key: 'eventName', label: 'Event' },
  { key: 'categoryName', label: 'Category' },
  { key: 'createdAt', label: 'Created', sortable: true, cellSlot: 'createdAt' }
]

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

// The chip labels are resolved here rather than taken from the RemoteSelects, which aren't mounted while the
// mobile filter drawer is closed. A missing record is expected after a delete, so no toast for it.
const eventChipLabel = useResolvedName(
  () => listFilters.eventId, id => eventsService.get(id, { showNotification: false }))
const categoryChipLabel = useResolvedName(
  () => listFilters.categoryId, id => categoriesService.get(id, { showNotification: false }))

function useResolvedName (id: () => string, resolve: (id: string) => Promise<{ name: string }>): Ref<string> {
  const label = ref('…')
  let latestId = ''

  watch(id, async (value) => {
    latestId = value
    label.value = '…'

    if (value === '') {
      return
    }

    try {
      const record = await resolve(value)

      if (latestId === value) {
        label.value = record.name
      }
    } catch {
      if (latestId === value) {
        label.value = 'Unknown'
      }
    }
  }, { immediate: true })

  return label
}

const activeFilters = computed(() => {
  const chips: { key: string; label: string }[] = []

  if (listFilters.eventId !== '') {
    chips.push({ key: 'eventId', label: `Event: ${eventChipLabel.value}` })
  }

  if (listFilters.categoryId !== '') {
    chips.push({ key: 'categoryId', label: `Category: ${categoryChipLabel.value}` })
  }

  if (listFilters.status !== 'all') {
    chips.push({ key: 'status', label: `Status: ${STATUS_PRESENTATION[listFilters.status].label}` })
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
    void setFilters({ priceMin: undefined, priceMax: undefined })
  }
}

function onRowAction ({ action, row }: { action: string; row: TTicket }): void {
  if (action === 'edit') {
    void router.push({ name: routeNames.ticketEdit, params: { id: row.id }, query: { from: route.fullPath } })
  } else if (action === 'delete') {
    void deleteRow(row)
  }
}

function onCreateClicked (): void {
  void router.push({ name: routeNames.ticketCreate, query: { from: route.fullPath } })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Tickets">
      <template #actions>
        <el-button :loading="csvExportLoading" @click="exportCsv">
          Export CSV
        </el-button>

        <el-button v-if="canCreate" type="primary" @click="onCreateClicked">
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
            :model-value="listFilters.eventId || undefined"
            :fetch-options="params => eventsService.list(params)"
            :resolve-option="id => eventsService.get(id, { showNotification: false })"
            :option-value="(event: TEvent) => event.id"
            :option-label="(event: TEvent) => event.name"
            placeholder="Event"
            class="!w-full"
            aria-label="Filter by event"
            @update:model-value="(value: string | undefined) => setFilter('eventId', value ?? '')"
          />
        </ListFilterField>

        <ListFilterField label="Category" class="w-48">
          <RemoteSelect
            :model-value="listFilters.categoryId || undefined"
            :fetch-options="params => categoriesService.list(params)"
            :resolve-option="id => categoriesService.get(id, { showNotification: false })"
            :option-value="(category: TCategory) => category.id"
            :option-label="(category: TCategory) => category.name"
            placeholder="Category"
            class="!w-full"
            aria-label="Filter by category"
            @update:model-value="(value: string | undefined) => setFilter('categoryId', value ?? '')"
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
              v-for="status in TICKET_STATUSES"
              :key="status"
              :label="STATUS_PRESENTATION[status].label"
              :value="status"
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
            <el-option v-for="currency in CURRENCIES" :key="currency" :label="currency" :value="currency" />
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
      :sort="sort"
      :row-actions="rowActions"
      :can-create="canCreate"
      :selectable="canSelectRows"
      :selected-row-keys="selectedIds"
      :leaving-row-keys="leavingRowKeys"
      caption="Tickets"
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

    <BulkActionBar
      :selected-count="selectedIds.length"
      :can-delete="canBulkDelete"
      :can-archive="canBulkArchive"
      :running="bulkRunning"
      @delete-requested="bulkDelete"
      @archive-requested="bulkArchive"
      @clear-requested="clearSelection"
    />

    <BulkResultDialog v-model="bulkResultVisible" :result="bulkResult" entity-label="ticket" :names="bulkResultNames" />
  </div>
</template>
