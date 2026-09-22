import axios from 'axios'

import { chaos } from '../chaos'
import { createCollection, type IEntityCollection } from '../db'
import { createEntityHandlers, type IEntityHandlerOptions } from './factory'
import { server } from '../server'

interface IWidget {
  id: string
  name: string
  description: string
  price: number
  featured: boolean
  createdAt: string
}

function seedWidgets (): IWidget[] {
  return [
    { id: 'a', name: 'Anvil', description: 'Heavy duty steel anvil', price: 300, featured: true, createdAt: '2024-01-01' },
    { id: 'b', name: 'Bolt', description: 'Small fastener', price: 10, featured: false, createdAt: '2024-02-01' },
    { id: 'c', name: 'Crate', description: 'Wooden shipping crate', price: 50, featured: false, createdAt: '2024-03-01' }
  ]
}

/**
 * Registers a fresh set of `createEntityHandlers()` handlers onto the
 * shared node server (`src/mocks/server.ts`, already listening for the
 * whole suite via `tests/setup.ts`) via `server.use(...)`, rather than
 * standing up a second, independently-listening `setupServer` — MSW's node
 * interceptor is process-global, so two concurrently-listening servers in
 * the same process step on each other. `server.resetHandlers()` runs after
 * every test (`tests/setup.ts`), so each test starts from a clean handler
 * list regardless of prior overrides.
 */
function setupHandlerUnderTest (
  overrides: Partial<IEntityHandlerOptions<IWidget>> = {}
): IEntityCollection<IWidget> {
  const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name', 'description'] })

  const handlers = createEntityHandlers<IWidget>({
    path: '/widgets',
    collection,
    fields: {
      searchableFields: ['name', 'description'],
      sortableFields: ['name', 'price'],
      equalityFilters: [{ field: 'featured', parse: raw => raw === 'true' }],
      rangeFilters: [{ field: 'price' }]
    },
    ...overrides
  })

  server.use(...handlers)

  return collection
}

/**
 * Requests are driven through a plain `axios` instance — not `apiClient`
 * and not the raw `fetch` global. `apiClient`'s response interceptor
 * (`response.interceptor.ts`) deliberately unwraps a successful response to
 * `response.data` and discards the status code, which is convenient for
 * application code but means these handler-factory tests (which assert on
 * exact status codes like 201/204/409) need the untouched response. Plain
 * `axios` still goes through the same XHR/http layer `msw`'s interceptor
 * patches, exactly like `apiClient` — unlike jsdom's own `fetch` polyfill,
 * which is not one of the runtime layers `msw/node`'s interceptor patches,
 * and would silently miss every handler if used here instead.
 *
 * No `baseURL` is set: the request URL stays relative (`/widgets`), so it
 * resolves against jsdom's own default origin (`http://localhost:3000`),
 * matching how `apiClient` resolves it in production. Pointing it at an
 * explicit absolute origin like `http://localhost` (no port) resolves to a
 * different origin than the one MSW's path-only handlers are registered
 * against in this test environment, and the request goes unintercepted.
 */
async function requestFor (
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  data?: unknown
): Promise<{ status: number; body: unknown }> {
  const response = await axios.request({
    method,
    url: path,
    data,
    validateStatus: () => true
  })

  return { status: response.status, body: response.data }
}

describe('createEntityHandlers', () => {
  describe('list', () => {
    it('returns the shared envelope: a data array plus pagination meta', async () => {
      setupHandlerUnderTest()

      const { status, body } = await requestFor('get', '/widgets')

      expect(status).toBe(200)
      expect(body).toEqual({
        data: expect.any(Array),
        meta: { page: 1, perPage: 20, total: 3, totalPages: 1 }
      })
    })

    it('applies the search query parameter across declared searchable fields', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?search=anvil')

      expect((body as { data: IWidget[] }).data.map(w => w.id)).toEqual(['a'])
    })

    it('applies a declared equality filter, parsing the raw query value', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?featured=true')

      expect((body as { data: IWidget[] }).data.map(w => w.id)).toEqual(['a'])
    })

    it('applies a declared range filter via <field>Min/<field>Max parameters', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?priceMin=20&priceMax=100')

      expect((body as { data: IWidget[] }).data.map(w => w.id)).toEqual(['c'])
    })

    it('sorts by a declared sortable field and direction', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?sort=price&order=desc')

      expect((body as { data: IWidget[] }).data.map(w => w.id)).toEqual(['a', 'c', 'b'])
    })

    it('ignores a sort field that is not declared sortable', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?sort=description')

      // Falls back to unsorted (id-tiebreaker) order rather than sorting by an undeclared field.
      expect((body as { data: IWidget[] }).data.map(w => w.id)).toEqual(['a', 'b', 'c'])
    })

    it('paginates via page/perPage and reports meta accordingly', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?page=2&perPage=1&sort=name')

      expect((body as { data: IWidget[] }).data.map(w => w.id)).toEqual(['b'])
      expect((body as { meta: unknown }).meta).toEqual({ page: 2, perPage: 1, total: 3, totalPages: 3 })
    })
  })

  describe('create', () => {
    it('inserts a valid payload and returns 201 with the created record', async () => {
      const collection = setupHandlerUnderTest()

      const { status, body } = await requestFor('post', '/widgets', {
        id: 'd', name: 'Dolly', description: 'Anvil dolly', price: 75, featured: false, createdAt: '2024-04-01'
      })

      expect(status).toBe(201)
      expect((body as IWidget).id).toBe('d')
      expect(collection.get('d')).toBeDefined()
    })

    it('returns 400 with a per-field message map when validate() rejects the payload', async () => {
      setupHandlerUnderTest({
        validate: input => (input.name === undefined || input.name === '' ? { name: 'Name is required.' } : undefined)
      })

      const { status, body } = await requestFor('post', '/widgets', { id: 'd' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { name: 'Name is required.' }
      })
    })

    it('generates an id when no createRecord() is given and the payload carries none, so the record stays reachable', async () => {
      const collection = setupHandlerUnderTest()

      const { status, body } = await requestFor('post', '/widgets', {
        name: 'Dolly', description: 'Anvil dolly', price: 75, featured: false, createdAt: '2024-04-01'
      })

      const created = body as IWidget

      expect(status).toBe(201)
      expect(created.id).toEqual(expect.any(String))
      expect(created.id).not.toBe('')
      expect(collection.get(created.id)).toBeDefined()

      const read = await requestFor('get', `/widgets/${created.id}`)

      expect(read.status).toBe(200)
    })

    it('uses createRecord() to build the inserted record when provided', async () => {
      const collection = setupHandlerUnderTest({
        createRecord: input => ({ ...input, id: 'generated-id' } as IWidget)
      })

      await requestFor('post', '/widgets', { name: 'Dolly', description: 'x', price: 1, featured: false, createdAt: '2024-04-01' })

      expect(collection.get('generated-id')).toBeDefined()
    })
  })

  describe('read', () => {
    it('returns 200 with the record for a known id', async () => {
      setupHandlerUnderTest()

      const { status, body } = await requestFor('get', '/widgets/a')

      expect(status).toBe(200)
      expect((body as IWidget).id).toBe('a')
    })

    it('returns 404 with an ErrorResponse-shaped body for an unknown id', async () => {
      setupHandlerUnderTest()

      const { status, body } = await requestFor('get', '/widgets/unknown')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('update', () => {
    it('returns 200 with the updated record for a valid payload', async () => {
      const collection = setupHandlerUnderTest()

      const { status, body } = await requestFor('patch', '/widgets/a', { price: 999 })

      expect(status).toBe(200)
      expect((body as IWidget).price).toBe(999)
      expect(collection.get('a')?.price).toBe(999)
    })

    it('returns 404 for an unknown id without calling validate()', async () => {
      const validate = vi.fn()

      setupHandlerUnderTest({ validate })

      const { status } = await requestFor('patch', '/widgets/unknown', { price: 1 })

      expect(status).toBe(404)
      expect(validate).not.toHaveBeenCalled()
    })

    it('returns 400 with a per-field message map when validate() rejects the payload', async () => {
      setupHandlerUnderTest({
        validate: input => (input.price !== undefined && input.price < 0 ? { price: 'Price must not be negative.' } : undefined)
      })

      const { status, body } = await requestFor('patch', '/widgets/a', { price: -5 })

      expect(status).toBe(400)
      expect((body as TErrorResponse).errors).toEqual({ price: 'Price must not be negative.' })
    })

    it('returns 409 with the conflictCheck() message when it rejects the update', async () => {
      setupHandlerUnderTest({
        conflictCheck: (_record, action) => (action === 'update' ? 'Referenced by another resource.' : undefined)
      })

      const { status, body } = await requestFor('patch', '/widgets/a', { price: 1 })

      expect(status).toBe(409)
      expect(body).toEqual({ code: 'CONFLICT', message: 'Referenced by another resource.' })
    })
  })

  describe('delete', () => {
    it('returns 204 and removes the record for a known id', async () => {
      const collection = setupHandlerUnderTest()

      const { status } = await requestFor('delete', '/widgets/a')

      expect(status).toBe(204)
      expect(collection.get('a')).toBeUndefined()
    })

    it('returns 404 for an unknown id', async () => {
      setupHandlerUnderTest()

      const { status } = await requestFor('delete', '/widgets/unknown')

      expect(status).toBe(404)
    })

    it('returns 409 with the conflictCheck() message and does not remove the record', async () => {
      const collection = setupHandlerUnderTest({
        conflictCheck: (_record, action) => (action === 'delete' ? 'Referenced by a ticket.' : undefined)
      })

      const { status, body } = await requestFor('delete', '/widgets/a')

      expect(status).toBe(409)
      expect(body).toEqual({ code: 'CONFLICT', message: 'Referenced by a ticket.' })
      expect(collection.get('a')).toBeDefined()
    })
  })

  describe('chaos integration', () => {
    afterEach(() => chaos.clearChaos())

    it('answers with a forced status when one is registered for the path', async () => {
      setupHandlerUnderTest()

      chaos.failNextRequest({ path: '/widgets', status: 500 })

      const { status, body } = await requestFor('get', '/widgets')

      expect(status).toBe(500)
      expect((body as TErrorResponse).code).toBe('CHAOS_FORCED_FAILURE')
    })

    it('consumes a one-shot forced failure, so the next matching request answers normally', async () => {
      setupHandlerUnderTest()

      chaos.failNextRequest({ path: '/widgets', status: 500 })

      await requestFor('get', '/widgets')
      const { status } = await requestFor('get', '/widgets')

      expect(status).toBe(200)
    })

    it('forces a failure on the item path independently of the collection path', async () => {
      setupHandlerUnderTest()

      chaos.failNextRequest({ path: '/widgets/:id', status: 503 })

      const { status } = await requestFor('get', '/widgets/a')

      expect(status).toBe(503)
    })
  })
})
