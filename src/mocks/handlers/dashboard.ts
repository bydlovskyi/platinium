import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'
import { requireAuth } from './auth'
import { db } from '../db/singleton'
import type { IEvent, ITicket, TCurrency, TEventStatus, TTicketStatus } from '../db'

/**
 * `GET /dashboard/stats` — the OpenAPI contract's aggregate dashboard endpoint
 * (`src/mocks/openapi.yaml`). Computes the whole `DashboardStats` payload in
 * one request from the in-memory db (`src/mocks/db`), the only version that
 * survives a realistic dataset (PRD-007) — the browser never fetches lists and
 * reduces them.
 *
 * The single load-bearing rule here: gross inventory value is broken down PER
 * CURRENCY and is NEVER summed across currencies. A total mixing euros and
 * pounds is not a number; it is a bug with a friendly face.
 *
 * Readable by any authenticated user (admin or viewer) — it is a read, so no
 * `requireWriteAccess` gate.
 */

/**
 * The stock threshold at or below which a ticket counts as "nearly sold out"
 * on the dashboard. A named constant with a documented rationale, not a literal
 * buried in the handler body (PRD-007): 20 units is low enough that an
 * administrator should consider allocating more stock, while high enough to
 * surface a meaningful shortlist against the seeded dataset rather than only
 * the handful already at zero.
 */
export const NEARLY_SOLD_OUT_MAX_QUANTITY = 20

/** How many upcoming events the dashboard surfaces — a shortlist "next starting", not the whole calendar. */
const UPCOMING_EVENTS_LIMIT = 5

/** How many nearly-sold-out tickets the dashboard surfaces — a shortlist to act on, not an exhaustive list. */
const NEARLY_SOLD_OUT_LIMIT = 5

/** The event lifecycle status counted as "currently running" for the headline figure. */
const RUNNING_EVENT_STATUS: TEventStatus = 'published'

/** Ticket statuses excluded from the nearly-sold-out shortlist — an already-closed ticket needs no restock. */
const CLOSED_TICKET_STATUSES: TTicketStatus[] = ['sold_out', 'archived']

const EVENT_STATUSES: TEventStatus[] = ['draft', 'published', 'cancelled', 'completed']
const TICKET_STATUSES: TTicketStatus[] = ['draft', 'on_sale', 'sold_out', 'archived']

const HTTP_STATUS = { ok: 200 } as const
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

function errorBody (code: string, message: string): TErrorResponse {
  return { code, message }
}

/**
 * Wraps a resolver with the shared chaos behaviour every handler respects
 * uniformly (simulated latency, then a forced status). Mirrors `withChaos` in
 * `./factory.ts`/`./auth.ts` — kept local, since this module has no other
 * coupling to them.
 */
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

/** Reads every record of a collection in one page — the dashboard aggregates over the whole dataset. */
function allEvents (): IEvent[] {
  return db.events.list({ perPage: Number.MAX_SAFE_INTEGER }).data
}

function allTickets (): ITicket[] {
  return db.tickets.list({ perPage: Number.MAX_SAFE_INTEGER }).data
}

/** Counts records per status, preserving the declared status order so the breakdown is stable across requests. */
function statusBreakdown<T extends { status: string }> (records: T[], statuses: readonly string[]): TStatusBreakdown[] {
  return statuses.map(status => ({
    status,
    count: records.filter(record => record.status === status).length
  }))
}

/**
 * Gross inventory value (price × quantity) totalled PER CURRENCY — one entry
 * per currency actually present in the ticket set, never a single figure summed
 * across currencies (the single most load-bearing rule of this slice). Entries
 * are ordered by first appearance, so the array is deterministic.
 */
function grossInventoryValue (tickets: ITicket[]): TCurrencyTotal[] {
  const totals = new Map<TCurrency, number>()

  for (const ticket of tickets) {
    const previous = totals.get(ticket.currency) ?? 0

    totals.set(ticket.currency, previous + ticket.price * ticket.quantity)
  }

  return [...totals.entries()].map(([currency, totalMinorUnits]) => ({ currency, totalMinorUnits }))
}

/** The next events starting today or later, soonest first, capped at {@link UPCOMING_EVENTS_LIMIT}. */
function upcomingEvents (events: IEvent[]): IEvent[] {
  const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH)

  return events
    .filter(event => event.startDate >= today)
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .slice(0, UPCOMING_EVENTS_LIMIT)
}

const UNKNOWN_REFERENCE_NAME = 'Unknown'

/**
 * Joins the denormalised `eventName`/`categoryName` onto a stored ticket, so
 * the dashboard's `nearlySoldOutTickets` carry the same public `Ticket` shape
 * the list endpoint returns (references by name, resolved at read time). The
 * `?? UNKNOWN_REFERENCE_NAME` fallback is defensive, mirroring
 * `tickets.ts`'s `denormalise`: a create/update whose reference does not
 * resolve is rejected upstream, so a dangling reference should be unreachable.
 */
function denormaliseTicket (ticket: ITicket): TTicket {
  return {
    ...ticket,
    eventName: db.events.get(ticket.eventId)?.name ?? UNKNOWN_REFERENCE_NAME,
    categoryName: db.categories.get(ticket.categoryId)?.name ?? UNKNOWN_REFERENCE_NAME
  }
}

/**
 * Tickets whose stock is at or below {@link NEARLY_SOLD_OUT_MAX_QUANTITY} and
 * not already closed out ({@link CLOSED_TICKET_STATUSES}), lowest stock first,
 * capped at {@link NEARLY_SOLD_OUT_LIMIT} — the shortlist an administrator
 * should consider restocking. Ties break by id so the order is stable.
 */
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
