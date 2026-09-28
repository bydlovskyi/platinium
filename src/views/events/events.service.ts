import { blobExportTestOverrides } from '@/features/platform/api/helpers'

type TEventListParams = Omit<NonNullable<TRequestQuery<'/events', 'get'>>, 'format'>

type TEventExportParams = Omit<TEventListParams, 'page' | 'perPage'>

class EventsService {
  list (params: TEventListParams, signal?: AbortSignal): Promise<TEventListResponse> {
    return apiClient.get('/events', { params, signal })
  }

  create (payload: TEventPayload): Promise<TEvent> {
    return apiClient.post('/events', payload)
  }

  get (id: string, { showNotification }: { showNotification?: boolean } = {}): Promise<TEvent> {
    return apiClient.get('/events/{id}', { dynamicKeys: { id }, showNotification })
  }

  update (id: string, payload: TEventPayload): Promise<TEvent> {
    return apiClient.patch('/events/{id}', payload, { dynamicKeys: { id } })
  }

  delete (id: string): Promise<void> {
    return apiClient.delete('/events/{id}', { dynamicKeys: { id } })
  }

  // Always resolves 200; per-id failures are reported in `result.failed`.
  bulk (body: TBulkRequest): Promise<TBulkResult> {
    return apiClient.post('/events/bulk', body)
  }

  // The schema types CSV responses as the JSON envelope; responseType 'blob' yields a Blob at runtime, hence the cast.
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
