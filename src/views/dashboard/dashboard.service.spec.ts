import { dashboardService } from './dashboard.service'

import { resetDatabase, seedSession } from '../../../tests/support'
import { server } from '@/mocks/server'

/**
 * `dashboardService` unit tests (GitHub issue #38, PRD-007 "Dashboard"),
 * mirroring `events.service.spec.ts`/`categories.service.spec.ts`'s
 * established convention: every service in this repo gets its own
 * `*.service.spec.ts` proving request shape (method, URL, no body) against
 * the real MSW node server, even when — as here — the method is a single
 * `apiClient.get` passthrough with no behaviour of its own. The actual
 * aggregation logic behind the endpoint is unit tested against a known
 * fixture set in `src/mocks/handlers/dashboard.spec.ts`, and the full
 * fetch-through-render path is integration tested in `Dashboard.spec.ts` —
 * this spec exists only for parity with every sibling service, not to
 * re-cover either of those.
 */

interface ICapturedRequest {
  method: string
  pathname: string
}

function captureRequests (): ICapturedRequest[] {
  const captured: ICapturedRequest[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    const url = new URL(request.url)
    captured.push({ method: request.method, pathname: url.pathname })
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: ((...args: any[]) => void)[] = []

beforeEach(async () => {
  resetDatabase()
  await seedSession('admin')
})

afterEach(() => {
  for (const listener of capturedListeners) {
    server.events.removeListener('request:start', listener)
  }
  capturedListeners = []
  localStorage.clear()
})

describe('dashboardService', () => {
  describe('getStats', () => {
    it('sends a GET request to /dashboard/stats with no body', async () => {
      const requests = captureRequests()

      await dashboardService.getStats()

      expect(requests).toEqual([{ method: 'GET', pathname: '/dashboard/stats' }])
    })

    it('returns the aggregate DashboardStats payload', async () => {
      const stats = await dashboardService.getStats()

      expect(stats.totalEvents).toEqual(expect.any(Number))
      expect(Array.isArray(stats.grossInventoryValue)).toBe(true)
      expect(Array.isArray(stats.ticketStatusBreakdown)).toBe(true)
      expect(Array.isArray(stats.eventStatusBreakdown)).toBe(true)
    })
  })
})
