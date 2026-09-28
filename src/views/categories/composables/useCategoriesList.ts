export function useCategoriesList () {
  const listQuery = useListQuery<Record<string, never>>({
    key: 'categories',
    routeName: routeNames.categories,
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

  return useEntityList({
    listQuery,
    query,
    fetcher: (currentQuery, signal) => categoriesService.list(currentQuery, signal),
    hasActiveFilters: () => listQuery.appliedSearch.value !== ''
  })
}
