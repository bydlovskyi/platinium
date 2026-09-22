import { applyListQuery } from './list-query'
import type { IListQuery, IListResult } from './query.types'
import type { IIdentifiable } from './types'

/** Options accepted by {@link createCollection}. */
export interface ICollectionOptions<T extends IIdentifiable> {
  initialRecords: T[]
  /** Fields matched by a free-text `search` query, declared once per collection. */
  searchableFields: (keyof T)[]
}

/**
 * A narrow, typed in-memory collection: list with query options, get by id,
 * insert, update, remove. Every entity's records live behind this same
 * interface so a future handler factory (slice #15) can wrap it identically
 * for every entity without behaviour diverging between them.
 */
export interface IEntityCollection<T extends IIdentifiable> {
  list: (query: IListQuery<T>) => IListResult<T>
  get: (id: string) => T | undefined
  insert: (record: T) => T
  update: (id: string, patch: Partial<T>) => T | undefined
  remove: (id: string) => boolean
  /** Replaces the entire underlying dataset, e.g. on reset-to-seed or persistence hydration. */
  replace: (records: T[]) => void
}

/**
 * Creates an in-memory, typed collection store over `T`. Pure and
 * synchronous — no MSW, no Vue, no network — so it is unit-testable in
 * isolation and reusable across Event, Category and Ticket alike.
 */
export function createCollection<T extends IIdentifiable> (options: ICollectionOptions<T>): IEntityCollection<T> {
  let records: T[] = [...options.initialRecords]

  return {
    // Shallow-copy each record on the way out: these are flat record shapes
    // (no nested objects/arrays), so `{ ...record }` is enough to stop a
    // caller's in-place mutation of a fetched record from silently
    // corrupting the shared store, bypassing `update()` and persistence.
    list: (query) => {
      const result = applyListQuery(records, query, { searchableFields: options.searchableFields })

      return { ...result, data: result.data.map(record => ({ ...record })) }
    },

    get: (id) => {
      const record = records.find(record => record.id === id)

      return record === undefined ? undefined : { ...record }
    },

    insert: (record) => {
      records = [...records, record]

      return { ...record }
    },

    update: (id, patch) => {
      const index = records.findIndex(record => record.id === id)
      const existing = records[index]

      if (index === -1 || existing === undefined) {
        return undefined
      }

      const updated: T = Object.assign({}, existing, patch)

      records = [...records.slice(0, index), updated, ...records.slice(index + 1)]

      return { ...updated }
    },

    remove: (id) => {
      const existed = records.some(record => record.id === id)

      records = records.filter(record => record.id !== id)

      return existed
    },

    replace: (newRecords) => {
      records = [...newRecords]
    }
  }
}
