import { createSeededId, createSeededRandom, type TSeededRandom } from './random'
import { CURRENCIES, EVENT_STATUSES, TICKET_STATUSES } from './types'
import type { ICategory, IEvent, ITicket, IUser } from './types'

const SEED = 1337

const EVENT_COUNT = 48
const TICKET_COUNT = 400

const FIXED_NOW_ISO = '2026-01-01T00:00:00.000Z'

const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'IE', 'PL', 'SE', 'CA'] as const

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

// Separate stream so spreading timestamps doesn't reshuffle ids, names or prices.
const CREATED_AT_SEED = 7331
const CATEGORY_CREATED_DAYS_AGO_MIN = 400
const CATEGORY_CREATED_DAYS_AGO_MAX = 730
const EVENT_CREATED_LEAD_DAYS_MIN = 14
const EVENT_CREATED_WINDOW_DAYS = 90

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

// Rotation guarantees every enum value appears in the seed.
function cycle<T> (items: readonly T[], index: number): T {
  const item = items[index % items.length]

  if (item === undefined) {
    throw new Error('cycle() called with an empty array')
  }

  return item
}

const ISO_DATE_LENGTH = 10

// Event dates are date-only (`YYYY-MM-DD`) per the contract; `createdAt`/`updatedAt` stay full date-times.
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

function randomTimestamp (random: TSeededRandom, fromMs: number, toMs: number): string {
  return new Date(fromMs + Math.floor(random() * (toMs - fromMs))).toISOString()
}

function withCreatedAt<T extends { createdAt: string; updatedAt: string }> (item: T, createdAt: string): T {
  return { ...item, createdAt, updatedAt: createdAt }
}

// Categories predate events, events predate their start, tickets follow their event.
function spreadCreatedAt (dataset: Omit<ISeedDataset, 'users'>, referenceDate: string): Omit<ISeedDataset, 'users'> {
  const random = createSeededRandom(CREATED_AT_SEED)
  const referenceMs = new Date(referenceDate).getTime()
  const daysAgo = (days: number): number => referenceMs - days * MILLISECONDS_PER_DAY

  const categories = dataset.categories.map(category => withCreatedAt(
    category,
    randomTimestamp(random, daysAgo(CATEGORY_CREATED_DAYS_AGO_MAX), daysAgo(CATEGORY_CREATED_DAYS_AGO_MIN))
  ))

  const events = dataset.events.map((event) => {
    const leadMs = EVENT_CREATED_LEAD_DAYS_MIN * MILLISECONDS_PER_DAY
    const latestMs = Math.min(new Date(event.startDate).getTime() - leadMs, daysAgo(1))
    const earliestMs = latestMs - EVENT_CREATED_WINDOW_DAYS * MILLISECONDS_PER_DAY

    return withCreatedAt(event, randomTimestamp(random, earliestMs, latestMs))
  })

  const eventCreatedAtById = new Map(events.map(event => [event.id, new Date(event.createdAt).getTime()]))

  const tickets = dataset.tickets.map(ticket => withCreatedAt(
    ticket,
    randomTimestamp(random, eventCreatedAtById.get(ticket.eventId) ?? daysAgo(1), referenceMs)
  ))

  return { categories, events, tickets }
}

// Day-granular so the dataset is stable within a day while event dates stay spread around the real now.
function currentIsoDate (): string {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH)
}

function createEvents (random: TSeededRandom, referenceDate: string): IEvent[] {
  return Array.from({ length: EVENT_COUNT }, (_, index) => {
    const startOffsetDays = intBetween(random, EVENT_START_OFFSET_DAYS_MIN, EVENT_START_OFFSET_DAYS_RANGE)
    const startDate = addDays(referenceDate, startOffsetDays)
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

// Passwords are not stored here; the login handler (`handlers/auth.ts`) checks them.
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

// Event dates are offsets from `referenceDate` (today by default); tests pass a fixed date to pin the output.
export function createSeedDataset (referenceDate: string = currentIsoDate()): ISeedDataset {
  const random = createSeededRandom(SEED)

  const categories = createCategories(random)
  const events = createEvents(random, referenceDate)
  const tickets = createTickets(random, events, categories)
  const users = createUsers(random)

  return { ...spreadCreatedAt({ events, categories, tickets }, referenceDate), users }
}
