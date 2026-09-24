/**
 * Events service (GitHub issue #26 "Events list", extended by #27 "Events
 * form" with `create`/`get`/`update`, and #28 "Events deletion" with
 * `delete`). A thin wrapper over `apiClient` — parameters in, data out, no
 * store or composable knowledge (code-conventions "Service layer").
 */
import { blobExportTestOverrides } from '@/features/platform/api/helpers'

interface IEventListParams {
  search?: string
  status?: TEventStatus
  country?: string
  startDateFrom?: string
  startDateTo?: string
  sort?: string
  order?: TSortOrder
  page?: number
  perPage?: number
}

/** `IEventListParams` minus pagination — the CSV export always covers the full filtered result, never one page (GitHub issue #40, PRD-007). */
type TEventExportParams = Omit<IEventListParams, 'page' | 'perPage'>

interface IEventGetOptions {
  /** Suppresses the response interceptor's global error toast — the edit route renders its own `el-result` for a 404 instead. */
  showNotification?: boolean
}

class EventsService {
  list (params: IEventListParams, signal?: AbortSignal): Promise<TEventListResponse> {
    return apiClient.get('/events', { params, signal })
  }

  create (payload: TEventPayload): Promise<TEvent> {
    return apiClient.post('/events', payload)
  }

  get (id: string, { showNotification }: IEventGetOptions = {}): Promise<TEvent> {
    return apiClient.get('/events/{id}', { dynamicKeys: { id }, showNotification })
  }

  update (id: string, payload: TEventPayload): Promise<TEvent> {
    return apiClient.patch('/events/{id}', payload, { dynamicKeys: { id } })
  }

  /**
   * Rejects with a `DependencyConflictError` (via the response interceptor)
   * when tickets still reference this event — the interceptor also
   * suppresses its own generic toast for a 409 so the caller can render the
   * specific blocking-count message instead (GitHub issue #28).
   */
  delete (id: string): Promise<void> {
    return apiClient.delete('/events/{id}', { dynamicKeys: { id } })
  }

  /**
   * Applies `body.operation` (`delete` or `archive`) to every id in
   * `body.ids`, one at a time server-side, and always resolves `200` with a
   * `TBulkResult` — per-identifier failures (not-found, a referential
   * conflict) are reported in `result.failed` rather than rejecting the
   * whole request (GitHub issue #39, PRD-007).
   */
  bulk (body: TBulkRequest): Promise<TBulkResult> {
    return apiClient.post('/events/bulk', body)
  }

  /**
   * Requests the full filtered/sorted result as a CSV `Blob` (GitHub issue
   * #40, PRD-007 "CSV export") — `format: 'csv'` is the same content-negotiated
   * `GET /events` this `list` method calls, just asking for `text/csv`
   * instead of the JSON envelope, so filter/sort semantics can never drift
   * between the two. The contract types `GET /events`'s success response as
   * `TEventListResponse` (the JSON shape) regardless of `format`, since
   * `text/csv` is a different response content type the generated schema
   * does not model as a separate return type — `responseType: 'blob'` makes
   * axios actually resolve a `Blob` at runtime, so the cast bridges that gap
   * rather than fighting the generated types.
   *
   * `blobExportTestOverrides` (only applied under Vitest, see its own
   * comment) exists purely to route around a jsdom/MSW test-environment
   * limitation. It must NOT apply outside tests: axios's `fetch` adapter in
   * this axios version drops `error.response` on any non-2xx status (its
   * `fetch.js` re-wraps the settle()-rejected `AxiosError` via
   * `AxiosError.from(err, err.code, config, request)`, omitting the 5th
   * `response` argument) — verified live by forcing a 500 and inspecting the
   * caught error. Under that adapter every real failure (400/403/409/500)
   * would misreport through the response interceptor as "Unable to reach the
   * server", masking the actual error. A real browser's default XHR adapter
   * has no such defect and handles `responseType: 'blob'` natively, so
   * production never needs this override in the first place.
   */
  exportCsv (params: TEventExportParams, signal?: AbortSignal): Promise<Blob> {
    return apiClient.get('/events', {
      ...blobExportTestOverrides(apiClient.defaults.baseURL),
      params: { ...params, format: 'csv' },
      responseType: 'blob',
      signal
    }) as unknown as Promise<Blob>
  }
}

export const eventsService = new EventsService()
