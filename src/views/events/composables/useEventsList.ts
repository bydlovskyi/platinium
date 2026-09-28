const EVENTS_LIST_QUERY_KEY = 'events'

const EVENT_SORT_FIELDS = ['name', 'startDate', 'endDate', 'status'] as const

const EVENT_STATUS_FILTER_VALUES: (TEventStatus | 'all')[] = ['all', ...EVENT_STATUSES]

export interface IEventsListFilters {
  status: TEventStatus | 'all'
  country: string
  startDateFrom: string
  startDateTo: string
}

export function useEventsList () {
  const listQuery = useListQuery<IEventsListFilters>({
    key: EVENTS_LIST_QUERY_KEY,
    routeName: routeNames.events,
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

  return useEntityList({
    listQuery,
    query,
    fetcher: (currentQuery, signal) => eventsService.list(currentQuery, signal),
    hasActiveFilters: () => (
      listQuery.appliedSearch.value !== '' ||
      listQuery.filters.status !== 'all' ||
      listQuery.filters.country !== '' ||
      listQuery.filters.startDateFrom !== '' ||
      listQuery.filters.startDateTo !== ''
    )
  })
}
