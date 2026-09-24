import type { IPaginationMeta } from './pagination.types'
import type { TSortOrder } from './types'

/** An inclusive `[min, max]` range filter. Either bound may be omitted. */
export interface IRangeFilter {
  min?: number | string
  max?: number | string
}

/**
 * An inclusive `[from, to]` window matched against a record's own
 * `[startField, endField]` range by *overlap*, not containment — a record
 * matches if any part of its range falls inside the window, even if it
 * started before the window or ends after it. Either bound may be omitted.
 */
export interface IOverlapFilter {
  startField: string
  endField: string
  from?: string
  to?: string
}

/**
 * Query options accepted by {@link IEntityCollection.list}, generic over a
 * record shape `T`.
 *
 * - `search` matches free text against the collection's declared searchable
 *   fields (case-insensitive substring match).
 * - `equals` filters records where the named field strictly equals the given
 *   value.
 * - `range` filters records where the named field falls within an inclusive
 *   `[min, max]` bound — works for numbers and ISO date strings alike since
 *   both compare correctly with `<=`/`>=`.
 * - `overlap` filters records whose own `[startField, endField]` range
 *   overlaps a requested `[from, to]` window — distinct from `range`, which
 *   tests a single field for containment within `[min, max]`.
 * - `sort`/`order` pick a field to sort by and a direction; ties always fall
 *   back to `id` ascending so relative order is stable across pages.
 * - `page`/`perPage` drive offset pagination, mirroring the contract's
 *   `PaginationMeta` shape.
 */
export interface IListQuery<T> {
  search?: string
  equals?: Partial<Record<keyof T, unknown>>
  range?: Partial<Record<keyof T, IRangeFilter>>
  overlap?: IOverlapFilter
  sort?: keyof T
  order?: TSortOrder
  page?: number
  perPage?: number
}

/** A page of records plus the pagination metadata describing the whole result set. */
export interface IListResult<T> {
  data: T[]
  meta: IPaginationMeta
}
