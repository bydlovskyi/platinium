import axios from 'axios'

export function useDashboardStats () {
  const data = ref<TDashboardStats>()
  const loading = ref(false)
  const error = ref<unknown>()

  const { call } = useAbortController<'fetch'>()

  async function fetchStats (): Promise<void> {
    loading.value = true
    error.value = undefined

    try {
      data.value = await call('fetch', signal => dashboardService.getStats(signal))
    } catch (caught) {
      if (axios.isCancel(caught)) {
        return
      }

      error.value = caught
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchStats)

  return {
    data,
    loading,
    error,
    retry: fetchStats
  }
}
