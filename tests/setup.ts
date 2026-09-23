import { chaos } from '@/mocks/chaos'
import { server } from '@/mocks/server'

import './support/match-media'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  chaos.clearChaos()
})
afterAll(() => server.close())
