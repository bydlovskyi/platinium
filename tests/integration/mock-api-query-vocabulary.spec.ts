import { apiClient } from '@/features/platform/api/client'
import { createCollection } from '@/mocks/db'
import { createEntityHandlers } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import type { IEvent, TEventStatus } from '@/mocks/db'

/**
 * Proves the full query vocabulary — search, an equality filter, sort/order
 * and page/perPage — works end to end through the real service layer
 * (`apiClient`) for one entity, per PRD-001's testing boundary: "Handler
 * factory — integration tested through the service layer for one
 * representative entity, proving the query vocabulary is wired end to end."
 *
 * This uses the `events` shape from `src/mocks/db` purely as a realistic
 * stand-in and registers `/__test-events` on the shared node server
 * (`src/mocks/server.ts`) via `server.use(...)` — the same technique
 * `TESTING.md`'s own worked example uses for a handler no production route
 * owns. `/events` itself is not registered anywhere: the real path is
 * declared by its own dedicated contract slice (#25), which will call
 * `createEntityHandlers` the same way this test does and register the
 * result in `src/mocks/handlers/index.ts`. Until then this path must stay
 * one no production code or the contract would ever recognise, so this
 * test cannot be mistaken for that slice's work. `server.resetHandlers()`
 * runs after every test (`tests/setup.ts`), so this override never leaks
 * into another test file.
 */
const TEST_PATH = '/__test-events'

interface IListResponse {
  data: IEvent[]
  meta: TPaginationMeta
}

/**
 * `apiClient.get()`/`.post()`/etc. are typed generically over `TPathKeys`
 * from the generated OpenAPI schema (`src/features/platform/api/dts/axios.d.ts`),
 * so only a path actually declared in the contract type-checks there — by
 * design, so real endpoints can't drift from the contract unnoticed. This
 * throwaway path is deliberately not part of the contract (see the header
 * comment above), so this test goes through `apiClient.request()` instead,
 * which keeps axios's untyped signature and still runs through the exact
 * same configured instance, interceptors included.
 *
 * `request()`'s own type says it resolves an `AxiosResponse<T>`, but the
 * response interceptor (`response.interceptor.ts`) unwraps every response to
 * its `.data` at runtime — exactly as it does for every other request
 * through this instance — so the resolved value actually has the shape of
 * `IListResponse` directly. The cast documents that mismatch between the
 * base axios types (untouched by the interceptor) and this instance's real
 * runtime behaviour.
 */
async function getTestEvents (params?: Record<string, unknown>): Promise<IListResponse> {
  const response = await apiClient.request<IListResponse>({ method: 'get', url: TEST_PATH, params })

  return response as unknown as IListResponse
}

function seedEvents (): IEvent[] {
  const base = {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }

  return [
    { id: '1', name: 'Summer Music Festival', country: 'US', venue: 'Central Arena', startDate: '2026-06-01', endDate: '2026-06-02', status: 'published', ...base },
    { id: '2', name: 'Winter Tech Conference', country: 'DE', venue: 'Riverside Hall', startDate: '2026-01-10', endDate: '2026-01-11', status: 'draft', ...base },
    { id: '3', name: 'Spring Food Fair', country: 'US', venue: 'Grand Pavilion', startDate: '2026-03-05', endDate: '2026-03-06', status: 'published', ...base },
    { id: '4', name: 'Autumn Art Expo', country: 'FR', venue: 'City Stadium', startDate: '2026-09-15', endDate: '2026-09-16', status: 'cancelled', ...base },
    { id: '5', name: 'Downtown Comedy Night', country: 'US', venue: 'Old Town Square', startDate: '2026-04-20', endDate: '2026-04-20', status: 'published', ...base }
  ]
}

function registerTestEventsHandler (): void {
  const collection = createCollection<IEvent>({ initialRecords: seedEvents(), searchableFields: ['name', 'venue', 'country'] })

  const handlers = createEntityHandlers<IEvent>({
    path: TEST_PATH,
    collection,
    fields: {
      searchableFields: ['name', 'venue', 'country'],
      sortableFields: ['name', 'startDate'],
      equalityFilters: [{ field: 'status', parse: raw => raw as TEventStatus }]
    }
  })

  server.use(...handlers)
}

describe('the query vocabulary through apiClient, for one entity (events)', () => {
  beforeEach(() => registerTestEventsHandler())

  it('returns the shared envelope — a data array plus pagination meta — for an unfiltered list', async () => {
    const response = await getTestEvents()

    expect(response.meta).toEqual({ page: 1, perPage: 20, total: 5, totalPages: 1 })
    expect(response.data).toHaveLength(5)
  })

  it('search matches the declared searchable fields', async () => {
    const response = await getTestEvents({ search: 'festival' })

    expect(response.data.map((event: IEvent) => event.id)).toEqual(['1'])
  })

  it('an equality filter narrows results to matching records', async () => {
    const response = await getTestEvents({ status: 'published' })

    expect(response.data.map((event: IEvent) => event.id).sort()).toEqual(['1', '3', '5'])
  })

  it('sort and order control result ordering', async () => {
    const response = await getTestEvents({ sort: 'name', order: 'asc' })

    expect(response.data.map((event: IEvent) => event.name)).toEqual([
      'Autumn Art Expo',
      'Downtown Comedy Night',
      'Spring Food Fair',
      'Summer Music Festival',
      'Winter Tech Conference'
    ])
  })

  it('page and perPage together drive pagination and its reported meta', async () => {
    const firstPage = await getTestEvents({ sort: 'name', order: 'asc', page: 1, perPage: 2 })
    const secondPage = await getTestEvents({ sort: 'name', order: 'asc', page: 2, perPage: 2 })

    expect(firstPage.data.map((event: IEvent) => event.id)).toEqual(['4', '5'])
    expect(firstPage.meta).toEqual({ page: 1, perPage: 2, total: 5, totalPages: 3 })

    expect(secondPage.data.map((event: IEvent) => event.id)).toEqual(['3', '1'])
    expect(secondPage.meta).toEqual({ page: 2, perPage: 2, total: 5, totalPages: 3 })
  })

  it('combines search, filter, sort and pagination together in one request', async () => {
    const response = await getTestEvents({ search: 'e', status: 'published', sort: 'name', order: 'desc', page: 1, perPage: 10 })

    // "Spring Food Fair" (venue "Grand Pavilion", country "US") is `published`
    // but contains no "e" anywhere across the searchable fields, so it is
    // correctly excluded — this is what proves search and the equality
    // filter are combined with AND semantics, not OR.
    expect(response.data.map((event: IEvent) => event.name)).toEqual([
      'Summer Music Festival',
      'Downtown Comedy Night'
    ])
    expect(response.meta.total).toBe(2)
  })
})
