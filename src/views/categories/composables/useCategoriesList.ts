import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

const CATEGORIES_LIST_QUERY_KEY = 'categories'

/**
 * Sortable fields (GitHub issue #30, PRD-005 "search across name and
 * description, sort by name or creation date") — matches the mock handler's
 * `sortableFields` exactly (`src/mocks/handlers/categories.ts`). `createdAt`
 * has no dedicated list column (PRD-005's acceptance criterion only lists
 * "name and description columns"), so `Categories.vue` exposes it through a
 * small "Sort by" control rather than a sortable `el-table-column`.
 */
const CATEGORY_SORT_FIELDS = ['name', 'createdAt'] as const

/**
 * Orchestrates the categories list screen (GitHub issue #30, PRD-005): binds
 * `useListQuery` (no filter descriptors — categories have none, per PRD-005's
 * "No filters — none of the entity's attributes justify one") to
 * `useListResource` and `categoriesService.list`. Mirrors
 * `src/views/events/composables/useEventsList.ts`'s shape.
 */
export function useCategoriesList () {
  const listQuery = useListQuery<Record<string, never>>({
    key: CATEGORIES_LIST_QUERY_KEY,
    filters: {},
    sortFields: CATEGORY_SORT_FIELDS
  })

  const query = computed(() => ({
    search: listQuery.search.value || undefined,
    sort: listQuery.sort.value?.field,
    order: listQuery.sort.value?.order,
    page: listQuery.page.value,
    perPage: listQuery.perPage.value
  }))

  const listResource = useListResource(query, (currentQuery, signal) => categoriesService.list(currentQuery, signal))

  const hasActiveSearch = computed(() => listQuery.search.value !== '')

  const emptyReason = computed<TDataTableEmptyReason>(() => {
    if (listResource.data.value.length > 0) {
      return 'none'
    }

    if (listResource.loading.value || listResource.error.value) {
      return 'none'
    }

    return hasActiveSearch.value ? 'no-matches' : 'no-data'
  })

  return {
    ...listQuery,
    ...listResource,
    emptyReason,
    sortFields: CATEGORY_SORT_FIELDS
  }
}
