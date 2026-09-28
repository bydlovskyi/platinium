import axios from 'axios'

import { db } from '../db/singleton'
import { resetDatabase } from '../../../tests/support'
import { NEARLY_SOLD_OUT_MAX_QUANTITY } from './dashboard'
import type { ICategory, IEvent, ISeedDataset, ITicket, IUser } from '../db'

// Plain axios, not `apiClient`: its response interceptor drops the status code these tests assert on.
async function requestFor (
  path: string,
  options: { token?: string } = {}
): Promise<{ status: number; body: unknown }> {
  const response = await axios.request({
    method: 'get',
    url: path,
    headers: options.token === undefined ? {} : { Authorization: `Bearer ${options.token}` },
    validateStatus: () => true
  })

  return { status: response.status, body: response.data }
}

const SEEDED_EMAIL = 'admin@platinium.test'
const SEEDED_PASSWORD = 'admin123'

async function loginAsSeededAdmin (): Promise<string> {
  const { data } = await axios.request({
    method: 'post',
    url: '/auth/login',
    data: { email: SEEDED_EMAIL, password: SEEDED_PASSWORD },
    validateStatus: () => true
  })

  return (data as TLoginResponse).token
}

const NOW_ISO = '2026-01-01T00:00:00.000Z'

function buildEvent (overrides: Partial<IEvent>): IEvent {
  return {
    id: `event-${Math.random()}`,
    name: 'Fixture Event',
    country: 'US',
    venue: 'Fixture Venue',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    status: 'draft',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildCategory (overrides: Partial<ICategory>): ICategory {
  return {
    id: `category-${Math.random()}`,
    name: 'Fixture Category',
    description: 'A fixture category.',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildTicket (overrides: Partial<ITicket>): ITicket {
  return {
    id: `ticket-${Math.random()}`,
    name: 'Fixture Ticket',
    price: 1000,
    currency: 'USD',
    quantity: 100,
    status: 'draft',
    eventId: 'event-1',
    categoryId: 'category-1',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildUser (overrides: Partial<IUser>): IUser {
  return {
    id: `user-${Math.random()}`,
    name: 'Fixture User',
    email: 'fixture@platinium.test',
    role: 'admin',
    sessionActive: false,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function controlledDataset (): ISeedDataset {
  const events: IEvent[] = [
    buildEvent({ id: 'evt-draft', status: 'draft', startDate: '2026-06-01', endDate: '2026-06-02' }),
    buildEvent({ id: 'evt-published-1', status: 'published', startDate: '2026-07-01', endDate: '2026-07-02' }),
    buildEvent({ id: 'evt-published-2', status: 'published', startDate: '2026-08-01', endDate: '2026-08-02' }),
    buildEvent({ id: 'evt-cancelled', status: 'cancelled', startDate: '2020-01-01', endDate: '2020-01-02' }),
    buildEvent({ id: 'evt-completed', status: 'completed', startDate: '2020-02-01', endDate: '2020-02-02' })
  ]

  const categories: ICategory[] = [buildCategory({ id: 'cat-1' })]

  const tickets: ITicket[] = [
    // Two currencies, deliberately different sums, to prove per-currency separation.
    buildTicket({ id: 'tix-usd-1', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'USD', price: 1000, quantity: 3, status: 'draft' }),
    buildTicket({ id: 'tix-usd-2', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'USD', price: 2000, quantity: 5, status: 'on_sale' }),
    buildTicket({ id: 'tix-eur-1', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'EUR', price: 500, quantity: 40, status: 'sold_out' }),
    // Nearly-sold-out boundary cases.
    buildTicket({ id: 'tix-at-threshold', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'USD', price: 100, quantity: NEARLY_SOLD_OUT_MAX_QUANTITY, status: 'on_sale' }),
    buildTicket({ id: 'tix-above-threshold', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'USD', price: 100, quantity: NEARLY_SOLD_OUT_MAX_QUANTITY + 1, status: 'on_sale' }),
    buildTicket({ id: 'tix-sold-out-low-stock', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'USD', price: 100, quantity: 1, status: 'sold_out' }),
    buildTicket({ id: 'tix-archived-low-stock', eventId: 'evt-draft', categoryId: 'cat-1', currency: 'USD', price: 100, quantity: 1, status: 'archived' })
  ]

  const users: IUser[] = [
    buildUser({ id: 'user-admin', name: 'Admin', email: 'admin@platinium.test', role: 'admin' }),
    buildUser({ id: 'user-viewer', name: 'Viewer', email: 'viewer@platinium.test', role: 'viewer' })
  ]

  return { events, categories, tickets, users }
}

describe('dashboard handlers', () => {
  describe('GET /dashboard/stats', () => {
    it('returns 401 when the request carries no token', async () => {
      resetDatabase()

      const { status, body } = await requestFor('/dashboard/stats')

      expect(status).toBe(401)
      expect(body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) })
    })

    it('computes every DashboardStats field correctly against a hand-computed controlled fixture', async () => {
      resetDatabase(controlledDataset())
      const token = await loginAsSeededAdmin()

      const { status, body } = await requestFor('/dashboard/stats', { token })

      expect(status).toBe(200)

      const stats = body as TDashboardStats

      expect(stats.totalEvents).toBe(5)
      expect(stats.runningEvents).toBe(2) // evt-published-1, evt-published-2
      expect(stats.totalTickets).toBe(7)

      const expectedTotalQuantity = 3 + 5 + 40 +
        NEARLY_SOLD_OUT_MAX_QUANTITY + (NEARLY_SOLD_OUT_MAX_QUANTITY + 1) + 1 + 1

      expect(stats.totalAvailableQuantity).toBe(expectedTotalQuantity)

      expect(stats.ticketStatusBreakdown).toEqual([
        { status: 'draft', count: 1 }, // tix-usd-1
        { status: 'on_sale', count: 3 }, // tix-usd-2, tix-at-threshold, tix-above-threshold
        { status: 'sold_out', count: 2 }, // tix-eur-1, tix-sold-out-low-stock
        { status: 'archived', count: 1 } // tix-archived-low-stock
      ])

      expect(stats.eventStatusBreakdown).toEqual([
        { status: 'draft', count: 1 },
        { status: 'published', count: 2 },
        { status: 'cancelled', count: 1 },
        { status: 'completed', count: 1 }
      ])
    })

    describe('per-currency separation', () => {
      it('reports one CurrencyTotal per currency present, correctly summed, never a cross-currency total', async () => {
        resetDatabase(controlledDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const stats = body as TDashboardStats

        // USD: tix-usd-1 (1000*3=3000) + tix-usd-2 (2000*5=10000) + tix-at-threshold (100*20=2000)
        //    + tix-above-threshold (100*21=2100) + tix-sold-out-low-stock (100*1=100) + tix-archived-low-stock (100*1=100)
        //    = 3000 + 10000 + 2000 + 2100 + 100 + 100 = 17300
        // EUR: tix-eur-1 (500*40=20000)
        const usdTotal = stats.grossInventoryValue.find(entry => entry.currency === 'USD')
        const eurTotal = stats.grossInventoryValue.find(entry => entry.currency === 'EUR')

        expect(stats.grossInventoryValue).toHaveLength(2)
        expect(usdTotal).toEqual({ currency: 'USD', totalMinorUnits: 17300 })
        expect(eurTotal).toEqual({ currency: 'EUR', totalMinorUnits: 20000 })
      })

      it('never exposes a field summing value across currencies', async () => {
        resetDatabase(controlledDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const stats = body as Record<string, unknown>

        expect(Object.keys(stats).filter(key => /total.*value|gross/i.test(key))).toEqual(['grossInventoryValue'])
        expect(Array.isArray(stats.grossInventoryValue)).toBe(true)
      })
    })

    describe('nearly-sold-out threshold', () => {
      it(`includes a ticket exactly at quantity ${NEARLY_SOLD_OUT_MAX_QUANTITY}`, async () => {
        resetDatabase(controlledDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const stats = body as TDashboardStats

        expect(stats.nearlySoldOutTickets.map(ticket => ticket.id)).toContain('tix-at-threshold')
      })

      it(`excludes a ticket at quantity ${NEARLY_SOLD_OUT_MAX_QUANTITY + 1}`, async () => {
        resetDatabase(controlledDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const stats = body as TDashboardStats

        expect(stats.nearlySoldOutTickets.map(ticket => ticket.id)).not.toContain('tix-above-threshold')
      })

      it('excludes a low-stock ticket whose status is sold_out', async () => {
        resetDatabase(controlledDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const stats = body as TDashboardStats

        expect(stats.nearlySoldOutTickets.map(ticket => ticket.id)).not.toContain('tix-sold-out-low-stock')
      })

      it('excludes a low-stock ticket whose status is archived', async () => {
        resetDatabase(controlledDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const stats = body as TDashboardStats

        expect(stats.nearlySoldOutTickets.map(ticket => ticket.id)).not.toContain('tix-archived-low-stock')
      })
    })

    describe('upcomingEvents', () => {
      function upcomingDataset (): ISeedDataset {
        const base = controlledDataset()

        return {
          ...base,
          events: [
            buildEvent({ id: 'up-published-b', status: 'published', startDate: '2099-01-01', endDate: '2099-01-02' }),
            buildEvent({ id: 'up-published-a', status: 'published', startDate: '2099-01-01', endDate: '2099-01-02' }),
            buildEvent({ id: 'up-draft', status: 'draft', startDate: '2099-02-01', endDate: '2099-02-02' }),
            buildEvent({ id: 'up-cancelled', status: 'cancelled', startDate: '2098-01-01', endDate: '2098-01-02' }),
            buildEvent({ id: 'up-completed', status: 'completed', startDate: '2098-06-01', endDate: '2098-06-02' }),
            buildEvent({ id: 'past-published', status: 'published', startDate: '2000-01-01', endDate: '2000-01-02' })
          ],
          tickets: []
        }
      }

      it('lists only draft and published events starting today or later, soonest first', async () => {
        resetDatabase(upcomingDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const ids = (body as TDashboardStats).upcomingEvents.map(event => event.id)

        expect(ids).not.toContain('up-cancelled')
        expect(ids).not.toContain('up-completed')
        expect(ids).not.toContain('past-published')
        expect(ids[ids.length - 1]).toBe('up-draft')
      })

      it('breaks a start-date tie by id so the order is stable', async () => {
        resetDatabase(upcomingDataset())
        const token = await loginAsSeededAdmin()

        const { body } = await requestFor('/dashboard/stats', { token })
        const ids = (body as TDashboardStats).upcomingEvents.map(event => event.id)

        expect(ids.slice(0, 2)).toEqual(['up-published-a', 'up-published-b'])
      })
    })

    it('is readable by a viewer (a read, not a write)', async () => {
      resetDatabase(controlledDataset())

      const { data } = await axios.request({
        method: 'post',
        url: '/auth/login',
        data: { email: 'viewer@platinium.test', password: 'viewer123' },
        validateStatus: () => true
      })

      const token = (data as TLoginResponse).token

      const { status } = await requestFor('/dashboard/stats', { token })

      expect(status).toBe(200)
    })

    it('reflects the live database rather than a stale snapshot', async () => {
      resetDatabase(controlledDataset())
      const token = await loginAsSeededAdmin()

      const before = (await requestFor('/dashboard/stats', { token })).body as TDashboardStats

      db.events.insert(buildEvent({ id: 'evt-extra', status: 'published', startDate: '2026-09-01', endDate: '2026-09-02' }))

      const after = (await requestFor('/dashboard/stats', { token })).body as TDashboardStats

      expect(after.totalEvents).toBe(before.totalEvents + 1)
      expect(after.runningEvents).toBe(before.runningEvents + 1)
    })
  })
})
