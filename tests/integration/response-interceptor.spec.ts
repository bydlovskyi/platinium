import { apiClient } from '@/features/platform/api/client'
import { chaos } from '@/mocks/chaos'
import { notificationService } from '@/services/notification.service'

/**
 * Proves the response interceptor's toast path end to end through the real
 * MSW server (`src/mocks/server.ts`, wired up by `tests/setup.ts`) rather
 * than a mocked service layer: force `/health` to answer 500 via the chaos
 * controls, make a real request through `apiClient`, and assert exactly one
 * error notification fired.
 */
describe('response interceptor — forced 500 via chaos controls', () => {
  it('produces exactly one error toast and rejects', async () => {
    const notifySpy = vi.spyOn(notificationService, 'error')

    chaos.failNextRequest({ path: '/health', status: 500 })

    await expect(apiClient.get('/health')).rejects.toBeDefined()

    expect(notifySpy).toHaveBeenCalledOnce()

    notifySpy.mockRestore()
  })
})
