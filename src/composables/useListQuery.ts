import type { LocationQuery, LocationQueryRaw } from 'vue-router'

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20
const DEFAULT_DEBOUNCE_MS = 300

interface IListQueryFilterDescriptor<TValue> {
  default: TValue
  parse: (raw: string) => TValue | undefined
  serialize?: (value: TValue) => string
}

type TListQueryFilterDescriptors<TFilters extends object> = {
  [K in keyof TFilters]: IListQueryFilterDescriptor<TFilters[K]>
}

interface IListQuerySort {
  field: string
  order: 'asc' | 'desc'
}

interface IUseListQueryOptions<TFilters extends object> {
  key: string
  filters: TListQueryFilterDescriptors<TFilters>
  sortFields: readonly string[]
  defaultSort?: IListQuerySort
  defaultPerPage?: number
  debounceMs?: number
}

function readString (query: LocationQuery, key: string): string | undefined {
  const raw = query[key]

  return typeof raw === 'string' ? raw : undefined
}

function parsePositiveInteger (raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback
  }

  const parsed = Number(raw)

  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseFilterValue<TValue> (raw: string | undefined, descriptor: IListQueryFilterDescriptor<TValue>): TValue {
  if (raw === undefined) {
    return descriptor.default
  }

  try {
    const parsed = descriptor.parse(raw)

    return parsed ?? descriptor.default
  } catch {
    return descriptor.default
  }
}

function serializeFilterValue<TValue> (value: TValue, descriptor: IListQueryFilterDescriptor<TValue>): string {
  return descriptor.serialize ? descriptor.serialize(value) : String(value)
}

function parseSort (
  query: LocationQuery,
  sortFields: readonly string[],
  defaultSort: IListQuerySort | undefined
): IListQuerySort | undefined {
  const field = readString(query, 'sort')
  const order = readString(query, 'order')

  if (field !== undefined && sortFields.includes(field) && (order === 'asc' || order === 'desc')) {
    return { field, order }
  }

  return defaultSort
}

/**
 * Generic, URL-driven list-query composable (GitHub issue #21): owns search
 * text, a typed filters object, sort, page and page size for a list screen,
 * synchronized bidirectionally with `route.query` so the URL is always the
 * shareable, back-button-navigable source of truth. Reusable across every
 * future list screen (events, categories, tickets) — callers supply their
 * own filter shape and get full type safety back.
 *
 * Discrete changes (filters, sort, page, committed search) go through
 * `router.push` so the back button steps through them one at a time; only
 * the search debounce itself avoids touching history until it settles.
 */
export function useListQuery<TFilters extends object> (options: IUseListQueryOptions<TFilters>) {
  const {
    key,
    filters: filterDescriptors,
    sortFields,
    defaultSort,
    defaultPerPage = DEFAULT_PER_PAGE,
    debounceMs = DEFAULT_DEBOUNCE_MS
  } = options

  const route = useRoute()
  const router = useRouter()

  const persistedPerPage = useStorage(`list-query:${key}:per-page`, defaultPerPage)

  const search = ref(readString(route.query, 'search') ?? '')

  const filters = reactive<TFilters>({} as TFilters) as TFilters
  const sort = ref<IListQuerySort | undefined>(parseSort(route.query, sortFields, defaultSort))
  const page = ref(parsePositiveInteger(readString(route.query, 'page'), DEFAULT_PAGE))
  const perPage = ref(
    readString(route.query, 'perPage') !== undefined
      ? parsePositiveInteger(readString(route.query, 'perPage'), defaultPerPage)
      : persistedPerPage.value
  )

  function hydrateFiltersFrom (query: LocationQuery): void {
    for (const filterKey of Object.keys(filterDescriptors) as (keyof TFilters)[]) {
      const descriptor = filterDescriptors[filterKey]

      filters[filterKey] = parseFilterValue(readString(query, filterKey as string), descriptor)
    }
  }

  hydrateFiltersFrom(route.query)

  function buildQuery (overrides: Partial<{
    search: string
    filters: TFilters
    sort: IListQuerySort | undefined
    page: number
    perPage: number
  }>): LocationQueryRaw {
    const nextSearch = overrides.search ?? search.value
    const nextFilters = overrides.filters ?? filters
    const nextSort = 'sort' in overrides ? overrides.sort : sort.value
    const nextPage = overrides.page ?? page.value
    const nextPerPage = overrides.perPage ?? perPage.value

    const query: LocationQueryRaw = {}

    if (nextSearch !== '') {
      query.search = nextSearch
    }

    for (const filterKey of Object.keys(filterDescriptors) as (keyof TFilters)[]) {
      const descriptor = filterDescriptors[filterKey]
      const value = nextFilters[filterKey]

      if (value !== descriptor.default) {
        query[filterKey as string] = serializeFilterValue(value, descriptor)
      }
    }

    const sortIsDefault = defaultSort
      ? nextSort?.field === defaultSort.field && nextSort?.order === defaultSort.order
      : nextSort === undefined

    if (nextSort && !sortIsDefault) {
      query.sort = nextSort.field
      query.order = nextSort.order
    }

    if (nextPage !== DEFAULT_PAGE) {
      query.page = String(nextPage)
    }

    if (nextPerPage !== defaultPerPage) {
      query.perPage = String(nextPerPage)
    }

    return query
  }

  async function pushQuery (overrides: Parameters<typeof buildQuery>[0]): Promise<void> {
    await router.push({ query: buildQuery(overrides) })
  }

  // Discrete setters (everything but `setSearch`) read current reactive state
  // synchronously and then push. If two are fired back-to-back without an
  // `await` in between, the second would read the same pre-push state as the
  // first (its `router.push` hasn't resolved and updated the refs yet) and
  // compute the same result — e.g. two rapid `setSort('name')` clicks would
  // net one toggle instead of two. Chaining every discrete setter onto a
  // shared queue ensures each one's state read only happens after the
  // previous push has fully settled, so back-to-back calls behave the same
  // as properly-sequenced (awaited) ones. `setSearch` is intentionally left
  // out — it must stay synchronous/non-blocking for the debounced input
  // binding.
  let discreteQueue: Promise<void> = Promise.resolve()

  function enqueueDiscrete (run: () => Promise<void>): Promise<void> {
    const result = discreteQueue.then(run)

    discreteQueue = result.catch(() => undefined)

    return result
  }

  function setSearch (value: string): void {
    search.value = value
  }

  watchDebounced(
    search,
    (value) => {
      if (value === (readString(route.query, 'search') ?? '')) {
        return
      }

      void pushQuery({ search: value, page: DEFAULT_PAGE })
    },
    { debounce: debounceMs }
  )

  function setFilter<TKey extends keyof TFilters> (filterKey: TKey, value: TFilters[TKey]): Promise<void> {
    return enqueueDiscrete(() => {
      const nextFilters = { ...filters, [filterKey]: value } as TFilters

      return pushQuery({ filters: nextFilters, page: DEFAULT_PAGE })
    })
  }

  function setSort (field: string): Promise<void> {
    return enqueueDiscrete(() => {
      let nextSort: IListQuerySort | undefined

      if (sort.value?.field === field) {
        nextSort = sort.value.order === 'asc' ? { field, order: 'desc' } : undefined
      } else {
        nextSort = { field, order: 'asc' }
      }

      return pushQuery({ sort: nextSort })
    })
  }

  function setPage (value: number): Promise<void> {
    return enqueueDiscrete(() => pushQuery({ page: value }))
  }

  function setPerPage (value: number): Promise<void> {
    persistedPerPage.value = value

    return enqueueDiscrete(() => pushQuery({ perPage: value }))
  }

  function resetFilters (): Promise<void> {
    return enqueueDiscrete(() => {
      const resetValues = {} as TFilters

      for (const filterKey of Object.keys(filterDescriptors) as (keyof TFilters)[]) {
        resetValues[filterKey] = filterDescriptors[filterKey].default
      }

      // Also clears `search` (bypassing its debounce, since this is a
      // discrete "start over" action, not typing) — otherwise a search-only
      // query (e.g. `?search=zzz`) would survive "clear filters"/"clear all"
      // and the empty state's promise to show the full list again would be
      // broken (GitHub issue #26).
      search.value = ''

      return pushQuery({ filters: resetValues, search: '', page: DEFAULT_PAGE })
    })
  }

  watch(
    () => route.query,
    (query) => {
      const nextSearch = readString(query, 'search') ?? ''

      if (search.value !== nextSearch) {
        search.value = nextSearch
      }

      hydrateFiltersFrom(query)
      sort.value = parseSort(query, sortFields, defaultSort)
      page.value = parsePositiveInteger(readString(query, 'page'), DEFAULT_PAGE)
      perPage.value = readString(query, 'perPage') !== undefined
        ? parsePositiveInteger(readString(query, 'perPage'), defaultPerPage)
        : persistedPerPage.value
    }
  )

  return {
    search,
    filters,
    sort,
    page,
    perPage,
    setSearch,
    setFilter,
    setSort,
    setPage,
    setPerPage,
    resetFilters
  }
}
