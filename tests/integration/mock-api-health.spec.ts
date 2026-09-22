import { apiClient } from '@/features/platform/api/client'

/**
 * Proves `GET /health` is served by the real, production handler
 * registration — the shared Node server (`src/mocks/server.ts`, wired up
 * for every test by `tests/setup.ts`) rather than a throwaway server local
 * to a test file. This is what shows the handler declared in
 * `src/mocks/handlers/health.ts` is actually registered where the app runs.
 */
describe('GET /health through the shared mock server', () => {
  it('returns 200 with the HealthStatus contract shape', async () => {
    const response = await apiClient.get('/health')

    expect(response).toEqual<THealth>({ status: 'ok' })
  })
})
