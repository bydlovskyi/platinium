import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { apiClient } from './client'

// A throwaway server: this test only needs /health, not the shared mock backend.
const healthServer = setupServer(
  http.get('/health', () => HttpResponse.json({ status: 'ok' } satisfies THealth))
)

describe('apiClient against the /health contract', () => {
  beforeAll(() => healthServer.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => healthServer.resetHandlers())
  afterAll(() => healthServer.close())

  it('returns a correctly-typed, correctly-shaped response', async () => {
    const response = await apiClient.get('/health')

    expect(response).toEqual<THealth>({ status: 'ok' })
  })
})
