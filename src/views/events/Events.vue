<script lang="ts" setup>
/**
 * Events list screen (GitHub issue #26, PRD-004 "Events list — columns,
 * filters, sorting, pagination" — the first entity screen, and the proof
 * that the shared list machinery from PRD-003 actually holds). This view is
 * deliberately thin: it composes `useEventsList` (URL-driven query +
 * fetching) and renders `ListToolbar` + `AppDataTable` from column/filter
 * descriptors. Any list-state logic that would belong here instead belongs
 * one layer down, in the shared composables — see the composable's own
 * comment.
 */
import type { IDataTableColumn } from '@/components/data-table/data-table.types'

const {
  search,
  filters: listFilters,
  sort,
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
      label: `Dates: ${listFilters.startDateFrom || '…'} – ${listFilters.startDateTo || '…'}`
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
        <!--
          The create/edit form and its route are a separate, not-yet-built
          slice (GitHub issue #27, blocked by this one) — this button
          satisfies #26's own "page header with title and a create action"
          criterion visually without inventing a `routeNames` entry that
          issue #27 owns and would otherwise have to reconcile with.
        -->
        <el-button type="primary">
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
      caption="Events"
      @sort-requested="setSort"
      @page-requested="setPage"
      @page-size-requested="setPerPage"
      @clear-filters-requested="resetFilters"
      @retry-requested="refetch"
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
  </div>
</template>
