import { apiClient } from '@/features/platform/api/client'
import { SessionExpiredError } from '@/features/platform/api/interceptors/response.interceptor'
import { chaos } from '@/mocks/chaos'
import { notificationService } from '@/services/notification.service'
import { helpers } from '@/utils/helpers'

describe('response interceptor — forced 500 via chaos controls', () => {
  it('produces exactly one error toast and rejects', async () => {
    const notifySpy = vi.spyOn(notificationService, 'error')

    chaos.failNextRequest({ path: '/health', status: 500 })

    await expect(apiClient.get('/health')).rejects.toBeDefined()

    expect(notifySpy).toHaveBeenCalledOnce()

    notifySpy.mockRestore()
  })
})

describe('request interceptor — no persisted token against a protected endpoint', () => {
  it('rejects with SessionExpiredError and publishes sessionExpired', async () => {
    localStorage.clear()

    const listener = vi.fn()
    const subscription = helpers.eventEmitter.listen('sessionExpired', listener)

    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(SessionExpiredError)

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))

    subscription.remove()
  })
})
