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

type TEventExportParams = Omit<IEventListParams, 'page' | 'perPage'>

interface IEventGetOptions {
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
