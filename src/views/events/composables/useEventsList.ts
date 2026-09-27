import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

const EVENTS_LIST_QUERY_KEY = 'events'

const EVENT_SORT_FIELDS = ['name', 'startDate', 'endDate', 'status'] as const

const EVENT_STATUS_FILTER_VALUES: (TEventStatus | 'all')[] = ['all', 'draft', 'published', 'cancelled', 'completed']

export interface IEventsListFilters {
  status: TEventStatus | 'all'
  country: string
  startDateFrom: string
  startDateTo: string
}

export function useEventsList () {
  const listQuery = useListQuery<IEventsListFilters>({
    key: EVENTS_LIST_QUERY_KEY,
    filters: {
      status: {
        default: 'all',
        parse: raw => (EVENT_STATUS_FILTER_VALUES.includes(raw as TEventStatus | 'all') ? (raw as TEventStatus | 'all') : undefined)
      },
      country: {
        default: '',
        parse: raw => raw
      },
      startDateFrom: {
        default: '',
        parse: raw => raw
      },
      startDateTo: {
        default: '',
        parse: raw => raw
      }
    },
    sortFields: EVENT_SORT_FIELDS
  })

  const query = computed(() => ({
    search: listQuery.appliedSearch.value || undefined,
    status: listQuery.filters.status === 'all' ? undefined : listQuery.filters.status,
    country: listQuery.filters.country || undefined,
    startDateFrom: listQuery.filters.startDateFrom || undefined,
    startDateTo: listQuery.filters.startDateTo || undefined,
    sort: listQuery.sort.value?.field,
    order: listQuery.sort.value?.order,
    page: listQuery.page.value,
    perPage: listQuery.perPage.value
  }))

  const listResource = useListResource(query, (currentQuery, signal) => eventsService.list(currentQuery, signal))

  const hasActiveFiltersOrSearch = computed(() => (
    listQuery.appliedSearch.value !== '' ||
    listQuery.filters.status !== 'all' ||
    listQuery.filters.country !== '' ||
    listQuery.filters.startDateFrom !== '' ||
    listQuery.filters.startDateTo !== ''
  ))

  const emptyReason = computed<TDataTableEmptyReason>(() => {
    if (listResource.data.value.length > 0) {
      return 'none'
    }

    if (listResource.loading.value || listResource.error.value) {
      return 'none'
    }

    return hasActiveFiltersOrSearch.value ? 'no-matches' : 'no-data'
  })

  return {
    ...listQuery,
    ...listResource,
    emptyReason,
    sortFields: EVENT_SORT_FIELDS
  }
}
