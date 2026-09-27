import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'
import { requireAuth } from './auth'
import { db } from '../db/singleton'
import type { IEvent, ITicket, TCurrency, TEventStatus, TTicketStatus } from '../db'

// Gross inventory value is per currency and must never be summed across currencies.

// Low enough to signal a restock, high enough to give a useful shortlist on the seed data.
export const NEARLY_SOLD_OUT_MAX_QUANTITY = 20

const UPCOMING_EVENTS_LIMIT = 5

const NEARLY_SOLD_OUT_LIMIT = 5

const RUNNING_EVENT_STATUS: TEventStatus = 'published'

const CLOSED_TICKET_STATUSES: TTicketStatus[] = ['sold_out', 'archived']

const EVENT_STATUSES: TEventStatus[] = ['draft', 'published', 'cancelled', 'completed']
const TICKET_STATUSES: TTicketStatus[] = ['draft', 'on_sale', 'sold_out', 'archived']

const HTTP_STATUS = { ok: 200 } as const
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

function errorBody (code: string, message: string): TErrorResponse {
  return { code, message }
}

async function withChaos (path: string, resolve: () => Response | Promise<Response>): Promise<Response> {
  const latencyMs = chaos.getLatency()

  if (latencyMs > 0) {
    await delay(latencyMs)
  }

  const forced = chaos.consumeForcedFailure(path)

  if (forced !== undefined) {
    return HttpResponse.json(
      errorBody('CHAOS_FORCED_FAILURE', 'The mock backend was forced to fail this request.'),
      { status: forced.status }
    )
  }

  return resolve()
}

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
    .filter(event => event.startDate >= today)
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .slice(0, UPCOMING_EVENTS_LIMIT)
}

const UNKNOWN_REFERENCE_NAME = 'Unknown'

// The fallback is defensive: writes with unresolvable references are rejected upstream.
function denormaliseTicket (ticket: ITicket): TTicket {
  return {
    ...ticket,
    eventName: db.events.get(ticket.eventId)?.name ?? UNKNOWN_REFERENCE_NAME,
    categoryName: db.categories.get(ticket.categoryId)?.name ?? UNKNOWN_REFERENCE_NAME
  }
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
