import { blobExportTestOverrides } from '@/features/platform/api/helpers'

interface ICategoryListParams {
  search?: string
  sort?: string
  order?: TSortOrder
  page?: number
  perPage?: number
}

type TCategoryExportParams = Omit<ICategoryListParams, 'page' | 'perPage'>

class CategoriesService {
  list (params: ICategoryListParams, signal?: AbortSignal): Promise<TCategoryListResponse> {
    return apiClient.get('/categories', { params, signal })
  }

  create (payload: TCategoryPayload): Promise<TCategory> {
    return apiClient.post('/categories', payload)
  }

  get (id: string): Promise<TCategory> {
    return apiClient.get('/categories/{id}', { dynamicKeys: { id } })
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
      ...blobExportTestOverrides(apiClient.defaults.baseURL),
      params: { ...params, format: 'csv' },
      responseType: 'blob',
      signal
    }) as unknown as Promise<Blob>
  }
}

export const categoriesService = new CategoriesService()
