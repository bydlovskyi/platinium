import { setupServer } from 'msw/node'

import { apiClient } from '@/features/platform/api/client'

/**
 * Proves an unhandled request fails loudly rather than falling through
 * silently — the behaviour `tests/setup.ts` relies on
 * (`onUnhandledRequest: 'error'`) to catch an endpoint a service calls but
 * the mock never implemented. Uses its own scoped `setupServer`, listened
 * to and closed within the test, so asserting on this failure mode does not
 * affect the shared server every other test uses.
 */
describe('an unhandled request', () => {
  it('rejects the calling promise instead of passing through', async () => {
    const scopedServer = setupServer()

    scopedServer.listen({ onUnhandledRequest: 'error' })

    try {
      // `apiClient.request()` keeps axios's untyped signature (unlike
      // `.get()`, which is generic over the contract's declared paths), so
      // a deliberately-nonexistent path type-checks here.
      await expect(apiClient.request({ method: 'get', url: '/this-path-has-no-handler' })).rejects.toBeTruthy()
    } finally {
      scopedServer.close()
    }
  })
})
