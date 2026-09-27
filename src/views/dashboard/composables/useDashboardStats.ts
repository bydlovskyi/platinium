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
