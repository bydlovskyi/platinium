import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { apiClient } from './client'

/**
 * A self-contained MSW server local to this test. `src/mocks/server.ts` is
 * the shared Node server every other test wires up through `tests/setup.ts`,
 * but its own header comment reserves handler registration for the mock
 * database / MSW backend slices (#14/#15). This slice only needs to prove
 * that a handler answering the contract's `/health` path, run through the
 * real `apiClient`, produces a correctly-typed and correctly-shaped
 * response — so it stands up its own throwaway server rather than reaching
 * into the shared one.
 */
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
