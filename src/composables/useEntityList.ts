import type { TDataTableEmptyReason } from '@/components/data-table/data-table.types'

interface IUseEntityListOptions<TQuery, TItem, TListQuery> {
  listQuery: TListQuery
  query: MaybeRefOrGetter<TQuery>
  fetcher: Parameters<typeof useListResource<TQuery, TItem>>[1]
  hasActiveFilters: MaybeRefOrGetter<boolean>
}

// The list state (URL) plus the list data, and the two behaviours every list needs on top of them.
export function useEntityList<
  TQuery,
  TItem,
  TListQuery extends { page: Ref<number>; setPage: (page: number) => Promise<void> }
> ({ listQuery, query, fetcher, hasActiveFilters }: IUseEntityListOptions<TQuery, TItem, TListQuery>) {
  const listResource = useListResource<TQuery, TItem>(query, fetcher)

  const emptyReason = computed<TDataTableEmptyReason>(() => {
    if (listResource.data.value.length > 0 || listResource.loading.value || listResource.error.value) {
      return 'none'
    }

    return toValue(hasActiveFilters) ? 'no-matches' : 'no-data'
  })

  // A page past the end (stale link, last rows deleted elsewhere) is not an empty dataset: step back to the last one.
  watch(listResource.meta, (meta) => {
    if (meta && meta.total > 0 && meta.totalPages > 0 && listQuery.page.value > meta.totalPages) {
      void listQuery.setPage(meta.totalPages)
    }
  })

  return {
    ...listQuery,
    ...listResource,
    query: computed(() => toValue(query)),
    emptyReason
  }
}
