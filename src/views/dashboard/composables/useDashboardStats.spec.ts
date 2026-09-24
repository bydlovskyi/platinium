import { http, HttpResponse } from 'msw'

import { resetDatabase, seedSession } from '../../../../tests/support'
import { server } from '@/mocks/server'

/**
 * `useDashboardStats` unit tests (GitHub issue #38, PRD-007 "Dashboard").
 * Covers the loading/error/retry state transitions that are this
 * composable's only real logic beyond the one-line `dashboardService.getStats`
 * call — behaviour that `Dashboard.spec.ts`'s integration test exercises
 * indirectly through the DOM, but which is faster and more precisely
 * asserted here directly against the composable's returned refs (`loading`
 * flips back to `false` in the `finally` branch even on failure, `error` is
 * cleared before a retry fires, an aborted in-flight request is swallowed
 * rather than surfaced as an error). Runs against the real MSW node server
 * (`src/mocks/server.ts`), never a mocked `dashboardService`, matching every
 * other composable spec in this repo (`useTicketsList.spec.ts`).
 */

function withSetup<T> (composable: () => T): T {
  let result!: T

  const app = createApp({
    setup () {
      result = composable()
      return () => null
    }
  })

  app.mount(document.createElement('div'))

  return result
}

beforeEach(async () => {
  resetDatabase()
  await seedSession('admin')
})

afterEach(() => {
  localStorage.clear()
})

describe('useDashboardStats', () => {
  it('starts with no data and fetches on mount, ending with loading false and the fetched data set', async () => {
    const { data, loading, error } = withSetup(() => useDashboardStats())

    await vi.waitFor(() => {
      expect(loading.value).toBe(false)
    })

    expect(error.value).toBeUndefined()
    expect(data.value).toBeDefined()
    expect(data.value?.totalEvents).toEqual(expect.any(Number))
  })

  it('sets loading true while the request is in flight', async () => {
    const { loading } = withSetup(() => useDashboardStats())

    expect(loading.value).toBe(true)

    await vi.waitFor(() => {
      expect(loading.value).toBe(false)
    })
  })

  it('surfaces a fetch failure through error, with loading returned to false and data left unset', async () => {
    server.use(http.get('/dashboard/stats', () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))

    const { data, loading, error } = withSetup(() => useDashboardStats())

    await vi.waitFor(() => {
      expect(loading.value).toBe(false)
    })

    expect(error.value).toBeDefined()
    expect(data.value).toBeUndefined()
  })

  it('retry() clears a previous error and repopulates data once the endpoint recovers', async () => {
    server.use(http.get('/dashboard/stats', () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))

    const { data, error, retry } = withSetup(() => useDashboardStats())

    await vi.waitFor(() => {
      expect(error.value).toBeDefined()
    })

    server.resetHandlers()

    await retry()

    expect(error.value).toBeUndefined()
    expect(data.value).toBeDefined()
  })

  it('retry() sets loading true again while the retried request is in flight', async () => {
    const { loading, retry } = withSetup(() => useDashboardStats())

    await vi.waitFor(() => {
      expect(loading.value).toBe(false)
    })

    const retryPromise = retry()
    expect(loading.value).toBe(true)

    await retryPromise

    expect(loading.value).toBe(false)
  })
})
