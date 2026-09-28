import { http, HttpResponse, type HttpHandler } from 'msw'

import { requireAuth } from './auth'
import { db } from '../db/singleton'
import { HTTP_STATUS, withChaos } from './shared'
import { denormaliseTicket } from './tickets'
import { EVENT_STATUSES, TICKET_STATUSES } from '../db'
import type { IEvent, ITicket, TCurrency, TEventStatus, TTicketStatus } from '../db'

// Gross inventory value is per currency and must never be summed across currencies.

// Low enough to signal a restock, high enough to give a useful shortlist on the seed data.
export const NEARLY_SOLD_OUT_MAX_QUANTITY = 20

const UPCOMING_EVENTS_LIMIT = 5

const NEARLY_SOLD_OUT_LIMIT = 5

const RUNNING_EVENT_STATUS: TEventStatus = 'published'

// Only an event that can still happen counts as "upcoming".
const UPCOMING_EVENT_STATUSES: TEventStatus[] = ['draft', 'published']

const CLOSED_TICKET_STATUSES: TTicketStatus[] = ['sold_out', 'archived']

const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

function allEvents (): IEvent[] {
  return db.events.list({ perPage: Number.MAX_SAFE_INTEGER }).data
}

function allTickets (): ITicket[] {
  return db.tickets.list({ perPage: Number.MAX_SAFE_INTEGER }).data
}

function statusBreakdown<T extends { status: string }> (records: T[], statuses: readonly string[]): TStatusBreakdown[] {
  return statuses.map(status => ({
    status,
    count: records.filter(record => record.status === status).length
  }))
}

function grossInventoryValue (tickets: ITicket[]): TCurrencyTotal[] {
  const totals = new Map<TCurrency, number>()

  for (const ticket of tickets) {
    const previous = totals.get(ticket.currency) ?? 0

    totals.set(ticket.currency, previous + ticket.price * ticket.quantity)
  }

  return [...totals.entries()].map(([currency, totalMinorUnits]) => ({ currency, totalMinorUnits }))
}

function upcomingEvents (events: IEvent[]): IEvent[] {
  const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH)

  return events
    .filter(event => event.startDate >= today && UPCOMING_EVENT_STATUSES.includes(event.status))
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id))
    .slice(0, UPCOMING_EVENTS_LIMIT)
}

function isNearlySoldOut (ticket: ITicket): boolean {
  return ticket.quantity <= NEARLY_SOLD_OUT_MAX_QUANTITY && !CLOSED_TICKET_STATUSES.includes(ticket.status)
}

function nearlySoldOutTickets (tickets: ITicket[]): TTicket[] {
  return tickets
    .filter(isNearlySoldOut)
    .sort((left, right) => left.quantity - right.quantity || left.id.localeCompare(right.id))
    .slice(0, NEARLY_SOLD_OUT_LIMIT)
    .map(denormaliseTicket)
}

function computeDashboardStats (): TDashboardStats {
  const events = allEvents()
  const tickets = allTickets()

  return {
    totalEvents: events.length,
    runningEvents: events.filter(event => event.status === RUNNING_EVENT_STATUS).length,
    totalTickets: tickets.length,
    totalAvailableQuantity: tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
    grossInventoryValue: grossInventoryValue(tickets),
    ticketStatusBreakdown: statusBreakdown(tickets, TICKET_STATUSES),
    eventStatusBreakdown: statusBreakdown(events, EVENT_STATUSES),
    upcomingEvents: upcomingEvents(events),
    nearlySoldOutTickets: nearlySoldOutTickets(tickets)
  }
}

const stats = http.get('/dashboard/stats', ({ request }) => withChaos('/dashboard/stats', () => {
  const authResult = requireAuth(request)

  if (authResult instanceof Response) {
    return Promise.resolve(authResult)
  }

  return Promise.resolve(HttpResponse.json(computeDashboardStats(), { status: HTTP_STATUS.ok }))
}))

export const dashboardHandlers: HttpHandler[] = [stats]
