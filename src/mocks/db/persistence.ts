import type { ISeedDataset } from './fixtures'
import type { ICategory, IEvent, ITicket, IUser } from './types'

// A version mismatch discards the stored data and re-seeds; there is no migration.
export const PERSISTENCE_KEY = 'platinum:mock-db'

// Bump whenever a persisted entity shape changes.
export const PERSISTENCE_VERSION = 4

interface IPersistenceEnvelope {
  version: number
  dataset: ISeedDataset
}

function isRecordArray (value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null)
}

function hasEntityBaseFields (item: Record<string, unknown>): boolean {
  return typeof item.id === 'string' && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string'
}

function isEventArray (value: unknown): value is IEvent[] {
  return isRecordArray(value) && value.every(item => hasEntityBaseFields(item) &&
    typeof item.name === 'string' &&
    typeof item.country === 'string' &&
    typeof item.venue === 'string' &&
    typeof item.startDate === 'string' &&
    typeof item.endDate === 'string' &&
    typeof item.status === 'string'
  )
}

function isCategoryArray (value: unknown): value is ICategory[] {
  return isRecordArray(value) && value.every(item => hasEntityBaseFields(item) &&
    typeof item.name === 'string' &&
    typeof item.description === 'string'
  )
}

function isTicketArray (value: unknown): value is ITicket[] {
  return isRecordArray(value) && value.every(item => hasEntityBaseFields(item) &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.currency === 'string' &&
    typeof item.quantity === 'number' &&
    typeof item.status === 'string' &&
    typeof item.eventId === 'string' &&
    typeof item.categoryId === 'string'
  )
}

function isUserArray (value: unknown): value is IUser[] {
  return isRecordArray(value) && value.every(item => hasEntityBaseFields(item) &&
    typeof item.name === 'string' &&
    typeof item.email === 'string' &&
    typeof item.role === 'string' &&
    typeof item.sessionActive === 'boolean'
  )
}

function isValidDataset (value: unknown): value is ISeedDataset {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return isEventArray(candidate.events) &&
    isCategoryArray(candidate.categories) &&
    isTicketArray(candidate.tickets) &&
    isUserArray(candidate.users)
}

function isValidEnvelope (value: unknown): value is IPersistenceEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return typeof candidate.version === 'number' && isValidDataset(candidate.dataset)
}

export function persistDataset (dataset: ISeedDataset): void {
  const envelope: IPersistenceEnvelope = { version: PERSISTENCE_VERSION, dataset }

  localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(envelope))
}

export function loadPersistedDataset (): ISeedDataset | undefined {
  const raw = localStorage.getItem(PERSISTENCE_KEY)

  if (raw === null) {
    return undefined
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    localStorage.removeItem(PERSISTENCE_KEY)

    return undefined
  }

  if (!isValidEnvelope(parsed) || parsed.version !== PERSISTENCE_VERSION) {
    localStorage.removeItem(PERSISTENCE_KEY)

    return undefined
  }

  return parsed.dataset
}

export function isPersistenceDisabled (): boolean {
  return import.meta.env.MODE === 'test'
}
