import { createCollection, type IEntityCollection } from './collection'
import { createSeedDataset, type ISeedDataset } from './fixtures'
import { isPersistenceDisabled, loadPersistedDataset, persistDataset } from './persistence'
import type { ICategory, IEvent, IIdentifiable, ITicket, IUser } from './types'

// Per PRD-004's contract for `GET /events`'s `search` parameter: name and
// venue only. `country` has its own dedicated exact-match filter
// (`?country=`), so it deliberately does not also participate in free text.
const EVENT_SEARCHABLE_FIELDS: (keyof IEvent)[] = ['name', 'venue']
const CATEGORY_SEARCHABLE_FIELDS: (keyof ICategory)[] = ['name', 'description']
const TICKET_SEARCHABLE_FIELDS: (keyof ITicket)[] = ['name']
const USER_SEARCHABLE_FIELDS: (keyof IUser)[] = ['name', 'email']

/** The mock backend's in-memory database: one typed collection per entity, plus reset. */
export interface IMockDatabase {
  events: IEntityCollection<IEvent>
  categories: IEntityCollection<ICategory>
  tickets: IEntityCollection<ITicket>
  users: IEntityCollection<IUser>
  /** Restores every collection to the deterministic seed, or to a given dataset override. */
  reset: (dataset?: ISeedDataset) => void
}

function currentDataset (database: Pick<IMockDatabase, 'events' | 'categories' | 'tickets' | 'users'>): ISeedDataset {
  return {
    events: database.events.list({ perPage: Number.MAX_SAFE_INTEGER }).data,
    categories: database.categories.list({ perPage: Number.MAX_SAFE_INTEGER }).data,
    tickets: database.tickets.list({ perPage: Number.MAX_SAFE_INTEGER }).data,
    users: database.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data
  }
}

function wrapWithPersistence<T extends IIdentifiable> (
  collection: IEntityCollection<T>,
  onChange: () => void
): IEntityCollection<T> {
  return {
    ...collection,
    insert: (record) => {
      const result = collection.insert(record)

      onChange()

      return result
    },
    update: (id, patch) => {
      const result = collection.update(id, patch)

      onChange()

      return result
    },
    remove: (id) => {
      const result = collection.remove(id)

      onChange()

      return result
    },
    replace: (records) => {
      collection.replace(records)
      onChange()
    }
  }
}

/**
 * Wires the three entity collections together behind one database handle.
 * Seeded from {@link createSeedDataset} by default, unless a persisted
 * dataset is available and persistence is enabled for the current
 * environment (see `src/mocks/db/persistence.ts`) — persistence is always
 * disabled under test, so suites start from the deterministic seed
 * regardless of what a previous browser session left in `localStorage`.
 *
 * Pass a dataset explicitly to seed (or reset to) a custom fixture instead
 * — the `resetDatabase()` test seam uses this.
 */
export function createDatabase (dataset?: ISeedDataset): IMockDatabase {
  const persistenceEnabled = dataset === undefined && !isPersistenceDisabled()
  const initialDataset = dataset ?? (persistenceEnabled ? loadPersistedDataset() : undefined) ?? createSeedDataset()

  const rawEvents = createCollection<IEvent>({
    initialRecords: initialDataset.events,
    searchableFields: EVENT_SEARCHABLE_FIELDS
  })
  const rawCategories = createCollection<ICategory>({
    initialRecords: initialDataset.categories,
    searchableFields: CATEGORY_SEARCHABLE_FIELDS
  })
  const rawTickets = createCollection<ITicket>({
    initialRecords: initialDataset.tickets,
    searchableFields: TICKET_SEARCHABLE_FIELDS
  })
  const rawUsers = createCollection<IUser>({
    initialRecords: initialDataset.users,
    searchableFields: USER_SEARCHABLE_FIELDS
  })

  function flush (): void {
    if (persistenceEnabled) {
      persistDataset(currentDataset({
        events: rawEvents,
        categories: rawCategories,
        tickets: rawTickets,
        users: rawUsers
      }))
    }
  }

  const events = wrapWithPersistence(rawEvents, flush)
  const categories = wrapWithPersistence(rawCategories, flush)
  const tickets = wrapWithPersistence(rawTickets, flush)
  const users = wrapWithPersistence(rawUsers, flush)

  // Replaces through the unwrapped collections and flushes once, rather than
  // serializing the whole dataset to `localStorage` once per collection.
  function reset (overrideDataset: ISeedDataset = createSeedDataset()): void {
    rawEvents.replace(overrideDataset.events)
    rawCategories.replace(overrideDataset.categories)
    rawTickets.replace(overrideDataset.tickets)
    rawUsers.replace(overrideDataset.users)
    flush()
  }

  return { events, categories, tickets, users, reset }
}
