<script lang="ts" setup>
/**
 * Tickets list screen (GitHub issue #34, PRD-006 "Tickets list —
 * cross-entity filters, deep-link entry, deletion"). This is the slice where
 * a filter spans two foreign keys (event, category) plus status, currency
 * and a price range, all funnelled into a single `GET /tickets` request via
 * `useTicketsList`'s `computed(() => ({...}))` query — the same
 * `useEventsList` pattern, just with more filters. List-only: no
 * create/edit route or button here (issue #35's scope), mirroring
 * `Categories.vue`/`Events.vue`'s thin-view shape otherwise.
 *
 * Deep links from PRD-004/PRD-005 (a blocked event/category deletion linking
 * here with a pre-applied filter) work by construction because
 * `useListQuery` reads `route.query` on mount — see this view's integration
 * spec for the explicit proof required by the issue.
 */
import type { IDataTableColumn, IDataTableRowAction } from '@/components/data-table/data-table.types'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

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
} = useTicketsList()

// Name, price, quantity, status, event name and category name — PRD-006's
// column list. Event/category render the denormalised `eventName`/
// `categoryName` the mock already joins onto every row (never `eventId`/
// `categoryId`) so the list is readable without an identifier in sight.
// `responsivePriority: 'high'` on name/price/status matches this issue's
// explicit mobile-card requirement ("shows name, price and status") —
// `AppDataTable`'s card presentation only renders `high` columns.
const columns: IDataTableColumn<TTicket>[] = [
  { key: 'name', label: 'Name', sortable: true, responsivePriority: 'high' },
  { key: 'price', label: 'Price', sortable: true, responsivePriority: 'high', align: 'right', cellSlot: 'price' },
  { key: 'quantity', label: 'Quantity', sortable: true, responsivePriority: 'low', align: 'right', cellSlot: 'quantity' },
  { key: 'status', label: 'Status', sortable: true, responsivePriority: 'high', cellSlot: 'status' },
  { key: 'eventName', label: 'Event', responsivePriority: 'low' },
  { key: 'categoryName', label: 'Category', responsivePriority: 'low' }
]

/**
 * Only forwards the active sort to `AppDataTable` when it names one of the
 * table's own rendered columns. `createdAt` is sortable (PRD-006 "sort by
 * ... creation date") but has no column of its own — passing it straight
 * through would have `el-table.sort()` look up a `prop` that matches no
 * column and silently fail, leaving a previous column's header arrow stuck
 * showing a sort no longer applied. Same gate `Categories.vue` uses for its
 * own non-column `createdAt` sort.
 */
const TABLE_SORT_FIELDS = new Set<string>(['name', 'price', 'quantity', 'status'])

const dataTableSort = computed(() => (
  sort.value && TABLE_SORT_FIELDS.has(sort.value.field)
    ? { field: sort.value.field, order: sort.value.order }
    : undefined
))

/** Mirrors `Categories.vue`'s `NON_COLUMN_SORT_OPTIONS`/`onNonColumnSortChange` for the one sortable field with no visible column. */
const NON_COLUMN_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' }
]

const nonColumnSortValue = computed<string | undefined>(() => (
  sort.value?.field === 'createdAt' ? `${sort.value.field}:${sort.value.order}` : undefined
))

function onNonColumnSortChange (value: string | undefined): void {
  const query = { ...route.query, page: undefined }

  if (value === undefined) {
    void router.push({ query: { ...query, sort: undefined, order: undefined } })
    return
  }

  const [field, order] = value.split(':')

  void router.push({ query: { ...query, sort: field, order } })
}

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

// --- Event / category remote-select filters -----------------------------
// `RemoteSelect` (issue #33) backs both: `fetchOptions` pages/searches via
// the entity's own `list`, `resolveOption` fetches a single record by id so
// a deep-linked `eventId`/`categoryId` (arriving with no matching option
// loaded yet) still resolves to a real name instead of a bare identifier.

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

// --- Price range filter ---------------------------------------------------
// URL/request state stays in integer minor units throughout (`priceMin`/
// `priceMax` on `ITicketsListFilters`); these two computeds are the only
// place that ever converts to/from the whole-currency decimal amount the
// `el-input-number` pair displays, mirroring `priceFilterToMinorUnits`/
// `minorUnitsToPriceFilter`'s own single-boundary intent.
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

// The event/category filter chips need a human-readable name, not just the
// id the URL carries — resolved the same way `RemoteSelect` resolves a
// preselected value (fetch by id), cached per current filter value so the
// chip doesn't refetch on every unrelated re-render.
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

const rowActions: IDataTableRowAction<TTicket>[] = [
  { key: 'delete', label: 'Delete', danger: true }
]

/**
 * Deletes `ticket` after confirmation. Unlike `Events.vue`'s/`Categories.vue`'s
 * delete, there is no `DependencyConflictError` handling here — PRD-006
 * "Tickets are leaves: nothing references them, so deletion has no
 * dependency check" — `ticketsService.delete` never rejects with one.
 * Page-adjustment on deleting the last row of a page beyond the first
 * mirrors `Events.vue`'s `deleteEvent` exactly.
 */
async function deleteTicket (ticket: TTicket): Promise<void> {
  await confirm({
    subject: ticket.name,
    onConfirm: async () => {
      await ticketsService.delete(ticket.id)

      notificationService.success({ message: 'Ticket deleted.' })

      if (data.value.length === 1 && page.value > 1) {
        void setPage(page.value - 1)
      } else {
        void refetch()
      }
    }
  })
}

function onRowAction ({ action, row }: { action: string; row: TTicket }): void {
  if (action === 'delete') {
    void deleteTicket(row)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader title="Tickets" />

    <ListToolbar
      :search="search"
      :active-filters="activeFilters"
      search-placeholder="Search by name…"
      @update:search="setSearch"
      @filter-removed="onFilterRemoved"
      @clear-all-requested="resetFilters"
    >
      <template #filters>
        <RemoteSelect
          v-model="eventFilterModel"
          :fetch-options="fetchEventOptions"
          :resolve-option="resolveEventOption"
          :option-value="(event: TEvent) => event.id"
          :option-label="(event: TEvent) => event.name"
          placeholder="Event"
          class="!w-48"
          aria-label="Filter by event"
        />

        <RemoteSelect
          v-model="categoryFilterModel"
          :fetch-options="fetchCategoryOptions"
          :resolve-option="resolveCategoryOption"
          :option-value="(category: TCategory) => category.id"
          :option-label="(category: TCategory) => category.name"
          placeholder="Category"
          class="!w-48"
          aria-label="Filter by category"
        />

        <el-select
          :model-value="listFilters.status"
          placeholder="Status"
          class="!w-40"
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

        <el-select
          :model-value="listFilters.currency"
          placeholder="Currency"
          class="!w-36"
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

        <div class="flex items-center gap-1" role="group" aria-label="Filter by price range">
          <el-input-number
            v-model="priceMinModel"
            :min="0"
            :precision="2"
            :controls="false"
            placeholder="Min price"
            aria-label="Minimum price"
            class="!w-28"
          />
          <span class="text-text-muted">–</span>
          <el-input-number
            v-model="priceMaxModel"
            :min="0"
            :precision="2"
            :controls="false"
            placeholder="Max price"
            aria-label="Maximum price"
            class="!w-28"
          />
        </div>
      </template>

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
      caption="Tickets"
      @sort-requested="setSort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
      @row-action-invoked="onRowAction"
    >
      <template #cell-price="{ row }">
        <span class="tabular-nums">{{ filters.formatMoney((row as TTicket).price, (row as TTicket).currency) }}</span>
      </template>

      <template #cell-quantity="{ row }">
        <!-- Zero quantity is flagged with both a distinct tag AND its own
             "Sold out" text (never colour alone, greyscale-safe) rather than
             just styling the number — a bare "0" is easy to misread as a
             data-entry mistake, and PRD-006 explicitly calls for it to read
             as a deliberate stock state instead. -->
        <el-tag v-if="(row as TTicket).quantity === 0" type="danger" effect="light">
          Sold out (0)
        </el-tag>
        <span v-else class="tabular-nums">{{ (row as TTicket).quantity }}</span>
      </template>

      <template #cell-status="{ row }">
        <StatusTag :status="(row as TTicket).status" />
      </template>
    </AppDataTable>
  </div>
</template>
