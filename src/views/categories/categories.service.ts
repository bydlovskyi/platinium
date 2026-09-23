/**
 * Categories service (GitHub issue #30, PRD-005 "Ticket Categories
 * Management"). A thin wrapper over `apiClient` — parameters in, data out,
 * no store or composable knowledge (code-conventions "Service layer").
 * Mirrors `src/views/events/events.service.ts`'s shape exactly, minus a
 * `get` method: unlike events (a route-based form that loads its record from
 * `route.params.id`), the category edit dialog receives the full record
 * directly from the list's already-fetched row data, so there is no
 * fetch-by-id call anywhere in this feature.
 */
interface ICategoryListParams {
  search?: string
  sort?: string
  order?: TSortOrder
  page?: number
  perPage?: number
}

class CategoriesService {
  list (params: ICategoryListParams, signal?: AbortSignal): Promise<TCategoryListResponse> {
    return apiClient.get('/categories', { params, signal })
  }

  create (payload: TCategoryPayload): Promise<TCategory> {
    return apiClient.post('/categories', payload)
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
}

export const categoriesService = new CategoriesService()
