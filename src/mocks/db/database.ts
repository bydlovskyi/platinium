import { createCollection, type IEntityCollection } from './collection'
import { createSeedDataset, type ISeedDataset } from './fixtures'
import { isPersistenceDisabled, loadPersistedDataset, persistDataset } from './persistence'
import type { ICategory, IEvent, IIdentifiable, ITicket, IUser } from './types'

// `country` has its own exact-match filter, so it's deliberately excluded from free-text search.
const EVENT_SEARCHABLE_FIELDS: (keyof IEvent)[] = ['name', 'venue']
const CATEGORY_SEARCHABLE_FIELDS: (keyof ICategory)[] = ['name', 'description']
const TICKET_SEARCHABLE_FIELDS: (keyof ITicket)[] = ['name']
const USER_SEARCHABLE_FIELDS: (keyof IUser)[] = ['name', 'email']

export interface IMockDatabase {
  events: IEntityCollection<IEvent>
  categories: IEntityCollection<ICategory>
  tickets: IEntityCollection<ITicket>
  users: IEntityCollection<IUser>
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

  // Replace via the unwrapped collections so `localStorage` is written once, not once per collection.
  function reset (overrideDataset: ISeedDataset = createSeedDataset()): void {
    rawEvents.replace(overrideDataset.events)
    rawCategories.replace(overrideDataset.categories)
    rawTickets.replace(overrideDataset.tickets)
    rawUsers.replace(overrideDataset.users)
    flush()
  }

  return { events, categories, tickets, users, reset }
}
