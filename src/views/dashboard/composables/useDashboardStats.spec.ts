import { http, HttpResponse } from 'msw'

import { resetDatabase, seedSession } from '../../../../tests/support'
import { server } from '@/mocks/server'

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
