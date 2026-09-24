/**
 * Categories service (GitHub issue #30, PRD-005 "Ticket Categories
 * Management"; extended by GitHub issue #34, PRD-006 "Tickets list" with
 * `get`). A thin wrapper over `apiClient` — parameters in, data out, no
 * store or composable knowledge (code-conventions "Service layer"). Mirrors
 * `src/views/events/events.service.ts`'s shape. The category edit dialog
 * itself still receives the full record directly from the list's
 * already-fetched row data rather than calling `get` — `get` exists purely
 * so `RemoteSelect`'s `resolveOption` (issue #33) can fetch a preselected
 * category by id from the tickets list/form, the same way
 * `eventsService.get` backs the event picker.
 */
import { blobExportTestOverrides } from '@/features/platform/api/helpers'

interface ICategoryListParams {
  search?: string
  sort?: string
  order?: TSortOrder
  page?: number
  perPage?: number
}

/** `ICategoryListParams` minus pagination — the CSV export always covers the full filtered result, never one page (GitHub issue #40, PRD-007). */
type TCategoryExportParams = Omit<ICategoryListParams, 'page' | 'perPage'>

class CategoriesService {
  list (params: ICategoryListParams, signal?: AbortSignal): Promise<TCategoryListResponse> {
    return apiClient.get('/categories', { params, signal })
  }

  create (payload: TCategoryPayload): Promise<TCategory> {
    return apiClient.post('/categories', payload)
  }

  get (id: string): Promise<TCategory> {
    return apiClient.get('/categories/{id}', { dynamicKeys: { id } })
  }

  update (id: string, payload: TCategoryPayload): Promise<TCategory> {
    return apiClient.patch('/categories/{id}', payload, { dynamicKeys: { id } })
  }

  /**
   * Rejects with a `DependencyConflictError` (via the response interceptor)
   * when tickets still reference this category — the interceptor also
   * suppresses its own generic toast for a 409 so the caller can render the
   * specific blocking-count message instead, exactly like
   * `eventsService.delete`.
   */
  delete (id: string): Promise<void> {
    return apiClient.delete('/categories/{id}', { dynamicKeys: { id } })
  }

  /**
   * Applies `body.operation` to every id in `body.ids` and always resolves
   * `200` with a `TBulkResult`, exactly like `eventsService.bulk` (GitHub
   * issue #39, PRD-007). Categories have no status field, so the mock
   * reports every id as a per-identifier `UNSUPPORTED_OPERATION` failure for
   * `operation: 'archive'` — this method itself stays entity-agnostic and
   * makes no assumption about which operations succeed.
   */
  bulk (body: TBulkRequest): Promise<TBulkResult> {
    return apiClient.post('/categories/bulk', body)
  }

  /**
   * Requests the full filtered/sorted result as a CSV `Blob` (GitHub issue
   * #40, PRD-007 "CSV export"), mirroring `eventsService.exportCsv` exactly —
   * see that method's comment, and `blobExportTestOverrides`'s own, for why
   * the response is cast rather than typed through the generated schema and
   * why the adapter/`baseURL` overrides apply only under Vitest.
   */
  exportCsv (params: TCategoryExportParams, signal?: AbortSignal): Promise<Blob> {
    return apiClient.get('/categories', {
      ...blobExportTestOverrides(apiClient.defaults.baseURL),
      params: { ...params, format: 'csv' },
      responseType: 'blob',
      signal
    }) as unknown as Promise<Blob>
  }
}

export const categoriesService = new CategoriesService()
