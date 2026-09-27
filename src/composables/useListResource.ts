const ABORT_CONTROLLER_KEY = 'fetch'

interface IUseListResourceResult<TItem> {
  data: TItem[]
  meta: TPaginationMeta
}

type TListResourceFetcher<TQuery, TItem> = (
  query: TQuery,
  signal: AbortSignal
) => Promise<IUseListResourceResult<TItem>>

export function useListResource<TQuery, TItem> (
  query: MaybeRefOrGetter<TQuery>,
  fetcher: TListResourceFetcher<TQuery, TItem>
) {
  const data = ref<TItem[]>([]) as Ref<TItem[]>
  const meta = ref<TPaginationMeta>()
  const loading = ref(false)
  const error = ref<unknown>()

  const { call } = useAbortController<typeof ABORT_CONTROLLER_KEY>()

  // Stops a superseded request's `finally` from clearing `loading` for a newer one.
  let latestRequestId = 0

  async function fetchList (): Promise<void> {
    const requestId = ++latestRequestId

    loading.value = true

    try {
      const currentQuery = toValue(query)
      const result = await call(ABORT_CONTROLLER_KEY, signal => fetcher(currentQuery, signal))

      if (requestId !== latestRequestId) {
        return
      }

      data.value = result.data
      meta.value = result.meta
      error.value = undefined
    } catch (caught) {
      if (requestId !== latestRequestId) {
        return
      }

      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return
      }

      error.value = caught
    } finally {
      if (requestId === latestRequestId) {
        loading.value = false
      }
    }
  }

  watch(() => toValue(query), () => void fetchList(), { deep: true, immediate: true })

  function refetch (): Promise<void> {
    error.value = undefined

    return fetchList()
  }

  return {
    data,
    meta,
    loading,
    error,
    refetch
  }
}
