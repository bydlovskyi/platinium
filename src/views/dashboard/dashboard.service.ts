/**
 * Dashboard service (GitHub issue #38, PRD-007 "Dashboard"). A thin wrapper
 * over `apiClient` — the single aggregate request the dashboard screen
 * issues, mirroring the other `*.service.ts` files' shape (code-conventions
 * "Service layer"). All computation lives in the mock handler
 * (`src/mocks/handlers/dashboard.ts`); this service does no client-side
 * reduction of the response.
 */
class DashboardService {
  getStats (signal?: AbortSignal): Promise<TDashboardStats> {
    return apiClient.get('/dashboard/stats', { signal })
  }
}

export const dashboardService = new DashboardService()
