/**
 * Events service (GitHub issue #26, PRD-004 "Events list"). A thin wrapper
 * over `apiClient` for `GET /events` — parameters in, data out, no store or
 * composable knowledge (code-conventions "Service layer").
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

class EventsService {
  list (params: IEventListParams, signal?: AbortSignal): Promise<TEventListResponse> {
    return apiClient.get('/events', { params, signal })
  }
}

export const eventsService = new EventsService()
