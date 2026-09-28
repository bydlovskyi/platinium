import { dashboardService } from './dashboard.service'

import { resetDatabase, seedSession } from '../../../tests/support'
import { server } from '@/mocks/server'

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

let capturedListeners: Parameters<typeof server.events.on<'request:start'>>[1][] = []

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
