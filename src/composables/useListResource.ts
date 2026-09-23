const ABORT_CONTROLLER_KEY = 'fetch'

interface IUseListResourceResult<TItem> {
  data: TItem[]
  meta: TPaginationMeta
}

type TListResourceFetcher<TQuery, TItem> = (
  query: TQuery,
  signal: AbortSignal
) => Promise<IUseListResourceResult<TItem>>

/**
 * Binds a reactive list query (GitHub issue #21's `useListQuery`, or any
 * query shape) to an entity fetcher (GitHub issue #22): watches the query,
 * fetches, and exposes `data`, pagination `meta`, `loading`, `error` and a
 * `refetch`, so entity list screens write almost no fetching logic of their
 * own.
 *
 * Uses `useAbortController` so a superseded request (the query changed again
 * before the in-flight fetch resolved) is aborted and its late resolution or
 * rejection can never overwrite state set by a newer request — a real defect
 * on a fast-typing administrator, not a theoretical one. An aborted request
 * never sets `error`; it is not a user-facing failure.
 *
 * Previous `data`/`meta` stay visible while a new page loads — only
 * `loading` toggles around the fetch — so the screen never flashes empty
 * between pages.
 */
export function useListResource<TQuery, TItem> (
  query: MaybeRefOrGetter<TQuery>,
  fetcher: TListResourceFetcher<TQuery, TItem>
) {
  const data = ref<TItem[]>([]) as Ref<TItem[]>
  const meta = ref<TPaginationMeta>()
  const loading = ref(false)
  const error = ref<unknown>()

  const { call } = useAbortController<typeof ABORT_CONTROLLER_KEY>()

  // Tracks which `fetchList` invocation is the most recent one, so a
  // superseded request's `finally` block cannot clear `loading` behind a
  // newer, still in-flight request's back.
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
