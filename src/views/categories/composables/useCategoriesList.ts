import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

export function useCategoriesList () {
  const listQuery = useListQuery<Record<string, never>>({
    key: 'categories',
    filters: {},
    sortFields: ['name', 'createdAt']
  })

  const query = computed(() => ({
    search: listQuery.appliedSearch.value || undefined,
    sort: listQuery.sort.value?.field,
    order: listQuery.sort.value?.order,
    page: listQuery.page.value,
    perPage: listQuery.perPage.value
  }))

  const listResource = useListResource(query, (currentQuery, signal) => categoriesService.list(currentQuery, signal))

  const emptyReason = computed<TDataTableEmptyReason>(() => {
    if (listResource.data.value.length > 0 || listResource.loading.value || listResource.error.value) {
      return 'none'
    }

    return listQuery.appliedSearch.value !== '' ? 'no-matches' : 'no-data'
  })

  return {
    ...listQuery,
    ...listResource,
    query,
    emptyReason
  }
}
