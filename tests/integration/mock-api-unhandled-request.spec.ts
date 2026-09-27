import { apiClient } from '@/features/platform/api/client'

describe('an unhandled request through the shared mock server', () => {
  it('rejects the calling promise instead of passing through', async () => {
    // `request()` is untyped (unlike `.get()`), so a nonexistent path type-checks.
    await expect(apiClient.request({ method: 'get', url: '/this-path-has-no-handler' })).rejects.toBeTruthy()
  })
})
