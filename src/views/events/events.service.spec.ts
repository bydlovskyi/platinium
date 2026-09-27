import { eventsService } from './events.service'

import { resetDatabase } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { IEvent } from '@/mocks/db'

function buildEvent (overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: overrides.id ?? 'event-1',
    name: 'Rooftop Jazz Night',
    country: 'US',
    venue: 'Skyline Terrace',
    startDate: '2027-05-01',
    endDate: '2027-05-02',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

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

beforeEach(() => {
  resetDatabase({ events: [], categories: [], tickets: [], users: [] })
})

afterEach(() => {
  for (const listener of capturedListeners) {
    server.events.removeListener('request:start', listener)
  }
  capturedListeners = []
})

describe('eventsService', () => {
  describe('delete', () => {
    it('sends a DELETE request to /events/{id} with the given id interpolated into the URL', async () => {
      db.events.insert(buildEvent({ id: 'event-42' }))
      const requests = captureRequests()

      await eventsService.delete('event-42')

      expect(requests).toEqual([{ method: 'DELETE', pathname: '/events/event-42' }])
    })

    it('actually removes the record from the mock database on success', async () => {
      db.events.insert(buildEvent({ id: 'event-7' }))

      await eventsService.delete('event-7')

      expect(db.events.get('event-7')).toBeUndefined()
    })

    it('rejects when the id does not exist', async () => {
      await expect(eventsService.delete('does-not-exist')).rejects.toBeDefined()
    })
  })

  describe('exportCsv', () => {
    it('sends a GET request to /events with format=csv plus the given filter params, and resolves a Blob', async () => {
      db.events.insert(buildEvent({ id: 'event-42', name: 'Rooftop Jazz Night' }))
      const requests = captureRequests()

      const blob = await eventsService.exportCsv({ search: 'jazz', status: 'draft', sort: 'name', order: 'asc' })

      expect(requests).toHaveLength(1)
      expect(requests[0]!.method).toBe('GET')
      expect(requests[0]!.pathname).toBe('/events')

      // Duck-typed, not toBeInstanceOf(Blob): the fetch adapter's Blob comes from undici's realm, not jsdom's.
      expect(typeof blob.size).toBe('number')
      expect(blob.type).toContain('text/csv')
      const text = await blob.text()
      expect(text.split('\r\n')[0]).toContain('Name')
      expect(text).toContain('Rooftop Jazz Night')
    })

    it('never sends page/perPage — the export always covers the full filtered result', async () => {
      const requests: string[] = []

      function onRequestStart ({ request }: { request: Request }): void {
        requests.push(new URL(request.url).search)
      }

      server.events.on('request:start', onRequestStart)
      capturedListeners.push(onRequestStart)

      await eventsService.exportCsv({ search: 'jazz' })

      const params = new URLSearchParams(requests[0])
      expect(params.get('format')).toBe('csv')
      expect(params.has('page')).toBe(false)
      expect(params.has('perPage')).toBe(false)
    })
  })
})
