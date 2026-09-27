import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

const CATEGORIES_LIST_QUERY_KEY = 'categories'

// Must match the mock handler's `sortableFields`.
const CATEGORY_SORT_FIELDS = ['name', 'createdAt'] as const

export function useCategoriesList () {
  const listQuery = useListQuery<Record<string, never>>({
    key: CATEGORIES_LIST_QUERY_KEY,
    filters: {},
    sortFields: CATEGORY_SORT_FIELDS
  })

  const query = computed(() => ({
    search: listQuery.appliedSearch.value || undefined,
    sort: listQuery.sort.value?.field,
    order: listQuery.sort.value?.order,
    page: listQuery.page.value,
    perPage: listQuery.perPage.value
  }))

  const listResource = useListResource(query, (currentQuery, signal) => categoriesService.list(currentQuery, signal))

  const hasActiveSearch = computed(() => listQuery.appliedSearch.value !== '')

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
