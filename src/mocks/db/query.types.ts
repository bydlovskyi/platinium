import type { IPaginationMeta } from './pagination.types'
import type { TSortOrder } from './types'

export interface IRangeFilter {
  min?: number | string
  max?: number | string
}

/** Matches by overlap with the record's own `[startField, endField]` range, not containment. */
export interface IOverlapFilter {
  startField: string
  endField: string
  from?: string
  to?: string
}

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

export interface IListResult<T> {
  data: T[]
  meta: IPaginationMeta
}
