import axios from 'axios'

import { db } from '../db/singleton'
import { resetDatabase } from '../../../tests/support'
import type { IEvent, ITicket } from '../db'

/**
 * Requests are driven through a plain `axios` instance — not `apiClient` —
 * for the same reason `auth.spec.ts` and `factory.spec.ts` do: `apiClient`'s
 * response interceptor unwraps a successful response and discards the
 * status code, which these tests need to assert on directly (e.g. exact
 * 201/400/404/409). Plain `axios` still goes through the same XHR/http layer
 * `msw/node`'s interceptor patches. No `baseURL` is set, so requests resolve
 * against jsdom's default origin, matching how `apiClient` resolves a
 * relative path in production.
 */
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

/** Logs in as the seeded account for the given role, returning its bearer token — used by the viewer-403 tests below. */
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

interface IListResponse {
  data: IEvent[]
  meta: TPaginationMeta
}

function validEventPayload (overrides: Partial<IEvent> = {}): Partial<IEvent> {
  return {
    name: 'Rooftop Jazz Night',
    country: 'US',
    venue: 'Skyline Terrace',
    startDate: '2027-05-01',
    endDate: '2027-05-02',
    status: 'draft',
    ...overrides
  }
}

describe('events handlers', () => {
  beforeEach(() => resetDatabase())

  describe('GET /events', () => {
    it('returns the shared envelope: a data array plus pagination meta', async () => {
      const { status, body } = await requestFor('get', '/events')

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

    it('search matches name and venue but not country', async () => {
      const created = (await requestFor('post', '/events', validEventPayload({
        name: 'Quorvexal Unique Summit',
        venue: 'Plendarium Unique Hall',
        country: 'ZZ'
      }))).body as IEvent

      const byName = await requestFor('get', '/events?search=Quorvexal Unique Summit')
      const byVenue = await requestFor('get', '/events?search=Plendarium Unique Hall')
      const byCountry = await requestFor('get', '/events?search=ZZ')

      expect((byName.body as IListResponse).data.map(e => e.id)).toContain(created.id)
      expect((byVenue.body as IListResponse).data.map(e => e.id)).toContain(created.id)
      expect((byCountry.body as IListResponse).data.map(e => e.id)).not.toContain(created.id)
    })

    it('status filter narrows to an exact match', async () => {
      const { body } = await requestFor('get', '/events?status=cancelled')
      const listBody = body as IListResponse

      expect(listBody.data.length).toBeGreaterThan(0)
      expect(listBody.data.every(event => event.status === 'cancelled')).toBe(true)
    })

    it('country filter narrows to an exact match', async () => {
      const { body } = await requestFor('get', '/events?country=DE')
      const listBody = body as IListResponse

      expect(listBody.data.length).toBeGreaterThan(0)
      expect(listBody.data.every(event => event.country === 'DE')).toBe(true)
    })

    describe('date overlap filtering (startDateFrom/startDateTo)', () => {
      async function createEvent (startDate: string, endDate: string, name: string): Promise<IEvent> {
        const { body } = await requestFor('post', '/events', validEventPayload({ name, startDate, endDate }))

        return body as IEvent
      }

      it('matches an event range fully inside the query window', async () => {
        const inside = await createEvent('2030-06-10', '2030-06-12', 'Inside Window Event')

        const { body } = await requestFor('get', '/events?startDateFrom=2030-06-01&startDateTo=2030-06-30')

        expect((body as IListResponse).data.map(e => e.id)).toContain(inside.id)
      })

      it('matches a long-running event that started before the window but ends inside/after it', async () => {
        const longRunning = await createEvent('2030-05-01', '2030-06-15', 'Long Running Event')

        const { body } = await requestFor('get', '/events?startDateFrom=2030-06-01&startDateTo=2030-06-30')

        expect((body as IListResponse).data.map(e => e.id)).toContain(longRunning.id)
      })

      it('does not match an event range entirely before the window', async () => {
        const before = await createEvent('2030-01-01', '2030-01-05', 'Entirely Before Event')

        const { body } = await requestFor('get', '/events?startDateFrom=2030-06-01&startDateTo=2030-06-30')

        expect((body as IListResponse).data.map(e => e.id)).not.toContain(before.id)
      })

      it('does not match an event range entirely after the window', async () => {
        const after = await createEvent('2030-08-01', '2030-08-05', 'Entirely After Event')

        const { body } = await requestFor('get', '/events?startDateFrom=2030-06-01&startDateTo=2030-06-30')

        expect((body as IListResponse).data.map(e => e.id)).not.toContain(after.id)
      })
    })

    describe('sorting', () => {
      it('sorts by name asc/desc', async () => {
        const ascending = await requestFor('get', '/events?sort=name&order=asc&perPage=1000')
        const descending = await requestFor('get', '/events?sort=name&order=desc&perPage=1000')

        const ascendingNames = (ascending.body as IListResponse).data.map(e => e.name)
        const descendingNames = (descending.body as IListResponse).data.map(e => e.name)

        expect(ascendingNames).toEqual([...ascendingNames].sort((a, b) => a.localeCompare(b)))
        expect(descendingNames).toEqual([...ascendingNames].reverse())
      })

      it('sorts by startDate asc/desc', async () => {
        const ascending = await requestFor('get', '/events?sort=startDate&order=asc&perPage=1000')
        const descending = await requestFor('get', '/events?sort=startDate&order=desc&perPage=1000')

        const ascendingDates = (ascending.body as IListResponse).data.map(e => e.startDate)
        const descendingDates = (descending.body as IListResponse).data.map(e => e.startDate)

        expect(ascendingDates).toEqual([...ascendingDates].sort())
        expect(descendingDates[0]).toBe([...ascendingDates].sort().reverse()[0])
      })
    })

    it('paginates via page/perPage and reports meta accordingly', async () => {
      const firstPage = await requestFor('get', '/events?sort=name&order=asc&page=1&perPage=5')
      const secondPage = await requestFor('get', '/events?sort=name&order=asc&page=2&perPage=5')

      const firstBody = firstPage.body as IListResponse
      const secondBody = secondPage.body as IListResponse

      expect(firstBody.data).toHaveLength(5)
      expect(firstBody.meta).toEqual({
        page: 1,
        perPage: 5,
        total: firstBody.meta.total,
        totalPages: firstBody.meta.totalPages
      })
      expect(secondBody.meta.page).toBe(2)
      expect(firstBody.data.map(e => e.id)).not.toEqual(secondBody.data.map(e => e.id))
    })
  })

  describe('POST /events', () => {
    it('creates a valid event: 201 with id/createdAt/updatedAt present and dates round-tripping as date-only strings', async () => {
      const payload = validEventPayload()
      const { status, body } = await requestFor('post', '/events', payload)

      expect(status).toBe(201)

      const created = body as IEvent

      expect(created).toEqual({
        id: expect.any(String),
        name: payload.name,
        country: payload.country,
        venue: payload.venue,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(created.startDate).toBe('2027-05-01')
      expect(created.endDate).toBe('2027-05-02')
      expect(db.events.get(created.id)).toBeDefined()
    })

    it.each([
      ['name', { name: undefined }],
      ['country', { country: undefined }],
      ['venue', { venue: undefined }],
      ['startDate', { startDate: undefined }],
      ['endDate', { endDate: undefined }],
      ['status', { status: undefined }]
    ] as const)('returns 400 with a %s field error when %s is missing', async (field, overrides) => {
      const payload = { ...validEventPayload(), ...overrides }

      delete (payload as Record<string, unknown>)[field]

      const { status, body } = await requestFor('post', '/events', payload)

      expect(status).toBe(400)
      expect(body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { [field]: expect.any(String) }
      })
    })

    it('returns 400 with a country field error when country is not a 2-letter code', async () => {
      const { status, body } = await requestFor('post', '/events', validEventPayload({ country: 'USA' }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { country: expect.any(String) }
      })
    })

    it('returns 400 with an endDate field error when endDate precedes startDate', async () => {
      const { status, body } = await requestFor('post', '/events', validEventPayload({
        startDate: '2027-05-10',
        endDate: '2027-05-09'
      }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { endDate: expect.any(String) }
      })
    })

    it('succeeds when endDate equals startDate (same-day event is valid)', async () => {
      const { status, body } = await requestFor('post', '/events', validEventPayload({
        startDate: '2027-05-10',
        endDate: '2027-05-10'
      }))

      expect(status).toBe(201)
      expect((body as IEvent).startDate).toBe('2027-05-10')
      expect((body as IEvent).endDate).toBe('2027-05-10')
    })

    it('returns 400 with the "required" message (not the date-order message) when endDate is an empty string', async () => {
      const { status, body } = await requestFor('post', '/events', validEventPayload({ endDate: '' }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { endDate: 'End date is required.' }
      })
    })

    it('returns 400 with a status field error when status is not one of the valid enum values', async () => {
      const { status, body } = await requestFor('post', '/events', validEventPayload({ status: 'anything' as IEvent['status'] }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { status: expect.any(String) }
      })
    })
  })

  describe('GET /events/{id}', () => {
    it('returns 200 for a known seeded id', async () => {
      const seeded = db.events.list({ perPage: 1 }).data[0]

      if (seeded === undefined) {
        throw new Error('expected at least one seeded event')
      }

      const { status, body } = await requestFor('get', `/events/${seeded.id}`)

      expect(status).toBe(200)
      expect((body as IEvent).id).toBe(seeded.id)
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('get', '/events/unknown-id')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('PATCH /events/{id}', () => {
    it('applies a partial update: only the given field changes, others retain their prior values, with no "required" error for untouched fields', async () => {
      const created = (await requestFor('post', '/events', validEventPayload())).body as IEvent

      const { status, body } = await requestFor('patch', `/events/${created.id}`, { name: 'Renamed Rooftop Jazz Night' })

      expect(status).toBe(200)

      const updated = body as IEvent

      expect(updated.name).toBe('Renamed Rooftop Jazz Night')
      expect(updated.country).toBe(created.country)
      expect(updated.venue).toBe(created.venue)
      expect(updated.startDate).toBe(created.startDate)
      expect(updated.endDate).toBe(created.endDate)
      expect(updated.status).toBe(created.status)
    })

    it('returns 400 when only endDate is updated to a value before the existing, unchanged startDate', async () => {
      const created = (await requestFor('post', '/events', validEventPayload({
        startDate: '2027-05-10',
        endDate: '2027-05-15'
      }))).body as IEvent

      const { status, body } = await requestFor('patch', `/events/${created.id}`, { endDate: '2027-05-01' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { endDate: expect.any(String) }
      })
      expect(db.events.get(created.id)?.endDate).toBe('2027-05-15')
    })

    it('returns 400 when only startDate is updated to a value after the existing, unchanged endDate', async () => {
      const created = (await requestFor('post', '/events', validEventPayload({
        startDate: '2027-05-10',
        endDate: '2027-05-15'
      }))).body as IEvent

      const { status, body } = await requestFor('patch', `/events/${created.id}`, { startDate: '2027-05-20' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { endDate: expect.any(String) }
      })
      expect(db.events.get(created.id)?.startDate).toBe('2027-05-10')
    })

    it('returns 400 with a country field error when country is provided and invalid', async () => {
      const created = (await requestFor('post', '/events', validEventPayload())).body as IEvent

      const { status, body } = await requestFor('patch', `/events/${created.id}`, { country: 'usa' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { country: expect.any(String) }
      })
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('patch', '/events/unknown-id', { name: 'Anything' })

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('DELETE /events/{id}', () => {
    it('deletes a freshly created event with no tickets referencing it: 204, and it is actually gone', async () => {
      // Created fresh (rather than picked from seed data) so the test's premise —
      // "no ticket references this event" — is explicit and does not depend on
      // incidental seed shape (every seeded event happens to have a ticket, given
      // 400 seeded tickets spread across only 48 seeded events).
      const target = (await requestFor('post', '/events', validEventPayload())).body as IEvent

      const { status, body } = await requestFor('delete', `/events/${target.id}`)

      expect(status).toBe(204)
      expect(body).toBeFalsy()
      expect(db.events.get(target.id)).toBeUndefined()
    })

    it('blocks deletion of an event that tickets reference: 409 with a DependencyConflict body, and the event survives', async () => {
      const event = (await requestFor('post', '/events', validEventPayload())).body as IEvent
      const anyCategory = db.categories.list({ perPage: 1 }).data[0]

      if (anyCategory === undefined) {
        throw new Error('expected at least one seeded category')
      }

      const ticket: ITicket = {
        id: 'events-spec-ticket-1',
        name: 'Events Spec Test Ticket',
        price: 1000,
        currency: 'USD',
        quantity: 10,
        status: 'draft',
        eventId: event.id,
        categoryId: anyCategory.id,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }

      db.tickets.insert(ticket)

      const { status, body } = await requestFor('delete', `/events/${event.id}`)

      expect(status).toBe(409)
      expect(body).toEqual({
        code: 'CONFLICT',
        message: expect.any(String),
        entity: 'ticket',
        count: 1
      })
      expect(db.events.get(event.id)).toBeDefined()
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('delete', '/events/unknown-id')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('GET /events?format=csv', () => {
    it('returns a CSV document with the expected headers and content type', async () => {
      const { status, body } = await requestFor('get', '/events?format=csv')

      expect(status).toBe(200)
      expect(typeof body).toBe('string')
      expect((body as string).split('\r\n')[0]).toBe('Name,Country,Venue,Start Date,End Date,Status,Created At')
    })

    it('serialises every filtered record, not just the current page', async () => {
      const created = (await requestFor('post', '/events', validEventPayload({ name: 'CSV Export Probe Event' }))).body as IEvent

      const { body } = await requestFor('get', '/events?format=csv&perPage=1')
      const rows = (body as string).split('\r\n')

      expect(rows.length).toBeGreaterThan(2)
      expect(rows.some(row => row.startsWith(`${created.name},`))).toBe(true)
    })
  })

  describe('POST /events/bulk', () => {
    async function createEvent (name: string): Promise<IEvent> {
      return (await requestFor('post', '/events', validEventPayload({ name }))).body as IEvent
    }

    it('total success: archives every identifier and reports an empty failed array', async () => {
      const a = await createEvent('Bulk Archive Success A')
      const b = await createEvent('Bulk Archive Success B')

      const { status, body } = await requestFor('post', '/events/bulk', { ids: [a.id, b.id], operation: 'archive' })

      expect(status).toBe(200)
      expect(body).toEqual({ succeeded: expect.arrayContaining([a.id, b.id]), failed: [] })
      expect(db.events.get(a.id)?.status).toBe('completed')
      expect(db.events.get(b.id)?.status).toBe('completed')
    })

    it('total failure: every identifier fails and succeeded is empty', async () => {
      const { status, body } = await requestFor('post', '/events/bulk', {
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
      const valid = await createEvent('Bulk Partial Success Event')

      const { status, body } = await requestFor('post', '/events/bulk', {
        ids: [valid.id, 'unknown-id'],
        operation: 'delete'
      })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded).toEqual([valid.id])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]?.id).toBe('unknown-id')
    })

    it('dependency-blocked bulk delete: reports a per-identifier failure carrying the blocking count, not a top-level 409', async () => {
      const event = await createEvent('Bulk Delete Blocked Event')
      const anyCategory = db.categories.list({ perPage: 1 }).data[0]

      if (anyCategory === undefined) {
        throw new Error('expected at least one seeded category')
      }

      db.tickets.insert({
        id: 'events-bulk-spec-ticket',
        name: 'Events Bulk Spec Test Ticket',
        price: 1000,
        currency: 'USD',
        quantity: 10,
        status: 'draft',
        eventId: event.id,
        categoryId: anyCategory.id,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      })

      const { status, body } = await requestFor('post', '/events/bulk', { ids: [event.id], operation: 'delete' })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded).toEqual([])
      expect(result.failed).toEqual([{ id: event.id, code: 'CONFLICT', reason: expect.any(String), count: 1 }])
      expect(db.events.get(event.id)).toBeDefined()
    })

    it('returns 400 for a malformed request (unsupported operation)', async () => {
      const { status, body } = await requestFor('post', '/events/bulk', { ids: ['any-id'], operation: 'not-a-real-operation' })

      expect(status).toBe(400)
      expect(body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) })
    })

    it('returns 400 when the ids array exceeds the 100-item cap (DoS guard)', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, index) => `bulk-cap-${index}`)

      const { status, body } = await requestFor('post', '/events/bulk', { ids: tooManyIds, operation: 'delete' })

      expect(status).toBe(400)
      expect(body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) })
    })

    it('accepts an ids array exactly at the 100-item cap (not rejected for size)', async () => {
      // The ids need not be real — a size check must pass at exactly the limit,
      // so unknown ids come back as per-identifier failures, never a 400.
      const atCapIds = Array.from({ length: 100 }, (_, index) => `bulk-cap-${index}`)

      const { status, body } = await requestFor('post', '/events/bulk', { ids: atCapIds, operation: 'delete' })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded.length + result.failed.length).toBe(100)
    })
  })

  describe('viewer permissions (PRD-007)', () => {
    it('rejects POST /events for a viewer with 403', async () => {
      const token = await loginAsViewer()

      const { status, body } = await requestFor('post', '/events', validEventPayload(), { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
    })

    it('rejects PATCH /events/{id} for a viewer with 403', async () => {
      const created = (await requestFor('post', '/events', validEventPayload())).body as IEvent
      const token = await loginAsViewer()

      const { status, body } = await requestFor('patch', `/events/${created.id}`, { name: 'Renamed' }, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
    })

    it('rejects DELETE /events/{id} for a viewer with 403', async () => {
      const created = (await requestFor('post', '/events', validEventPayload())).body as IEvent
      const token = await loginAsViewer()

      const { status, body } = await requestFor('delete', `/events/${created.id}`, undefined, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
      expect(db.events.get(created.id)).toBeDefined()
    })

    it('rejects POST /events/bulk for a viewer with 403', async () => {
      const created = (await requestFor('post', '/events', validEventPayload())).body as IEvent
      const token = await loginAsViewer()

      const { status, body } = await requestFor('post', '/events/bulk', { ids: [created.id], operation: 'delete' }, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
      expect(db.events.get(created.id)).toBeDefined()
    })

    it('regression: an admin can still create/update/delete after this slice', async () => {
      const token = await loginAsAdmin()

      const created = (await requestFor('post', '/events', validEventPayload({ name: 'Admin Regression Event' }), { token })).body as IEvent

      expect(created.id).toEqual(expect.any(String))

      const updated = await requestFor('patch', `/events/${created.id}`, { venue: 'Updated Venue' }, { token })

      expect(updated.status).toBe(200)

      const deleted = await requestFor('delete', `/events/${created.id}`, undefined, { token })

      expect(deleted.status).toBe(204)
    })

    it('leaves the tokenless case unchanged: a write with no Authorization header still proceeds (requireWriteAccess only rejects a resolved viewer)', async () => {
      const { status, body } = await requestFor('post', '/events', validEventPayload({ name: 'Tokenless Write Still Works Event' }))

      expect(status).toBe(201)
      expect((body as IEvent).name).toBe('Tokenless Write Still Works Event')
    })
  })
})
