import { createSeedDataset } from './fixtures'
import type { TCurrency, TEventStatus, TTicketStatus } from './types'

const USER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EVENT_STATUSES: TEventStatus[] = ['draft', 'published', 'cancelled', 'completed']
const TICKET_STATUSES: TTicketStatus[] = ['draft', 'on_sale', 'sold_out', 'archived']
const CURRENCIES: TCurrency[] = ['USD', 'EUR', 'GBP']

describe('createSeedDataset', () => {
  it('is deterministic: produces an identical dataset across two generations', () => {
    const first = createSeedDataset()
    const second = createSeedDataset()

    expect(first).toEqual(second)
  })

  it('produces several dozen events, a handful of categories and several hundred tickets', () => {
    const { events, categories, tickets } = createSeedDataset()

    expect(events.length).toBeGreaterThanOrEqual(24)
    expect(categories.length).toBeGreaterThanOrEqual(4)
    expect(categories.length).toBeLessThanOrEqual(20)
    expect(tickets.length).toBeGreaterThanOrEqual(200)
  })

  it('spreads events across multiple countries', () => {
    const { events } = createSeedDataset()

    const countries = new Set(events.map(event => event.country))

    expect(countries.size).toBeGreaterThanOrEqual(5)
  })

  it('covers all 4 EventStatus values', () => {
    const { events } = createSeedDataset()

    const statuses = new Set(events.map(event => event.status))

    expect([...statuses].sort()).toEqual([...EVENT_STATUSES].sort())
  })

  it('covers all 4 TicketStatus values', () => {
    const { tickets } = createSeedDataset()

    const statuses = new Set(tickets.map(ticket => ticket.status))

    expect([...statuses].sort()).toEqual([...TICKET_STATUSES].sort())
  })

  it('covers all 3 Currency values', () => {
    const { tickets } = createSeedDataset()

    const currencies = new Set(tickets.map(ticket => ticket.currency))

    expect([...currencies].sort()).toEqual([...CURRENCIES].sort())
  })

  it('spreads tickets across multiple events and categories', () => {
    const { tickets } = createSeedDataset()

    const eventIds = new Set(tickets.map(ticket => ticket.eventId))
    const categoryIds = new Set(tickets.map(ticket => ticket.categoryId))

    expect(eventIds.size).toBeGreaterThan(1)
    expect(categoryIds.size).toBeGreaterThan(1)
  })

  it('every ticket references a real seeded event id', () => {
    const { events, tickets } = createSeedDataset()
    const eventIds = new Set(events.map(event => event.id))

    expect(tickets.every(ticket => eventIds.has(ticket.eventId))).toBe(true)
  })

  it('every ticket references a real seeded category id', () => {
    const { categories, tickets } = createSeedDataset()
    const categoryIds = new Set(categories.map(category => category.id))

    expect(tickets.every(ticket => categoryIds.has(ticket.categoryId))).toBe(true)
  })

  it('every ticket price is a non-negative integer (minor units, never a float)', () => {
    const { tickets } = createSeedDataset()

    expect(tickets.every(ticket => Number.isInteger(ticket.price) && ticket.price >= 0)).toBe(true)
  })

  it('produces UUID-shaped, unique ids across events, categories and tickets', () => {
    const { events, categories, tickets } = createSeedDataset()

    const allIds = [...events, ...categories, ...tickets].map(record => record.id)

    expect(new Set(allIds).size).toBe(allIds.length)
    expect(allIds.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))).toBe(true)
  })

  it('every event has a start date strictly before its end date', () => {
    const { events } = createSeedDataset()

    expect(events.every(event => new Date(event.startDate) < new Date(event.endDate))).toBe(true)
  })

  it('seeds exactly one administrator user, logged out by default', () => {
    const { users } = createSeedDataset()

    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      name: 'Admin',
      email: 'admin@platinium.test',
      role: 'admin',
      sessionActive: false
    })
    expect(users[0]?.email).toMatch(USER_EMAIL_PATTERN)
  })
})
