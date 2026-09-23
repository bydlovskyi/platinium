import { ticketsService } from './tickets.service'

import { resetDatabase } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { ICategory, IEvent, ITicket } from '@/mocks/db'

/**
 * `ticketsService` unit tests (GitHub issue #34, PRD-006's testing boundary
 * — mirroring `src/views/events/events.service.spec.ts`'s shape exactly).
 * This service is a thin wrapper over `apiClient` with no behaviour of its
 * own to stub around, so the only thing worth proving is the request shape
 * (method, URL, params) each method actually produces — captured via a
 * `request:start` listener over the real MSW node server, no mocked
 * `apiClient`.
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

function buildCategory (overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: overrides.id ?? 'category-1',
    name: 'General Admission',
    description: 'Standard entry.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function buildTicket (overrides: Partial<ITicket> = {}): ITicket {
  return {
    id: overrides.id ?? 'ticket-1',
    name: 'General Admission',
    price: 4999,
    currency: 'USD',
    quantity: 100,
    status: 'on_sale',
    eventId: overrides.eventId ?? 'event-1',
    categoryId: overrides.categoryId ?? 'category-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

interface ICapturedRequest {
  method: string
  pathname: string
  search: string
}

function captureRequests (): ICapturedRequest[] {
  const captured: ICapturedRequest[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    const url = new URL(request.url)
    captured.push({ method: request.method, pathname: url.pathname, search: url.search })
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: ((...args: any[]) => void)[] = []

beforeEach(() => {
  resetDatabase({ events: [], categories: [], tickets: [], users: [] })
  db.events.insert(buildEvent())
  db.categories.insert(buildCategory())
})

afterEach(() => {
  for (const listener of capturedListeners) {
    server.events.removeListener('request:start', listener)
  }
  capturedListeners = []
})

describe('ticketsService', () => {
  describe('list', () => {
    it('sends a GET request to /tickets with every filter param in the query string', async () => {
      db.tickets.insert(buildTicket())
      const requests = captureRequests()

      await ticketsService.list({
        search: 'general',
        eventId: 'event-1',
        categoryId: 'category-1',
        status: 'on_sale',
        currency: 'USD',
        priceMin: 1000,
        priceMax: 9999,
        sort: 'price',
        order: 'asc',
        page: 1,
        perPage: 20
      })

      expect(requests).toHaveLength(1)
      expect(requests[0]!.method).toBe('GET')
      expect(requests[0]!.pathname).toBe('/tickets')

      const params = new URLSearchParams(requests[0]!.search)
      expect(params.get('search')).toBe('general')
      expect(params.get('eventId')).toBe('event-1')
      expect(params.get('categoryId')).toBe('category-1')
      expect(params.get('status')).toBe('on_sale')
      expect(params.get('currency')).toBe('USD')
      expect(params.get('priceMin')).toBe('1000')
      expect(params.get('priceMax')).toBe('9999')
      expect(params.get('sort')).toBe('price')
      expect(params.get('order')).toBe('asc')
    })

    it('returns the list envelope with denormalised event and category names', async () => {
      db.tickets.insert(buildTicket({ id: 't1', name: 'VIP' }))

      const result = await ticketsService.list({})

      const ticket = result.data.find(row => row.id === 't1')
      expect(ticket).toBeDefined()
      expect(ticket!.eventName).toBe('Rooftop Jazz Night')
      expect(ticket!.categoryName).toBe('General Admission')
      expect(result.meta).toEqual(expect.objectContaining({ total: expect.any(Number) }))
    })
  })

  describe('delete', () => {
    it('sends a DELETE request to /tickets/{id} with the given id interpolated into the URL', async () => {
      db.tickets.insert(buildTicket({ id: 'ticket-42' }))
      const requests = captureRequests()

      await ticketsService.delete('ticket-42')

      expect(requests).toEqual([expect.objectContaining({ method: 'DELETE', pathname: '/tickets/ticket-42' })])
    })

    it('actually removes the record from the mock database on success', async () => {
      db.tickets.insert(buildTicket({ id: 'ticket-7' }))

      await ticketsService.delete('ticket-7')

      expect(db.tickets.get('ticket-7')).toBeUndefined()
    })

    it('succeeds with no dependency check — tickets are leaves nothing references', async () => {
      db.tickets.insert(buildTicket({ id: 'ticket-9' }))

      await expect(ticketsService.delete('ticket-9')).resolves.toBeDefined()
      expect(db.tickets.get('ticket-9')).toBeUndefined()
    })

    it('rejects when the id does not exist', async () => {
      await expect(ticketsService.delete('does-not-exist')).rejects.toBeDefined()
    })
  })
})
