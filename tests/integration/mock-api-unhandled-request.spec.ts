import { apiClient } from '@/features/platform/api/client'

/**
 * Proves an unhandled request fails loudly rather than falling through
 * silently. This goes through the shared Node server every test runs against
 * (`src/mocks/server.ts`, started by `tests/setup.ts` with
 * `onUnhandledRequest: 'error'`) rather than a scoped server of its own,
 * because the shared configuration is the thing worth asserting on: it is
 * what catches an endpoint a service calls but the mock never implemented.
 * A scoped server would have proved only that MSW behaves as documented.
 */
describe('an unhandled request through the shared mock server', () => {
  it('rejects the calling promise instead of passing through', async () => {
    // `apiClient.request()` keeps axios's untyped signature (unlike `.get()`,
    // which is generic over the contract's declared paths), so a
    // deliberately-nonexistent path type-checks here.
    await expect(apiClient.request({ method: 'get', url: '/this-path-has-no-handler' })).rejects.toBeTruthy()
  })
})
