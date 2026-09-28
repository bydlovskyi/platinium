import { chaos } from '@/mocks/chaos'
import { server } from '@/mocks/server'

import './support/intersection-observer'
import './support/match-media'

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' })

  // jsdom + MSW's XHR interceptor break on responseType 'blob', so CSV exports use the fetch adapter here
  // (it needs an absolute baseURL). Only here: this axios version's fetch adapter drops `error.response`.
  // Imported lazily so a spec's own `vi.mock` of a module in the client's import graph still applies.
  const { apiClient } = await import('@/features/platform/api/client')

  apiClient.interceptors.request.use((config) => {
    if (config.responseType === 'blob') {
      config.adapter = 'fetch'
      config.baseURL = config.baseURL ?? window.location.origin
    }

    return config
  })
})
afterEach(() => {
  server.resetHandlers()
  chaos.clearChaos()
})
afterAll(() => server.close())
