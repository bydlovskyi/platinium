import { apiClient } from '@/features/platform/api/client'
import { SessionExpiredError } from '@/features/platform/api/interceptors/response.interceptor'
import { chaos } from '@/mocks/chaos'
import { notificationService } from '@/services/notification.service'
import { helpers } from '@/utils/helpers'

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

/**
 * Proves the required acceptance criterion for issue #18: a request without
 * a token receives 401 and triggers the interceptor's session-reset path.
 * This goes through the real `apiClient` (not raw `fetch`) against the real
 * `GET /auth/me` handler (`src/mocks/handlers/auth.ts`), served by the
 * shared MSW server. No token is persisted in `localStorage`, so
 * `getPersistedAuthToken()` (`src/features/platform/api/auth-token.ts`)
 * returns `null`, the request interceptor attaches no `Authorization`
 * header, `requireAuth` in the handler rejects with 401, and the response
 * interceptor's existing 401 path (`response.interceptor.ts`, built in
 * issue #16) takes over: it rejects with `SessionExpiredError` and
 * publishes `sessionExpired` via `helpers.eventEmitter` — the very
 * mechanism the not-yet-built auth store (#19) will subscribe to.
 */
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
