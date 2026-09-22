import type { IPaginationMeta } from './pagination.types'
import type { TSortOrder } from './types'

/** An inclusive `[min, max]` range filter. Either bound may be omitted. */
export interface IRangeFilter {
  min?: number | string
  max?: number | string
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
 * - `sort`/`order` pick a field to sort by and a direction; ties always fall
 *   back to `id` ascending so relative order is stable across pages.
 * - `page`/`perPage` drive offset pagination, mirroring the contract's
 *   `PaginationMeta` shape.
 */
export interface IListQuery<T> {
  search?: string
  equals?: Partial<Record<keyof T, unknown>>
  range?: Partial<Record<keyof T, IRangeFilter>>
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
