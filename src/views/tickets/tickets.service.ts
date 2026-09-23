/**
 * Tickets service (GitHub issue #34, PRD-006 "Tickets list"). A thin
 * wrapper over `apiClient` — parameters in, data out, no store or
 * composable knowledge (code-conventions "Service layer"). Mirrors
 * `src/views/events/events.service.ts`'s shape. `price*` params are already
 * in minor units by the time they reach here — the minor-unit conversion
 * boundary for the price-range filter lives in `useTicketsList`, not this
 * service (code-conventions/PRD-006: "the minor-unit conversion exists in
 * exactly one module" per caller, never spread across layers).
 *
 * No `get(id)` here: this slice is list-only (no create/edit form yet, see
 * issue #35), so nothing in this view resolves a ticket by id. `RemoteSelect`
 * usages below are for events/categories, backed by their own services.
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

class TicketsService {
  list (params: ITicketListParams, signal?: AbortSignal): Promise<TTicketListResponse> {
    return apiClient.get('/tickets', { params, signal })
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
