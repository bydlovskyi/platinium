// priceMin/priceMax are in minor units.
type TTicketListParams = Omit<NonNullable<TRequestQuery<'/tickets', 'get'>>, 'format'>

type TTicketExportParams = Omit<TTicketListParams, 'page' | 'perPage'>

class TicketsService {
  list (params: TTicketListParams, signal?: AbortSignal): Promise<TTicketListResponse> {
    return apiClient.get('/tickets', { params, signal })
  }

  create (payload: TTicketPayload): Promise<TTicket> {
    return apiClient.post('/tickets', payload)
  }

  get (id: string, { showNotification }: { showNotification?: boolean } = {}): Promise<TTicket> {
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
      params: { ...params, format: 'csv' },
      responseType: 'blob',
      signal
    }) as unknown as Promise<Blob>
  }
}

export const ticketsService = new TicketsService()
