/**
 * Fetches the dashboard's single aggregate payload (GitHub issue #38,
 * PRD-007 "Dashboard"). A view-local composable rather than a store — the
 * fetch state (`loading`/`error`/`data`) belongs to this one screen only and
 * nothing else in the portal needs it (architecture.md: a store exists only
 * when state is genuinely shared across views). Mirrors
 * `useEventsList`/`useTicketsList`'s "composable owns the fetch, the view
 * stays thin" shape, simplified for a single non-list request — no
 * `useListResource` here since there is no query, filter or pagination to
 * bind, just fetch-on-mount plus a `retry`.
 *
 * Uses `useAbortController` so a `retry()` fired before a previous request
 * resolves aborts the stale one, the same guard `useListResource` applies to
 * list fetches.
 */
const ABORT_CONTROLLER_KEY = 'fetch'

export function useDashboardStats () {
  const data = ref<TDashboardStats>()
  const loading = ref(false)
  const error = ref<unknown>()

  const { call } = useAbortController<typeof ABORT_CONTROLLER_KEY>()

  async function fetchStats (): Promise<void> {
    loading.value = true
    error.value = undefined

    try {
      data.value = await call(ABORT_CONTROLLER_KEY, signal => dashboardService.getStats(signal))
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return
      }

      error.value = caught
    } finally {
      loading.value = false
    }
  }

  function retry (): Promise<void> {
    return fetchStats()
  }

  onMounted(fetchStats)

  return {
    data,
    loading,
    error,
    retry
  }
}
