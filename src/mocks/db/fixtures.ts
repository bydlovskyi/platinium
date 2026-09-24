import { createSeededId, createSeededRandom, type TSeededRandom } from './random'
import type { ICategory, IEvent, ITicket, IUser, TCurrency, TEventStatus, TTicketStatus } from './types'

/**
 * Fixed seed for the deterministic PRNG. Never `Date.now()` or `Math.random()`
 * — the same seed must produce the identical dataset on every run, in every
 * environment, forever.
 */
const SEED = 1337

const EVENT_COUNT = 48
const TICKET_COUNT = 400

const FIXED_NOW_ISO = '2026-01-01T00:00:00.000Z'

const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'IE', 'PL', 'SE', 'CA'] as const

const EVENT_STATUSES: TEventStatus[] = ['draft', 'published', 'cancelled', 'completed']
const TICKET_STATUSES: TTicketStatus[] = ['draft', 'on_sale', 'sold_out', 'archived']
const CURRENCIES: TCurrency[] = ['USD', 'EUR', 'GBP']

const EVENT_NAME_PREFIXES = [
  'Summer', 'Winter', 'Spring', 'Autumn', 'Grand', 'Annual', 'International', 'Regional', 'Downtown', 'Riverside'
] as const

const EVENT_NAME_SUFFIXES = [
  'Music Festival', 'Tech Conference', 'Food Fair', 'Art Expo', 'Film Screening',
  'Sports Championship', 'Trade Show', 'Comedy Night', 'Theatre Gala', 'Charity Run'
] as const

const VENUES = [
  'Central Arena', 'Riverside Hall', 'Grand Pavilion', 'City Stadium', 'Convention Center',
  'Old Town Square', 'Harbor Amphitheater', 'Metro Exhibition Hall'
] as const

const CATEGORY_DEFINITIONS: { name: string; description: string }[] = [
  { name: 'General Admission', description: 'Standard entry with access to all public areas.' },
  { name: 'VIP', description: 'Priority entry, reserved seating and a dedicated lounge.' },
  { name: 'Early Bird', description: 'Discounted tickets available for a limited early window.' },
  { name: 'Student', description: 'Reduced-price entry for verified students.' },
  { name: 'Group', description: 'Bulk-priced tickets for parties of five or more.' },
  { name: 'Backstage', description: 'Includes backstage access and a meet-and-greet.' }
]

const TICKET_NAME_TEMPLATES = ['Standard', 'Premium', 'Reserved', 'Season Pass', 'Single Day', 'Weekend Bundle'] as const

const MIN_TICKET_PRICE_MINOR_UNITS = 500
const TICKET_PRICE_RANGE_MINOR_UNITS = 24500
const PRICE_ROUNDING_STEP = 50

const MIN_TICKET_QUANTITY = 10
const TICKET_QUANTITY_RANGE = 490

const EVENT_START_OFFSET_DAYS_RANGE = 400
const EVENT_START_OFFSET_DAYS_MIN = -200
const EVENT_DURATION_DAYS_RANGE = 5
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/** The full deterministic seed dataset: events, categories, tickets and users. */
export interface ISeedDataset {
  events: IEvent[]
  categories: ICategory[]
  tickets: ITicket[]
  users: IUser[]
}

function pick<T> (random: TSeededRandom, items: readonly T[]): T {
  const index = Math.floor(random() * items.length)
  const item = items[index]

  if (item === undefined) {
    throw new Error('pick() called with an empty array')
  }

  return item
}

function intBetween (random: TSeededRandom, min: number, range: number): number {
  return min + Math.floor(random() * range)
}

/** Picks the item at `index % items.length` — used to guarantee every enum value is covered by rotation. */
function cycle<T> (items: readonly T[], index: number): T {
  const item = items[index % items.length]

  if (item === undefined) {
    throw new Error('cycle() called with an empty array')
  }

  return item
}

const ISO_DATE_LENGTH = 10

/**
 * Adds `days` to `isoDate` and returns a date-only string (`YYYY-MM-DD`, no
 * time component) — event dates are date-only per the OpenAPI contract
 * (`startDate`/`endDate` on `Event`, `format: date`), unlike `createdAt`/
 * `updatedAt`, which stay full ISO date-time strings.
 */
function addDays (isoDate: string, days: number): string {
  return new Date(new Date(isoDate).getTime() + days * MILLISECONDS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH)
}

function createCategories (random: TSeededRandom): ICategory[] {
  return CATEGORY_DEFINITIONS.map(definition => ({
    id: createSeededId(random),
    name: definition.name,
    description: definition.description,
    createdAt: FIXED_NOW_ISO,
    updatedAt: FIXED_NOW_ISO
  }))
}

function createEvents (random: TSeededRandom): IEvent[] {
  return Array.from({ length: EVENT_COUNT }, (_, index) => {
    const startOffsetDays = intBetween(random, EVENT_START_OFFSET_DAYS_MIN, EVENT_START_OFFSET_DAYS_RANGE)
    const startDate = addDays(FIXED_NOW_ISO, startOffsetDays)
    const endDate = addDays(startDate, 1 + Math.floor(random() * EVENT_DURATION_DAYS_RANGE))

    const prefix = pick(random, EVENT_NAME_PREFIXES)
    const suffix = pick(random, EVENT_NAME_SUFFIXES)

    return {
      id: createSeededId(random),
      name: `${prefix} ${suffix} ${index + 1}`,
      country: pick(random, COUNTRIES),
      venue: pick(random, VENUES),
      startDate,
      endDate,
      status: cycle(EVENT_STATUSES, index),
      createdAt: FIXED_NOW_ISO,
      updatedAt: FIXED_NOW_ISO
    }
  })
}

function createTickets (random: TSeededRandom, events: IEvent[], categories: ICategory[]): ITicket[] {
  return Array.from({ length: TICKET_COUNT }, (_, index) => {
    const event = pick(random, events)
    const category = pick(random, categories)
    const rawPrice = MIN_TICKET_PRICE_MINOR_UNITS + intBetween(random, 0, TICKET_PRICE_RANGE_MINOR_UNITS)

    return {
      id: createSeededId(random),
      name: `${pick(random, TICKET_NAME_TEMPLATES)} — ${event.name}`,
      price: rawPrice - (rawPrice % PRICE_ROUNDING_STEP),
      currency: cycle(CURRENCIES, index),
      quantity: intBetween(random, MIN_TICKET_QUANTITY, TICKET_QUANTITY_RANGE),
      status: cycle(TICKET_STATUSES, index),
      eventId: event.id,
      categoryId: category.id,
      createdAt: FIXED_NOW_ISO,
      updatedAt: FIXED_NOW_ISO
    }
  })
}

/**
 * The two seeded accounts, one per {@link TUserRole}. Passwords are not part
 * of this fixture or of {@link IUser} — they are checked directly by the login
 * handler (`src/mocks/handlers/auth.ts`), matching the "credentials are
 * defined in the mock auth handler" note in PRD-002. `sessionActive` starts
 * `false` on both: a fresh dataset has no active session until a successful
 * `POST /auth/login`.
 *
 * Documented credentials (a later doc slice surfaces these in the README):
 * - Administrator — `admin@platinium.test` / `admin123` — may perform every
 *   operation.
 * - Viewer — `viewer@platinium.test` / `viewer123` — read-only; every write
 *   endpoint rejects this account's token with `403` (PRD-007).
 */
function createUsers (random: TSeededRandom): IUser[] {
  return [
    {
      id: createSeededId(random),
      name: 'Admin',
      email: 'admin@platinium.test',
      role: 'admin',
      sessionActive: false,
      createdAt: FIXED_NOW_ISO,
      updatedAt: FIXED_NOW_ISO
    },
    {
      id: createSeededId(random),
      name: 'Viewer',
      email: 'viewer@platinium.test',
      role: 'viewer',
      sessionActive: false,
      createdAt: FIXED_NOW_ISO,
      updatedAt: FIXED_NOW_ISO
    }
  ]
}

/**
 * Builds the deterministic seed dataset: several dozen events spanning
 * multiple countries and every {@link TEventStatus}, a handful of
 * categories, several hundred tickets spread across events, categories,
 * every {@link TTicketStatus} and every {@link TCurrency}, and the single
 * seeded administrator user. Every ticket references a real event id and a
 * real category id from the same generation.
 *
 * Seeded entirely from a fixed integer via {@link createSeededRandom} — no
 * `Date.now()`, no `Math.random()` — so two calls produce byte-for-byte
 * identical output.
 */
export function createSeedDataset (): ISeedDataset {
  const random = createSeededRandom(SEED)

  const categories = createCategories(random)
  const events = createEvents(random)
  const tickets = createTickets(random, events, categories)
  const users = createUsers(random)

  return { events, categories, tickets, users }
}
