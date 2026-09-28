import type { IListQuery, IListResult, IOverlapFilter, IRangeFilter } from './query.types'
import type { IIdentifiable } from './types'

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

interface IListQueryOptions<T> {
  searchableFields: (keyof T)[]
}

function matchesSearch<T> (record: T, term: string, searchableFields: (keyof T)[]): boolean {
  const needle = term.trim().toLowerCase()

  if (needle === '') {
    return true
  }

  return searchableFields.some((field) => {
    const value = record[field]

    return typeof value === 'string' && value.toLowerCase().includes(needle)
  })
}

function matchesEquals<T> (record: T, equals: NonNullable<IListQuery<T>['equals']>): boolean {
  return (Object.keys(equals) as (keyof T)[])
    .filter(field => equals[field] !== undefined)
    .every(field => record[field] === equals[field])
}

function isWithinRange (value: unknown, range: IRangeFilter): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return false
  }

  if (range.min !== undefined && value < range.min) {
    return false
  }

  if (range.max !== undefined && value > range.max) {
    return false
  }

  return true
}

function matchesRange<T> (record: T, range: NonNullable<IListQuery<T>['range']>): boolean {
  return (Object.keys(range) as (keyof T)[]).every((field) => {
    const filter = range[field]

    return filter === undefined || isWithinRange(record[field], filter)
  })
}

function rangesOverlap (recordStart: string, recordEnd: string, overlap: IOverlapFilter): boolean {
  if (overlap.from !== undefined && recordEnd < overlap.from) {
    return false
  }

  if (overlap.to !== undefined && recordStart > overlap.to) {
    return false
  }

  return true
}

function matchesOverlap<T> (record: T, overlap: IOverlapFilter): boolean {
  const recordStart = record[overlap.startField as keyof T]
  const recordEnd = record[overlap.endField as keyof T]

  if (typeof recordStart !== 'string' || typeof recordEnd !== 'string') {
    return false
  }

  return rangesOverlap(recordStart, recordEnd, overlap)
}

function compareValues (a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return String(a).localeCompare(String(b))
}

function sortRecords<T extends IIdentifiable> (records: T[], sort: keyof T | undefined, order: 'asc' | 'desc'): T[] {
  const direction = order === 'desc' ? -1 : 1

  return [...records].sort((a, b) => {
    if (sort !== undefined) {
      const primary = compareValues(a[sort], b[sort])

      if (primary !== 0) {
        return primary * direction
      }
    }

    // Tiebreak id-ascending regardless of `order` so equal values keep a stable order across pages.
    return compareValues(a.id, b.id)
  })
}

function atLeastOne (value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(value, 1) : fallback
}

export function applyListQuery<T extends IIdentifiable> (
  records: T[],
  query: IListQuery<T>,
  options: IListQueryOptions<T>
): IListResult<T> {
  let filtered = records

  if (query.search !== undefined) {
    filtered = filtered.filter(record => matchesSearch(record, query.search ?? '', options.searchableFields))
  }

  if (query.equals !== undefined) {
    filtered = filtered.filter(record => matchesEquals(record, query.equals ?? {}))
  }

  if (query.range !== undefined) {
    filtered = filtered.filter(record => matchesRange(record, query.range ?? {}))
  }

  const overlap = query.overlap

  if (overlap !== undefined) {
    filtered = filtered.filter(record => matchesOverlap(record, overlap))
  }

  const sorted = sortRecords(filtered, query.sort, query.order ?? 'asc')

  // Clamp rather than throw: `page`/`perPage` <= 0 or NaN would corrupt the offset math (negative slice, NaN meta).
  const page = atLeastOne(query.page, DEFAULT_PAGE)
  const perPage = atLeastOne(query.perPage, DEFAULT_PER_PAGE)
  const total = sorted.length
  const totalPages = Math.ceil(total / perPage)

  const start = (page - 1) * perPage
  const data = sorted.slice(start, start + perPage)

  return {
    data,
    meta: { page, perPage, total, totalPages }
  }
}
