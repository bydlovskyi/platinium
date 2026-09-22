import type { ISeedDataset } from './fixtures'
import type { ICategory, IEvent, ITicket } from './types'

/**
 * localStorage key the mock database persists under. Bumping
 * {@link PERSISTENCE_VERSION} is the only supported way to change the
 * persisted shape — a version mismatch discards the stored data and
 * re-seeds rather than attempting a migration.
 */
export const PERSISTENCE_KEY = 'platinum:mock-db'

/**
 * Bump this whenever `IEvent`, `ICategory` or `ITicket` change shape. A
 * reviewer who runs an older build and then a newer one must never see a
 * corrupted state — discarding stale data is the deliberate, documented
 * trade-off (see PRD-001, "Further Notes").
 */
export const PERSISTENCE_VERSION = 1

interface IPersistenceEnvelope {
  version: number
  dataset: ISeedDataset
}

function isRecordArray (value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null)
}

/** Fields shared by every domain record (mirrors {@link IEntityBase}). */
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

function isValidDataset (value: unknown): value is ISeedDataset {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return isEventArray(candidate.events) && isCategoryArray(candidate.categories) && isTicketArray(candidate.tickets)
}

function isValidEnvelope (value: unknown): value is IPersistenceEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return typeof candidate.version === 'number' && isValidDataset(candidate.dataset)
}

/** Persists a dataset to `localStorage` under the versioned key. */
export function persistDataset (dataset: ISeedDataset): void {
  const envelope: IPersistenceEnvelope = { version: PERSISTENCE_VERSION, dataset }

  localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(envelope))
}

/**
 * Reads and validates the persisted dataset. Returns `undefined` when
 * nothing is stored, the stored JSON is malformed, the shape is
 * unexpected, or the stored version does not match
 * {@link PERSISTENCE_VERSION} — in every discard case, the stale entry is
 * removed rather than left behind to be misread later.
 */
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

/**
 * True when persistence should be disabled, i.e. under Vitest. Checked via
 * Vite's own `MODE`, which is set to `'test'` automatically by the test
 * runner — no extra configuration needed, and suites always start from the
 * deterministic seed regardless of what a previous browser session left in
 * `localStorage`.
 */
export function isPersistenceDisabled (): boolean {
  return import.meta.env.MODE === 'test'
}
