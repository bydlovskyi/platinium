import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

const TICKETS_LIST_QUERY_KEY = 'tickets'

// Must match the mock handler's `sortableFields`.
const TICKET_SORT_FIELDS = ['name', 'price', 'quantity', 'status', 'createdAt'] as const

const TICKET_STATUS_FILTER_VALUES: (TTicketStatus | 'all')[] = ['all', 'draft', 'on_sale', 'sold_out', 'archived']
const TICKET_CURRENCY_FILTER_VALUES: (TCurrency | 'all')[] = ['all', 'USD', 'EUR', 'GBP']

// Fixed at 2 decimals: the filter spans currencies, so there's no single currency precision to derive.
const PRICE_FILTER_DECIMALS = 2
const PRICE_FILTER_MINOR_UNIT_FACTOR = 10 ** PRICE_FILTER_DECIMALS

// Rounds away float drift (19.99 * 100 === 1998.9999999999998).
export function priceFilterToMinorUnits (amount: number): number {
  return Math.round(amount * PRICE_FILTER_MINOR_UNIT_FACTOR)
}

export function minorUnitsToPriceFilter (minorUnits: number): number {
  return minorUnits / PRICE_FILTER_MINOR_UNIT_FACTOR
}

export interface ITicketsListFilters {
  eventId: string
  categoryId: string
  status: TTicketStatus | 'all'
  currency: TCurrency | 'all'
  priceMin: number | undefined
  priceMax: number | undefined
}

function parseMinorUnits (raw: string): number | undefined {
  const parsed = Number(raw)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function useTicketsList () {
  const listQuery = useListQuery<ITicketsListFilters>({
    key: TICKETS_LIST_QUERY_KEY,
    filters: {
      eventId: {
        default: '',
        parse: raw => raw
      },
      categoryId: {
        default: '',
        parse: raw => raw
      },
      status: {
        default: 'all',
        parse: raw => (TICKET_STATUS_FILTER_VALUES.includes(raw as TTicketStatus | 'all') ? (raw as TTicketStatus | 'all') : undefined)
      },
      currency: {
        default: 'all',
        parse: raw => (TICKET_CURRENCY_FILTER_VALUES.includes(raw as TCurrency | 'all') ? (raw as TCurrency | 'all') : undefined)
      },
      priceMin: {
        default: undefined,
        parse: parseMinorUnits
      },
      priceMax: {
        default: undefined,
        parse: parseMinorUnits
      }
    },
    sortFields: TICKET_SORT_FIELDS
  })

  const query = computed(() => ({
    search: listQuery.search.value || undefined,
    eventId: listQuery.filters.eventId || undefined,
    categoryId: listQuery.filters.categoryId || undefined,
    status: listQuery.filters.status === 'all' ? undefined : listQuery.filters.status,
    currency: listQuery.filters.currency === 'all' ? undefined : listQuery.filters.currency,
    priceMin: listQuery.filters.priceMin,
    priceMax: listQuery.filters.priceMax,
    sort: listQuery.sort.value?.field,
    order: listQuery.sort.value?.order,
    page: listQuery.page.value,
    perPage: listQuery.perPage.value
  }))

  const listResource = useListResource(query, (currentQuery, signal) => ticketsService.list(currentQuery, signal))

  const hasActiveFiltersOrSearch = computed(() => (
    listQuery.search.value !== '' ||
    listQuery.filters.eventId !== '' ||
    listQuery.filters.categoryId !== '' ||
    listQuery.filters.status !== 'all' ||
    listQuery.filters.currency !== 'all' ||
    listQuery.filters.priceMin !== undefined ||
    listQuery.filters.priceMax !== undefined
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
    sortFields: TICKET_SORT_FIELDS
  }
}
