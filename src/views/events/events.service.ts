/**
 * Events service (GitHub issue #26 "Events list", extended by #27 "Events
 * form" with `create`/`get`/`update`, and #28 "Events deletion" with
 * `delete`). A thin wrapper over `apiClient` — parameters in, data out, no
 * store or composable knowledge (code-conventions "Service layer").
 */
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
}

export const eventsService = new EventsService()
