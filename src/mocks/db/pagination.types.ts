/**
 * Shared pagination envelope metadata, mirroring `PaginationMeta` in
 * `src/mocks/openapi.yaml`: current page, page size, total item count and
 * total page count.
 */
export interface IPaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}
