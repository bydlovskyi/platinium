import { chaos } from '@/mocks/chaos'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  chaos.clearChaos()
})
afterAll(() => server.close())
