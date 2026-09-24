import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

const TICKETS_LIST_QUERY_KEY = 'tickets'

/**
 * Sortable fields (GitHub issue #34, PRD-006 "sort by name, price, quantity,
 * status or creation date") — matches the mock handler's `sortableFields`
 * exactly (`src/mocks/handlers/tickets.ts`). `createdAt` has no dedicated
 * list column (the acceptance criteria's column list is name/price/quantity/
 * status/event/category), so `Tickets.vue` exposes it through a small
 * "Sort by" control rather than a sortable `el-table-column`, the same
 * pattern `Categories.vue` uses for its own non-column `createdAt` sort
 * (see that view's `NON_COLUMN_SORT_OPTIONS` comment).
 */
const TICKET_SORT_FIELDS = ['name', 'price', 'quantity', 'status', 'createdAt'] as const

const TICKET_STATUS_FILTER_VALUES: (TTicketStatus | 'all')[] = ['all', 'draft', 'on_sale', 'sold_out', 'archived']
const TICKET_CURRENCY_FILTER_VALUES: (TCurrency | 'all')[] = ['all', 'USD', 'EUR', 'GBP']

/**
 * Decimal digits the price-range filter's `el-input-number` pair round-trips
 * at. Unlike `CurrencyInput` (the sole minor-unit boundary for a ticket's OWN
 * price, always tied to that ticket's specific currency), this filter has no
 * single currency to derive a precision from — it can narrow across
 * currencies at once (or none selected) — so PRD-006 explicitly asks for "a
 * simple decimal-to-minor-unit conversion at the boundary", fixed at two
 * decimal places, rather than `CurrencyInput`'s dynamic per-currency
 * precision.
 */
const PRICE_FILTER_DECIMALS = 2
const PRICE_FILTER_MINOR_UNIT_FACTOR = 10 ** PRICE_FILTER_DECIMALS

/** Converts a whole/decimal currency amount (as entered in the price-range filter) to integer minor units — the request's `priceMin`/`priceMax` shape. Rounds to guard against floating-point drift (e.g. `19.99 * 100 === 1998.9999999999998`). */
export function priceFilterToMinorUnits (amount: number): number {
  return Math.round(amount * PRICE_FILTER_MINOR_UNIT_FACTOR)
}

/** Converts integer minor units (as read back from the URL) to the decimal amount the price-range `el-input-number` pair displays — the exact inverse of {@link priceFilterToMinorUnits}. */
export function minorUnitsToPriceFilter (minorUnits: number): number {
  return minorUnits / PRICE_FILTER_MINOR_UNIT_FACTOR
}

/** Filter shape for the tickets list (GitHub issue #34): event, category, status, currency and a price range, alongside search. Price bounds are stored in the URL as integer minor units (matching what `GET /tickets` expects), converted to/from a decimal display amount only inside the price-range `el-input-number` bindings in `Tickets.vue`. */
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

/**
 * Orchestrates the tickets list screen (GitHub issue #34, PRD-006): binds
 * `useListQuery` to `useListResource` and `ticketsService.list`, translating
 * the URL-driven query into the exact request shape `GET /tickets` expects
 * (`src/mocks/handlers/tickets.ts`: `eventId`, `categoryId`, `status`,
 * `currency`, `priceMin`, `priceMax`, `search`, `sort`, `order`, `page`,
 * `perPage`). Mirrors `src/views/events/composables/useEventsList.ts`'s
 * shape. Deep-link entry (`/tickets?eventId=X` / `?categoryId=X`) works by
 * construction: `useListQuery` reads `route.query` on mount, so an
 * `eventId`/`categoryId` present in the URL becomes an active filter (and
 * therefore an active chip, and part of the very first request) with no
 * extra wiring here.
 */
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
