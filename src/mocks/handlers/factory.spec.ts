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

interface IBooking {
  id: string
  label: string
  start: string
  end: string
}

function seedBookings (): IBooking[] {
  return [
    { id: 'x', label: 'Early booking', start: '2024-01-01', end: '2024-01-10' },
    { id: 'y', label: 'Mid booking', start: '2024-02-01', end: '2024-02-10' },
    { id: 'z', label: 'Late booking', start: '2024-03-01', end: '2024-03-10' }
  ]
}

function setupBookingHandlerUnderTest (): IEntityCollection<IBooking> {
  const collection = createCollection<IBooking>({ initialRecords: seedBookings(), searchableFields: ['label'] })

  const handlers = createEntityHandlers<IBooking>({
    path: '/bookings',
    collection,
    fields: {
      sortableFields: ['start'],
      overlapFilters: [{ startField: 'start', endField: 'end', param: 'start' }]
    }
  })

  server.use(...handlers)

  return collection
}

// Extends the shared server via `server.use()`: MSW's node interceptor is process-global, so a second server would conflict.
function setupHandlerUnderTest (
  overrides: Partial<IEntityHandlerOptions<IWidget>> = {}
): IEntityCollection<IWidget> {
  const collection = createCollection<IWidget>({ initialRecords: seedWidgets(), searchableFields: ['name', 'description'] })

  const handlers = createEntityHandlers<IWidget>({
    path: '/widgets',
    collection,
    fields: {
      sortableFields: ['name', 'price'],
      equalityFilters: [{ field: 'featured', parse: raw => raw === 'true' }],
      rangeFilters: [{ field: 'price' }]
    },
    ...overrides
  })

  server.use(...handlers)

  return collection
}

// Plain axios, not `apiClient` (drops status codes) or jsdom's `fetch` (not intercepted by msw/node).
// No `baseURL`: an explicit origin like `http://localhost` misses MSW's path-only handlers here.
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

    it('returns every record unfiltered when a declared overlapFilters param has no matching query params', async () => {
      setupBookingHandlerUnderTest()

      const { body } = await requestFor('get', '/bookings')

      expect((body as { data: IBooking[] }).data.map(b => b.id).sort()).toEqual(['x', 'y', 'z'])
    })

    it('applies a declared overlapFilters param via <param>From/<param>To, matching by overlap rather than containment', async () => {
      setupBookingHandlerUnderTest()

      const { body } = await requestFor('get', '/bookings?startFrom=2024-01-05&startTo=2024-02-05')

      // 'x' (2024-01-01..2024-01-10) overlaps the window despite starting before it.
      // 'y' (2024-02-01..2024-02-10) overlaps the window despite ending after it.
      // 'z' (2024-03-01..2024-03-10) is entirely after the window.
      expect((body as { data: IBooking[] }).data.map(b => b.id).sort()).toEqual(['x', 'y'])
    })
  })

  describe('create', () => {
    it('inserts a valid payload and returns 201 with the created record', async () => {
      const collection = setupHandlerUnderTest()

      const { status, body } = await requestFor('post', '/widgets', {
        name: 'Dolly', description: 'Anvil dolly', price: 75, featured: false
      })

      const created = body as IWidget

      expect(status).toBe(201)
      expect(created).toEqual(expect.objectContaining({ name: 'Dolly', description: 'Anvil dolly', price: 75, featured: false }))
      expect(collection.get(created.id)).toEqual(created)
    })

    it('ignores a client-supplied id, createdAt and updatedAt: the server generates its own', async () => {
      const collection = setupHandlerUnderTest()

      const { body } = await requestFor('post', '/widgets', {
        id: 'd', name: 'Dolly', description: 'Anvil dolly', price: 75, featured: false, createdAt: '2000-01-01', updatedAt: '2000-01-01'
      })

      const created = body as IWidget & { updatedAt: string }

      expect(created.id).not.toBe('d')
      expect(collection.get('d')).toBeUndefined()
      expect(created.createdAt).not.toBe('2000-01-01')
      expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(created.updatedAt).toBe(created.createdAt)
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

    it('passes context.action === "create" with no context.existing to validate()', async () => {
      const validate = vi.fn().mockReturnValue(undefined)

      setupHandlerUnderTest({ validate })

      const payload = { name: 'Dolly', description: 'Anvil dolly', price: 75, featured: false }

      // Server-owned fields are stripped before validate() ever sees the payload.
      await requestFor('post', '/widgets', { ...payload, id: 'd', createdAt: '2024-04-01' })

      expect(validate).toHaveBeenCalledWith(payload, { action: 'create' })
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

    it('uses createRecord() to build the inserted record when provided, on top of the stamped input', async () => {
      const createRecord = vi.fn((input: Partial<IWidget>) => ({ ...input, id: 'generated-id' } as IWidget))
      const collection = setupHandlerUnderTest({ createRecord })

      await requestFor('post', '/widgets', { name: 'Dolly', description: 'x', price: 1, featured: false })

      expect(collection.get('generated-id')).toBeDefined()
      expect(createRecord).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }))
    })
  })

  describe('list query parsing', () => {
    it('falls back to the default page and perPage for non-numeric values, so meta never carries NaN', async () => {
      setupHandlerUnderTest()

      const { status, body } = await requestFor('get', '/widgets?page=abc&perPage=xyz')

      expect(status).toBe(200)
      expect((body as { meta: unknown }).meta).toEqual({ page: 1, perPage: 20, total: 3, totalPages: 1 })
    })

    it('clamps perPage to the contract maximum of 100', async () => {
      setupHandlerUnderTest()

      const { body } = await requestFor('get', '/widgets?perPage=1000')

      expect((body as { meta: { perPage: number } }).meta.perPage).toBe(100)
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

    it('ignores a client-supplied id, createdAt and updatedAt, and bumps updatedAt itself', async () => {
      const collection = setupHandlerUnderTest()

      const { status, body } = await requestFor('patch', '/widgets/a', {
        id: 'hijacked', createdAt: '2000-01-01', updatedAt: '2000-01-01', price: 5
      })

      const updated = body as IWidget & { updatedAt: string }

      expect(status).toBe(200)
      expect(updated.id).toBe('a')
      expect(updated.createdAt).toBe('2024-01-01')
      expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(collection.get('hijacked')).toBeUndefined()
    })

    it('hands buildUpdatePatch() the input already stamped with a fresh updatedAt', async () => {
      const buildUpdatePatch = vi.fn((input: Partial<IWidget>) => input)

      setupHandlerUnderTest({ buildUpdatePatch })

      await requestFor('patch', '/widgets/a', { price: 5 })

      expect(buildUpdatePatch).toHaveBeenCalledWith({ price: 5, updatedAt: expect.any(String) })
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

    it('returns 409 with a DependencyConflict-shaped body when conflictCheck() returns a structured conflict', async () => {
      setupHandlerUnderTest({
        conflictCheck: (_record, action) => (action === 'update'
          ? { message: '2 order(s) reference this widget.', entity: 'order', count: 2 }
          : undefined)
      })

      const { status, body } = await requestFor('patch', '/widgets/a', { price: 1 })

      expect(status).toBe(409)
      expect(body).toEqual({ code: 'CONFLICT', message: '2 order(s) reference this widget.', entity: 'order', count: 2 })
    })

    it('passes context.action and context.existing to validate() on update', async () => {
      const validate = vi.fn().mockReturnValue(undefined)

      const collection = setupHandlerUnderTest({ validate })
      const existingBeforePatch = collection.get('a')

      await requestFor('patch', '/widgets/a', { price: 1 })

      expect(validate).toHaveBeenCalledWith({ price: 1 }, { action: 'update', existing: existingBeforePatch })
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
