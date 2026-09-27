import { apiClient } from '@/features/platform/api/client'

describe('GET /health through the shared mock server', () => {
  it('returns 200 with the HealthStatus contract shape', async () => {
    const response = await apiClient.get('/health')

    expect(response).toEqual<THealth>({ status: 'ok' })
  })
})
