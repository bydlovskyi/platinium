import { blobExportTestOverrides } from '@/features/platform/api/helpers'

// priceMin/priceMax are in minor units.
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

type TTicketExportParams = Omit<ITicketListParams, 'page' | 'perPage'>

interface ITicketGetOptions {
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

  delete (id: string): Promise<void> {
    return apiClient.delete('/tickets/{id}', { dynamicKeys: { id } })
  }

  // Always resolves 200; per-id failures are reported in `result.failed`.
  bulk (body: TBulkRequest): Promise<TBulkResult> {
    return apiClient.post('/tickets/bulk', body)
  }

  exportCsv (params: TTicketExportParams, signal?: AbortSignal): Promise<Blob> {
    return apiClient.get('/tickets', {
      ...blobExportTestOverrides(apiClient.defaults.baseURL),
      params: { ...params, format: 'csv' },
      responseType: 'blob',
      signal
    }) as unknown as Promise<Blob>
  }
}

export const ticketsService = new TicketsService()
