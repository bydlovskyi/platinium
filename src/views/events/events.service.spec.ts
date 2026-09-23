import { eventsService } from './events.service'

import { resetDatabase } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { IEvent } from '@/mocks/db'

/**
 * `eventsService` unit tests (GitHub issue #28, PRD-004's testing boundary:
 * "Events service — unit tested for correct request shaping"). Exercises
 * `delete` against the real MSW node server (`src/mocks/server.ts`, already
 * wired up globally in `tests/setup.ts`) rather than mocking `apiClient` —
 * this repo's services are thin wrappers with no behaviour of their own to
 * stub around, so the only thing worth proving is the request shape
 * (method, URL, no body) each method actually produces. A `request:start`
 * listener over the shared server captures that shape without replacing the
 * real handler, matching `Events.spec.ts`'s `captureEventsRequests`
 * convention.
 */

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
})
