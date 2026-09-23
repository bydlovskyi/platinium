/**
 * Tickets service (GitHub issue #34, PRD-006 "Tickets list"; extended by
 * GitHub issue #35 "Tickets form" with `create`/`get`/`update`). A thin
 * wrapper over `apiClient` — parameters in, data out, no store or
 * composable knowledge (code-conventions "Service layer"). Mirrors
 * `src/views/events/events.service.ts`'s shape. `price*` params are already
 * in minor units by the time they reach here — the minor-unit conversion
 * boundary for the price-range filter lives in `useTicketsList`, not this
 * service (code-conventions/PRD-006: "the minor-unit conversion exists in
 * exactly one module" per caller, never spread across layers).
 */
interface ITicketListParams {
  search?: string
  eventId?: string
  categoryId?: string
  status?: TTicketStatus
  currency?: TCurrency
  priceMin?: number
  priceMax?: number
  sort?: string
  order?: TSortOrder
  page?: number
  perPage?: number
}

interface ITicketGetOptions {
  /** Suppresses the response interceptor's global error toast — the edit route renders its own `el-result` for a 404 instead. */
  showNotification?: boolean
}

class TicketsService {
  list (params: ITicketListParams, signal?: AbortSignal): Promise<TTicketListResponse> {
    return apiClient.get('/tickets', { params, signal })
  }

  create (payload: TTicketPayload): Promise<TTicket> {
    return apiClient.post('/tickets', payload)
  }

  get (id: string, { showNotification }: ITicketGetOptions = {}): Promise<TTicket> {
    return apiClient.get('/tickets/{id}', { dynamicKeys: { id }, showNotification })
  }

  update (id: string, payload: TTicketPayload): Promise<TTicket> {
    return apiClient.patch('/tickets/{id}', payload, { dynamicKeys: { id } })
  }

  /**
   * Succeeds without a dependency check (PRD-006 "Referential validation" —
   * "Tickets are leaves: nothing references them, so deletion has no
   * dependency check"), unlike `eventsService.delete`/`categoriesService.delete`
   * which can reject with a `DependencyConflictError`.
   */
  delete (id: string): Promise<void> {
    return apiClient.delete('/tickets/{id}', { dynamicKeys: { id } })
  }
}

export const ticketsService = new TicketsService()
