class DashboardService {
  getStats (signal?: AbortSignal): Promise<TDashboardStats> {
    return apiClient.get('/dashboard/stats', { signal })
  }
}

export const dashboardService = new DashboardService()
