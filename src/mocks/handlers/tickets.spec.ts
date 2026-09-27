import axios from 'axios'

import { db } from '../db/singleton'
import { resetDatabase } from '../../../tests/support'
import type { ICategory, IEvent, ITicket } from '../db'

// Plain axios, not `apiClient`: its response interceptor drops the status code these tests assert on.
async function requestFor (
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  data?: unknown,
  options: { token?: string } = {}
): Promise<{ status: number; body: unknown }> {
  const response = await axios.request({
    method,
    url: path,
    data,
    headers: options.token === undefined ? {} : { Authorization: `Bearer ${options.token}` },
    validateStatus: () => true
  })

  return { status: response.status, body: response.data }
}

async function loginAs (email: string, password: string): Promise<string> {
  const { data } = await axios.request({
    method: 'post',
    url: '/auth/login',
    data: { email, password },
    validateStatus: () => true
  })

  return (data as TLoginResponse).token
}

async function loginAsAdmin (): Promise<string> {
  return loginAs('admin@platinium.test', 'admin123')
}

async function loginAsViewer (): Promise<string> {
  return loginAs('viewer@platinium.test', 'viewer123')
}

type TTicketWithNames = ITicket & { eventName: string; categoryName: string }

interface IListResponse {
  data: TTicketWithNames[]
  meta: TPaginationMeta
}

function seededEvent (): IEvent {
  const event = db.events.list({ perPage: 1 }).data[0]

  if (event === undefined) {
    throw new Error('expected at least one seeded event')
  }

  return event
}

function seededCategory (): ICategory {
  const category = db.categories.list({ perPage: 1 }).data[0]

  if (category === undefined) {
    throw new Error('expected at least one seeded category')
  }

  return category
}

function validTicketPayload (overrides: Partial<ITicket> = {}): Partial<ITicket> {
  return {
    name: 'Weekend Bundle',
    price: 4999,
    currency: 'USD',
    quantity: 100,
    status: 'draft',
    eventId: seededEvent().id,
    categoryId: seededCategory().id,
    ...overrides
  }
}

describe('tickets handlers', () => {
  beforeEach(() => resetDatabase())

  describe('GET /tickets', () => {
    it('returns the shared envelope: a data array plus pagination meta', async () => {
      const { status, body } = await requestFor('get', '/tickets')

      expect(status).toBe(200)
      const listBody = body as IListResponse

      expect(listBody.data).toEqual(expect.any(Array))
      expect(listBody.meta).toEqual({
        page: 1,
        perPage: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      })
    })

    it('search matches name', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload({
        name: 'Quorvexal Unique Ticket'
      }))).body as TTicketWithNames

      const byName = await requestFor('get', '/tickets?search=Quorvexal Unique Ticket')
      const byUnrelated = await requestFor('get', '/tickets?search=Zzyzx Nonexistent String')

      expect((byName.body as IListResponse).data.map(t => t.id)).toContain(created.id)
      expect((byUnrelated.body as IListResponse).data.map(t => t.id)).not.toContain(created.id)
    })

    describe('sorting', () => {
      it('sorts by name asc/desc', async () => {
        const ascending = await requestFor('get', '/tickets?sort=name&order=asc&perPage=1000')
        const descending = await requestFor('get', '/tickets?sort=name&order=desc&perPage=1000')

        const ascendingNames = (ascending.body as IListResponse).data.map(t => t.name)
        const descendingNames = (descending.body as IListResponse).data.map(t => t.name)

        expect(ascendingNames).toEqual([...ascendingNames].sort((a, b) => a.localeCompare(b)))
        expect(descendingNames).toEqual([...ascendingNames].reverse())
      })

      it('sorts by price asc/desc', async () => {
        const ascending = await requestFor('get', '/tickets?sort=price&order=asc&perPage=1000')
        const descending = await requestFor('get', '/tickets?sort=price&order=desc&perPage=1000')

        const ascendingPrices = (ascending.body as IListResponse).data.map(t => t.price)
        const descendingPrices = (descending.body as IListResponse).data.map(t => t.price)

        expect(ascendingPrices).toEqual([...ascendingPrices].sort((a, b) => a - b))
        expect(descendingPrices).toEqual([...ascendingPrices].reverse())
      })

      it('sorts by quantity asc/desc', async () => {
        const ascending = await requestFor('get', '/tickets?sort=quantity&order=asc&perPage=1000')
        const descending = await requestFor('get', '/tickets?sort=quantity&order=desc&perPage=1000')

        const ascendingQuantities = (ascending.body as IListResponse).data.map(t => t.quantity)
        const descendingQuantities = (descending.body as IListResponse).data.map(t => t.quantity)

        expect(ascendingQuantities).toEqual([...ascendingQuantities].sort((a, b) => a - b))
        expect(descendingQuantities).toEqual([...ascendingQuantities].reverse())
      })

      it('sorts by status asc/desc', async () => {
        const ascending = await requestFor('get', '/tickets?sort=status&order=asc&perPage=1000')
        const descending = await requestFor('get', '/tickets?sort=status&order=desc&perPage=1000')

        const ascendingStatuses = (ascending.body as IListResponse).data.map(t => t.status)
        const descendingStatuses = (descending.body as IListResponse).data.map(t => t.status)

        expect(ascendingStatuses).toEqual([...ascendingStatuses].sort((a, b) => a.localeCompare(b)))
        expect(descendingStatuses).toEqual([...ascendingStatuses].reverse())
      })

      it('sorts by createdAt asc/desc', async () => {
        const older = (await requestFor('post', '/tickets', validTicketPayload({ name: 'Older Sort Probe' }))).body as TTicketWithNames

        db.tickets.update(older.id, { createdAt: '2020-01-01T00:00:00.000Z' })

        const newer = (await requestFor('post', '/tickets', validTicketPayload({ name: 'Newer Sort Probe' }))).body as TTicketWithNames

        db.tickets.update(newer.id, { createdAt: '2031-01-01T00:00:00.000Z' })

        const ascending = await requestFor('get', '/tickets?sort=createdAt&order=asc&perPage=1000')
        const descending = await requestFor('get', '/tickets?sort=createdAt&order=desc&perPage=1000')

        const ascendingIds = (ascending.body as IListResponse).data.map(t => t.id)
        const descendingIds = (descending.body as IListResponse).data.map(t => t.id)

        expect(ascendingIds.indexOf(older.id)).toBeLessThan(ascendingIds.indexOf(newer.id))
        expect(descendingIds.indexOf(newer.id)).toBeLessThan(descendingIds.indexOf(older.id))
      })
    })

    it('paginates via page/perPage and reports meta accordingly', async () => {
      await Promise.all(Array.from({ length: 6 }, (_, index) => requestFor('post', '/tickets', validTicketPayload({ name: `Pagination Probe ${index + 1}` }))
      ))

      const firstPage = await requestFor('get', '/tickets?sort=name&order=asc&page=1&perPage=3')
      const secondPage = await requestFor('get', '/tickets?sort=name&order=asc&page=2&perPage=3')

      const firstBody = firstPage.body as IListResponse
      const secondBody = secondPage.body as IListResponse

      expect(firstBody.data).toHaveLength(3)
      expect(firstBody.meta).toEqual({
        page: 1,
        perPage: 3,
        total: firstBody.meta.total,
        totalPages: firstBody.meta.totalPages
      })
      expect(secondBody.meta.page).toBe(2)
      expect(firstBody.data.map(t => t.id)).not.toEqual(secondBody.data.map(t => t.id))
    })

    describe('equality filters', () => {
      it('eventId filter narrows to an exact match', async () => {
        const event = seededEvent()
        const created = (await requestFor('post', '/tickets', validTicketPayload({ eventId: event.id }))).body as TTicketWithNames

        const { body } = await requestFor('get', `/tickets?eventId=${event.id}&perPage=1000`)
        const listBody = body as IListResponse

        expect(listBody.data.map(t => t.id)).toContain(created.id)
        expect(listBody.data.every(t => t.eventId === event.id)).toBe(true)
      })

      it('categoryId filter narrows to an exact match', async () => {
        const category = seededCategory()
        const created = (await requestFor('post', '/tickets', validTicketPayload({ categoryId: category.id }))).body as TTicketWithNames

        const { body } = await requestFor('get', `/tickets?categoryId=${category.id}&perPage=1000`)
        const listBody = body as IListResponse

        expect(listBody.data.map(t => t.id)).toContain(created.id)
        expect(listBody.data.every(t => t.categoryId === category.id)).toBe(true)
      })

      it('status filter narrows to an exact match', async () => {
        const created = (await requestFor('post', '/tickets', validTicketPayload({ status: 'sold_out' }))).body as TTicketWithNames

        const { body } = await requestFor('get', '/tickets?status=sold_out&perPage=1000')
        const listBody = body as IListResponse

        expect(listBody.data.map(t => t.id)).toContain(created.id)
        expect(listBody.data.every(t => t.status === 'sold_out')).toBe(true)
      })

      it('currency filter narrows to an exact match', async () => {
        const created = (await requestFor('post', '/tickets', validTicketPayload({ currency: 'GBP' }))).body as TTicketWithNames

        const { body } = await requestFor('get', '/tickets?currency=GBP&perPage=1000')
        const listBody = body as IListResponse

        expect(listBody.data.map(t => t.id)).toContain(created.id)
        expect(listBody.data.every(t => t.currency === 'GBP')).toBe(true)
      })
    })

    it('range filter narrows via priceMin/priceMax', async () => {
      const inRange = (await requestFor('post', '/tickets', validTicketPayload({ name: 'In Range Ticket', price: 5000 }))).body as TTicketWithNames
      const belowRange = (await requestFor('post', '/tickets', validTicketPayload({ name: 'Below Range Ticket', price: 100 }))).body as TTicketWithNames
      const aboveRange = (await requestFor('post', '/tickets', validTicketPayload({ name: 'Above Range Ticket', price: 999999 }))).body as TTicketWithNames

      const { body } = await requestFor('get', '/tickets?priceMin=4000&priceMax=6000&perPage=1000')
      const listBody = body as IListResponse

      expect(listBody.data.map(t => t.id)).toContain(inRange.id)
      expect(listBody.data.map(t => t.id)).not.toContain(belowRange.id)
      expect(listBody.data.map(t => t.id)).not.toContain(aboveRange.id)
    })
  })

  describe('POST /tickets', () => {
    it('creates a valid ticket: 201 with denormalised eventName/categoryName resolved correctly', async () => {
      const event = seededEvent()
      const category = seededCategory()
      const payload = validTicketPayload({ eventId: event.id, categoryId: category.id })

      const { status, body } = await requestFor('post', '/tickets', payload)

      expect(status).toBe(201)

      const created = body as TTicketWithNames

      expect(created).toEqual({
        id: expect.any(String),
        name: payload.name,
        price: payload.price,
        currency: payload.currency,
        quantity: payload.quantity,
        status: payload.status,
        eventId: event.id,
        eventName: event.name,
        categoryId: category.id,
        categoryName: category.name,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(db.tickets.get(created.id)).toBeDefined()
    })

    it.each([
      'name', 'price', 'currency', 'quantity', 'status', 'eventId', 'categoryId'
    ])('returns 400 with a %s field error when it is missing', async (field) => {
      const payload = validTicketPayload()

      delete (payload as Record<string, unknown>)[field]

      const { status, body } = await requestFor('post', '/tickets', payload)

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { [field]: expect.any(String) }
      })
    })

    it('returns 400 for a negative price', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ price: -100 }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { price: expect.any(String) }
      })
    })

    it('returns 400 for a non-integer price', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ price: 19.99 }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { price: expect.any(String) }
      })
    })

    it('returns 400 for a negative quantity', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ quantity: -5 }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { quantity: expect.any(String) }
      })
    })

    it('returns 400 for a non-integer quantity', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ quantity: 4.5 }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { quantity: expect.any(String) }
      })
    })

    it('returns 400 for a quantity over the maximum', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ quantity: 100001 }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { quantity: expect.any(String) }
      })
    })

    it('returns 400 for an invalid currency', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ currency: 'XYZ' as ITicket['currency'] }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { currency: expect.any(String) }
      })
    })

    it('returns 400 for an invalid status', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ status: 'expired' as ITicket['status'] }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { status: expect.any(String) }
      })
    })

    it('returns 400 with an eventId field error for an unknown eventId', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ eventId: 'unknown-event-id' }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { eventId: expect.any(String) }
      })
    })

    it('returns 400 with a categoryId field error for an unknown categoryId', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ categoryId: 'unknown-category-id' }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { categoryId: expect.any(String) }
      })
    })
  })

  describe('GET /tickets/{id}', () => {
    it('returns 200 for a known seeded id, with correct eventName/categoryName', async () => {
      const seeded = db.tickets.list({ perPage: 1 }).data[0]

      if (seeded === undefined) {
        throw new Error('expected at least one seeded ticket')
      }

      const expectedEvent = db.events.get(seeded.eventId)
      const expectedCategory = db.categories.get(seeded.categoryId)

      const { status, body } = await requestFor('get', `/tickets/${seeded.id}`)

      expect(status).toBe(200)

      const found = body as TTicketWithNames

      expect(found.id).toBe(seeded.id)
      expect(found.eventName).toBe(expectedEvent?.name)
      expect(found.categoryName).toBe(expectedCategory?.name)
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('get', '/tickets/unknown-id')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('PATCH /tickets/{id}', () => {
    it('applies a partial update: only the given field changes, others retain their prior values, with no "required" error for untouched fields', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { quantity: 250 })

      expect(status).toBe(200)

      const updated = body as TTicketWithNames

      expect(updated.name).toBe(created.name)
      expect(updated.price).toBe(created.price)
      expect(updated.currency).toBe(created.currency)
      expect(updated.status).toBe(created.status)
      expect(updated.eventId).toBe(created.eventId)
      expect(updated.categoryId).toBe(created.categoryId)
      expect(updated.quantity).toBe(250)
      expect(updated.updatedAt).not.toBe(created.updatedAt)
    })

    it('returns 400 for a patched-in negative price', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { price: -1 })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { price: expect.any(String) }
      })
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('patch', '/tickets/unknown-id', { quantity: 10 })

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })

    it('returns 400 with an eventId field error when patched to an unknown eventId', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { eventId: 'unknown-event-id' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { eventId: expect.any(String) }
      })
    })

    it('returns 400 with an eventId field error when patched to an empty-string eventId, leaving the stored record untouched', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames

      const before = db.tickets.get(created.id)

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { eventId: '' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { eventId: expect.any(String) }
      })
      expect(db.tickets.get(created.id)).toEqual(before)
    })

    it('returns 400 with a categoryId field error when patched to an empty-string categoryId, leaving the stored record untouched', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames

      const before = db.tickets.get(created.id)

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { categoryId: '' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { categoryId: expect.any(String) }
      })
      expect(db.tickets.get(created.id)).toEqual(before)
    })

    it('updates eventName in the response when eventId is legitimately changed to a different real event', async () => {
      const events = db.events.list({ perPage: 2 }).data
      const firstEvent = events[0]
      const secondEvent = events[1]

      if (firstEvent === undefined || secondEvent === undefined) {
        throw new Error('expected at least two seeded events')
      }

      const created = (await requestFor('post', '/tickets', validTicketPayload({ eventId: firstEvent.id }))).body as TTicketWithNames

      expect(created.eventName).toBe(firstEvent.name)

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { eventId: secondEvent.id })

      expect(status).toBe(200)

      const updated = body as TTicketWithNames

      expect(updated.eventId).toBe(secondEvent.id)
      expect(updated.eventName).toBe(secondEvent.name)
    })
  })

  describe('DELETE /tickets/{id}', () => {
    it('deletes a ticket: 204, and it is actually gone', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames

      const { status, body } = await requestFor('delete', `/tickets/${created.id}`)

      expect(status).toBe(204)
      expect(body).toBeFalsy()
      expect(db.tickets.get(created.id)).toBeUndefined()
    })

    it('deletes a ticket whose event and category still exist with no dependency/conflict check blocking it', async () => {
      const event = seededEvent()
      const category = seededCategory()
      const created = (await requestFor('post', '/tickets', validTicketPayload({ eventId: event.id, categoryId: category.id }))).body as TTicketWithNames

      const { status } = await requestFor('delete', `/tickets/${created.id}`)

      expect(status).toBe(204)
      expect(db.events.get(event.id)).toBeDefined()
      expect(db.categories.get(category.id)).toBeDefined()
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('delete', '/tickets/unknown-id')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('GET /tickets?format=csv', () => {
    it('returns a CSV document with the expected headers and content type', async () => {
      const { status, body } = await requestFor('get', '/tickets?format=csv')

      expect(status).toBe(200)
      expect(typeof body).toBe('string')
      expect((body as string).split('\r\n')[0]).toBe('Name,Price,Currency,Quantity,Status,Event,Category,Created At')
    })

    it('formats money as a decimal with currency in its own column, and references by name not id', async () => {
      const event = seededEvent()
      const category = seededCategory()
      const created = (await requestFor('post', '/tickets', validTicketPayload({
        name: 'CSV Export Probe Ticket',
        price: 1234,
        currency: 'GBP',
        eventId: event.id,
        categoryId: category.id
      }))).body as TTicketWithNames

      const { body } = await requestFor('get', '/tickets?format=csv&perPage=1')
      const rows = (body as string).split('\r\n')
      const row = rows.find(candidate => candidate.startsWith(`${created.name},`))

      expect(row).toBe(`CSV Export Probe Ticket,12.34,GBP,${created.quantity},draft,${event.name},${category.name},${created.createdAt}`)
    })

    it('serialises every filtered record, not just the current page', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload({ name: 'CSV Export Pagination Probe' }))).body as TTicketWithNames

      const { body } = await requestFor('get', '/tickets?format=csv&perPage=1')
      const rows = (body as string).split('\r\n')

      expect(rows.length).toBeGreaterThan(2)
      expect(rows.some(row => row.startsWith(`${created.name},`))).toBe(true)
    })
  })

  describe('POST /tickets/bulk', () => {
    async function createTicket (name: string): Promise<TTicketWithNames> {
      return (await requestFor('post', '/tickets', validTicketPayload({ name }))).body as TTicketWithNames
    }

    it('total success: archives every identifier and reports an empty failed array', async () => {
      const a = await createTicket('Bulk Archive Success Ticket A')
      const b = await createTicket('Bulk Archive Success Ticket B')

      const { status, body } = await requestFor('post', '/tickets/bulk', { ids: [a.id, b.id], operation: 'archive' })

      expect(status).toBe(200)
      expect(body).toEqual({ succeeded: expect.arrayContaining([a.id, b.id]), failed: [] })
      expect(db.tickets.get(a.id)?.status).toBe('archived')
      expect(db.tickets.get(b.id)?.status).toBe('archived')
    })

    it('total failure: every identifier fails and succeeded is empty', async () => {
      const { status, body } = await requestFor('post', '/tickets/bulk', {
        ids: ['unknown-1', 'unknown-2'],
        operation: 'delete'
      })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded).toEqual([])
      expect(result.failed).toHaveLength(2)
      expect(result.failed.every(failure => typeof failure.reason === 'string' && failure.reason.length > 0)).toBe(true)
    })

    it('partial success: splits valid and invalid identifiers correctly', async () => {
      const valid = await createTicket('Bulk Partial Success Ticket')

      const { status, body } = await requestFor('post', '/tickets/bulk', {
        ids: [valid.id, 'unknown-id'],
        operation: 'delete'
      })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded).toEqual([valid.id])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]?.id).toBe('unknown-id')
    })

    it('a ticket is a leaf of the domain model, so bulk delete has no dependency-conflict case: it always succeeds for an existing id', async () => {
      const ticket = await createTicket('Bulk Delete No Conflict Ticket')

      const { status, body } = await requestFor('post', '/tickets/bulk', { ids: [ticket.id], operation: 'delete' })

      expect(status).toBe(200)
      expect(body).toEqual({ succeeded: [ticket.id], failed: [] })
      expect(db.tickets.get(ticket.id)).toBeUndefined()
    })

    it('returns 400 for a malformed request (ids not an array)', async () => {
      const { status, body } = await requestFor('post', '/tickets/bulk', { ids: 'not-an-array', operation: 'delete' })

      expect(status).toBe(400)
      expect(body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) })
    })
  })

  describe('viewer permissions', () => {
    it('rejects POST /tickets for a viewer with 403', async () => {
      const token = await loginAsViewer()

      const { status, body } = await requestFor('post', '/tickets', validTicketPayload(), { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
    })

    it('rejects PATCH /tickets/{id} for a viewer with 403', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames
      const token = await loginAsViewer()

      const { status, body } = await requestFor('patch', `/tickets/${created.id}`, { quantity: 5 }, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
    })

    it('rejects DELETE /tickets/{id} for a viewer with 403', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames
      const token = await loginAsViewer()

      const { status, body } = await requestFor('delete', `/tickets/${created.id}`, undefined, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
      expect(db.tickets.get(created.id)).toBeDefined()
    })

    it('rejects POST /tickets/bulk for a viewer with 403', async () => {
      const created = (await requestFor('post', '/tickets', validTicketPayload())).body as TTicketWithNames
      const token = await loginAsViewer()

      const { status, body } = await requestFor('post', '/tickets/bulk', { ids: [created.id], operation: 'delete' }, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
      expect(db.tickets.get(created.id)).toBeDefined()
    })

    it('an admin can still create/update/delete', async () => {
      const token = await loginAsAdmin()

      const created = (await requestFor('post', '/tickets', validTicketPayload({ name: 'Admin Regression Ticket' }), { token })).body as TTicketWithNames

      expect(created.id).toEqual(expect.any(String))

      const updated = await requestFor('patch', `/tickets/${created.id}`, { quantity: 42 }, { token })

      expect(updated.status).toBe(200)

      const deleted = await requestFor('delete', `/tickets/${created.id}`, undefined, { token })

      expect(deleted.status).toBe(204)
    })

    it('leaves the tokenless case unchanged: a write with no Authorization header still proceeds (requireWriteAccess only rejects a resolved viewer)', async () => {
      const { status, body } = await requestFor('post', '/tickets', validTicketPayload({ name: 'Tokenless Write Still Works Ticket' }))

      expect(status).toBe(201)
      expect((body as TTicketWithNames).name).toBe('Tokenless Write Still Works Ticket')
    })
  })
})
