import { applyListQuery } from './list-query'
import type { IListQuery, IListResult } from './query.types'
import type { IIdentifiable } from './types'

export interface ICollectionOptions<T extends IIdentifiable> {
  initialRecords: T[]
  searchableFields: (keyof T)[]
}

export interface IEntityCollection<T extends IIdentifiable> {
  list: (query: IListQuery<T>) => IListResult<T>
  get: (id: string) => T | undefined
  insert: (record: T) => T
  update: (id: string, patch: Partial<T>) => T | undefined
  remove: (id: string) => boolean
  replace: (records: T[]) => void
}

// Copy on the way in too, so a caller holding an inserted/seeded reference can't mutate the store behind `update()`.
function copyAll<T extends IIdentifiable> (records: T[]): T[] {
  return records.map(record => ({ ...record }))
}

// Drops `undefined` keys so a patch built from optional inputs doesn't erase untouched fields.
function definedFieldsOf<T> (patch: Partial<T>): Partial<T> {
  const defined: Partial<T> = {}

  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (patch[key] !== undefined) {
      defined[key] = patch[key]
    }
  }

  return defined
}

export function createCollection<T extends IIdentifiable> (options: ICollectionOptions<T>): IEntityCollection<T> {
  let records: T[] = copyAll(options.initialRecords)

  return {
    // Records are flat, so a shallow copy is enough to stop callers mutating the shared store.
    list: (query) => {
      const result = applyListQuery(records, query, { searchableFields: options.searchableFields })

      return { ...result, data: result.data.map(record => ({ ...record })) }
    },

    get: (id) => {
      const record = records.find(record => record.id === id)

      return record === undefined ? undefined : { ...record }
    },

    insert: (record) => {
      if (records.some(existing => existing.id === record.id)) {
        throw new Error(`A record with id "${record.id}" already exists.`)
      }

      const stored = { ...record }

      records = [...records, stored]

      return { ...stored }
    },

    update: (id, patch) => {
      const index = records.findIndex(record => record.id === id)
      const existing = records[index]

      if (index === -1 || existing === undefined) {
        return undefined
      }

      const updated: T = Object.assign({}, existing, definedFieldsOf(patch))

      records = [...records.slice(0, index), updated, ...records.slice(index + 1)]

      return { ...updated }
    },

    remove: (id) => {
      const existed = records.some(record => record.id === id)

      records = records.filter(record => record.id !== id)

      return existed
    },

    replace: (newRecords) => {
      records = copyAll(newRecords)
    }
  }
}
