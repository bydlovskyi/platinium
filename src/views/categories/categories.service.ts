type TCategoryListParams = Omit<NonNullable<TRequestQuery<'/categories', 'get'>>, 'format'>

type TCategoryExportParams = Omit<TCategoryListParams, 'page' | 'perPage'>

class CategoriesService {
  list (params: TCategoryListParams, signal?: AbortSignal): Promise<TCategoryListResponse> {
    return apiClient.get('/categories', { params, signal })
  }

  create (payload: TCategoryPayload): Promise<TCategory> {
    return apiClient.post('/categories', payload)
  }

  get (id: string, { showNotification }: { showNotification?: boolean } = {}): Promise<TCategory> {
    return apiClient.get('/categories/{id}', { dynamicKeys: { id }, showNotification })
  }

  update (id: string, payload: TCategoryPayload): Promise<TCategory> {
    return apiClient.patch('/categories/{id}', payload, { dynamicKeys: { id } })
  }

  delete (id: string): Promise<void> {
    return apiClient.delete('/categories/{id}', { dynamicKeys: { id } })
  }

  // Always resolves 200; per-id failures are reported in `result.failed` (archive always fails for categories).
  bulk (body: TBulkRequest): Promise<TBulkResult> {
    return apiClient.post('/categories/bulk', body)
  }

  exportCsv (params: TCategoryExportParams, signal?: AbortSignal): Promise<Blob> {
    return apiClient.get('/categories', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
      signal
    }) as unknown as Promise<Blob>
  }
}

export const categoriesService = new CategoriesService()
