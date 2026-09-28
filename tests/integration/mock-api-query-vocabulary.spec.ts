import { apiClient } from '@/features/platform/api/client'
import { createCollection } from '@/mocks/db'
import { createEntityHandlers } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import type { IEvent, TEventStatus } from '@/mocks/db'

// Deliberately not a contract path, so it can't collide with a real handler.
const TEST_PATH = '/__test-events'

interface IListResponse {
  data: IEvent[]
  meta: TPaginationMeta
}

// Untyped `request()` because the path isn't in the contract; the response interceptor
// unwraps to `.data` at runtime, hence the cast.
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

    // "Spring Food Fair" is published but has no "e" in any searchable field,
    // proving search and the equality filter combine with AND, not OR.
    expect(response.data.map((event: IEvent) => event.name)).toEqual([
      'Summer Music Festival',
      'Downtown Comedy Night'
    ])
    expect(response.meta.total).toBe(2)
  })
})
