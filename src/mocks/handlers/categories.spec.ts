import axios from 'axios'

import { db } from '../db/singleton'
import { resetDatabase } from '../../../tests/support'
import type { ICategory, ITicket } from '../db'

/**
 * Requests are driven through a plain `axios` instance — not `apiClient` —
 * mirroring `events.spec.ts`: `apiClient`'s response interceptor unwraps a
 * successful response and discards the status code, which these tests need
 * to assert on directly (e.g. exact 201/400/404/409). Plain `axios` still
 * goes through the same XHR/http layer `msw/node`'s interceptor patches. No
 * `baseURL` is set, so requests resolve against jsdom's default origin,
 * matching how `apiClient` resolves a relative path in production.
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
  data: ICategory[]
  meta: TPaginationMeta
}

function validCategoryPayload (overrides: Partial<ICategory> = {}): Partial<ICategory> {
  return {
    name: 'Platinum Pass',
    description: 'All-access pass including backstage entry.',
    ...overrides
  }
}

describe('categories handlers', () => {
  beforeEach(() => resetDatabase())

  describe('GET /categories', () => {
    it('returns the shared envelope: a data array plus pagination meta', async () => {
      const { status, body } = await requestFor('get', '/categories')

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

    it('search matches name and description', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload({
        name: 'Quorvexal Unique Tier',
        description: 'Plendarium unique perks bundle.'
      }))).body as ICategory

      const byName = await requestFor('get', '/categories?search=Quorvexal Unique Tier')
      const byDescription = await requestFor('get', '/categories?search=Plendarium unique perks')
      const byUnrelated = await requestFor('get', '/categories?search=Zzyzx Nonexistent String')

      expect((byName.body as IListResponse).data.map(c => c.id)).toContain(created.id)
      expect((byDescription.body as IListResponse).data.map(c => c.id)).toContain(created.id)
      expect((byUnrelated.body as IListResponse).data.map(c => c.id)).not.toContain(created.id)
    })

    describe('sorting', () => {
      it('sorts by name asc/desc', async () => {
        const ascending = await requestFor('get', '/categories?sort=name&order=asc&perPage=1000')
        const descending = await requestFor('get', '/categories?sort=name&order=desc&perPage=1000')

        const ascendingNames = (ascending.body as IListResponse).data.map(c => c.name)
        const descendingNames = (descending.body as IListResponse).data.map(c => c.name)

        expect(ascendingNames).toEqual([...ascendingNames].sort((a, b) => a.localeCompare(b)))
        expect(descendingNames).toEqual([...ascendingNames].reverse())
      })

      it('sorts by createdAt asc/desc', async () => {
        const older = (await requestFor('post', '/categories', validCategoryPayload({ name: 'Older Sort Probe' }))).body as ICategory

        db.categories.update(older.id, { createdAt: '2020-01-01T00:00:00.000Z' })

        const newer = (await requestFor('post', '/categories', validCategoryPayload({ name: 'Newer Sort Probe' }))).body as ICategory

        db.categories.update(newer.id, { createdAt: '2031-01-01T00:00:00.000Z' })

        const ascending = await requestFor('get', '/categories?sort=createdAt&order=asc&perPage=1000')
        const descending = await requestFor('get', '/categories?sort=createdAt&order=desc&perPage=1000')

        const ascendingIds = (ascending.body as IListResponse).data.map(c => c.id)
        const descendingIds = (descending.body as IListResponse).data.map(c => c.id)

        expect(ascendingIds.indexOf(older.id)).toBeLessThan(ascendingIds.indexOf(newer.id))
        expect(descendingIds.indexOf(newer.id)).toBeLessThan(descendingIds.indexOf(older.id))
      })
    })

    it('paginates via page/perPage and reports meta accordingly', async () => {
      // The seed dataset only carries 6 categories (`CATEGORY_DEFINITIONS` in
      // `src/mocks/db/fixtures.ts`), so a handful more are created here to
      // guarantee at least two full pages of 3 exist regardless of seed size.
      await Promise.all(Array.from({ length: 6 }, (_, index) => requestFor('post', '/categories', validCategoryPayload({ name: `Pagination Probe ${index + 1}` }))
      ))

      const firstPage = await requestFor('get', '/categories?sort=name&order=asc&page=1&perPage=3')
      const secondPage = await requestFor('get', '/categories?sort=name&order=asc&page=2&perPage=3')

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
      expect(firstBody.data.map(c => c.id)).not.toEqual(secondBody.data.map(c => c.id))
    })
  })

  describe('POST /categories', () => {
    it('creates a valid category: 201 with id/createdAt/updatedAt present', async () => {
      const payload = validCategoryPayload()
      const { status, body } = await requestFor('post', '/categories', payload)

      expect(status).toBe(201)

      const created = body as ICategory

      expect(created).toEqual({
        id: expect.any(String),
        name: payload.name,
        description: payload.description,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
      expect(db.categories.get(created.id)).toBeDefined()
    })

    it('defaults description to an empty string when omitted', async () => {
      const { status, body } = await requestFor('post', '/categories', { name: 'No Description Tier' })

      expect(status).toBe(201)
      expect((body as ICategory).description).toBe('')
    })

    it('returns 400 with a name field error when name is missing', async () => {
      const payload = validCategoryPayload()

      delete (payload as Record<string, unknown>).name

      const { status, body } = await requestFor('post', '/categories', payload)

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { name: expect.any(String) }
      })
    })

    it('returns 400 with a name field error when name is only whitespace', async () => {
      const { status, body } = await requestFor('post', '/categories', validCategoryPayload({ name: '   ' }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { name: expect.any(String) }
      })
    })

    it('returns 400 with a name field error when name is not a string', async () => {
      const { status, body } = await requestFor('post', '/categories', { name: 123 })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { name: expect.any(String) }
      })
    })

    it('returns 400 with a description field error when description is not a string', async () => {
      const { status, body } = await requestFor('post', '/categories', validCategoryPayload({ description: 42 as unknown as string }))

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { description: expect.any(String) }
      })
    })

    it('returns 409 with the DUPLICATE_NAME code on an exact-name duplicate', async () => {
      const { status, body } = await requestFor('post', '/categories', validCategoryPayload({ name: 'VIP' }))

      expect(status).toBe(409)
      expect(body).toEqual({
        code: 'DUPLICATE_NAME',
        message: expect.any(String)
      })
    })

    describe('duplicate-name detection is case-insensitive and whitespace-trimmed', () => {
      it('rejects a second create whose name only differs by case and surrounding whitespace', async () => {
        const first = await requestFor('post', '/categories', validCategoryPayload({ name: 'Founders Circle' }))

        expect(first.status).toBe(201)

        const second = await requestFor('post', '/categories', validCategoryPayload({ name: '  founders circle  ' }))

        expect(second.status).toBe(409)
        expect(second.body).toEqual({
          code: 'DUPLICATE_NAME',
          message: expect.any(String)
        })
        // Distinct from the generic dependency-conflict code, so a caller can branch on it.
        expect((second.body as TErrorResponse).code).not.toBe('CONFLICT')
      })

      it('rejects "VIP" then "  vip  " as the same name', async () => {
        const first = await requestFor('post', '/categories', validCategoryPayload({ name: 'VIP Unique Probe' }))

        expect(first.status).toBe(201)

        const second = await requestFor('post', '/categories', validCategoryPayload({ name: '  vip unique probe  ' }))

        expect(second.status).toBe(409)
        expect((second.body as TErrorResponse).code).toBe('DUPLICATE_NAME')
      })
    })
  })

  describe('GET /categories/{id}', () => {
    it('returns 200 for a known seeded id', async () => {
      const seeded = db.categories.list({ perPage: 1 }).data[0]

      if (seeded === undefined) {
        throw new Error('expected at least one seeded category')
      }

      const { status, body } = await requestFor('get', `/categories/${seeded.id}`)

      expect(status).toBe(200)
      expect((body as ICategory).id).toBe(seeded.id)
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('get', '/categories/unknown-id')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('PATCH /categories/{id}', () => {
    it('applies a partial update: only the given field changes, others retain their prior values, with no "required" error for untouched fields', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory

      const { status, body } = await requestFor('patch', `/categories/${created.id}`, { description: 'Updated description.' })

      expect(status).toBe(200)

      const updated = body as ICategory

      expect(updated.name).toBe(created.name)
      expect(updated.description).toBe('Updated description.')
      expect(updated.updatedAt).not.toBe(created.updatedAt)
    })

    it('does not require name on a partial update that omits it', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory

      const { status, body } = await requestFor('patch', `/categories/${created.id}`, { description: 'Only description changes.' })

      expect(status).toBe(200)
      expect((body as ICategory).name).toBe(created.name)
    })

    it('returns 400 with a name field error when name is patched to whitespace only', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory

      const { status, body } = await requestFor('patch', `/categories/${created.id}`, { name: '   ' })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { name: expect.any(String) }
      })
    })

    it('returns 400 with a name field error when name is patched to a non-string value', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory

      const { status, body } = await requestFor('patch', `/categories/${created.id}`, { name: true })

      expect(status).toBe(400)
      expect(body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        errors: { name: expect.any(String) }
      })
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('patch', '/categories/unknown-id', { name: 'Anything' })

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })

    it('returns 409 with the DUPLICATE_NAME code when renamed to another category\'s name (case-insensitive, trimmed)', async () => {
      const target = (await requestFor('post', '/categories', validCategoryPayload({ name: 'Rename Target' }))).body as ICategory

      const { status, body } = await requestFor('patch', `/categories/${target.id}`, { name: '  vip  ' })

      expect(status).toBe(409)
      expect(body).toEqual({
        code: 'DUPLICATE_NAME',
        message: expect.any(String)
      })
      expect(db.categories.get(target.id)?.name).toBe('Rename Target')
    })

    it('does not 409 when renaming a category to its own current name, just re-cased and re-trimmed', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload({ name: 'Self Rename Probe' }))).body as ICategory

      const { status, body } = await requestFor('patch', `/categories/${created.id}`, { name: '  SELF rename PROBE  ' })

      expect(status).toBe(200)
      expect((body as ICategory).name).toBe('  SELF rename PROBE  ')
    })

    it('leaves the stored record untouched when a duplicate-name patch is rejected', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload({ name: 'Untouched On Conflict' }))).body as ICategory

      const before = db.categories.get(created.id)

      const { status } = await requestFor('patch', `/categories/${created.id}`, { name: 'VIP' })

      expect(status).toBe(409)
      expect(db.categories.get(created.id)).toEqual(before)
    })
  })

  describe('DELETE /categories/{id}', () => {
    it('deletes a freshly created category with no tickets referencing it: 204, and it is actually gone', async () => {
      // Created fresh (rather than picked from seed data) so the test's premise —
      // "no ticket references this category" — is explicit and does not depend on
      // incidental seed shape (every seeded category happens to have a ticket,
      // given 400 seeded tickets spread across only 6 seeded categories).
      const target = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory

      const { status, body } = await requestFor('delete', `/categories/${target.id}`)

      expect(status).toBe(204)
      expect(body).toBeFalsy()
      expect(db.categories.get(target.id)).toBeUndefined()
    })

    it('blocks deletion of a category that tickets reference: 409 with a DependencyConflict body carrying the correct count, and the category survives', async () => {
      const category = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory
      const anyEvent = db.events.list({ perPage: 1 }).data[0]

      if (anyEvent === undefined) {
        throw new Error('expected at least one seeded event')
      }

      const ticketFixtures: ITicket[] = [
        {
          id: 'categories-spec-ticket-1',
          name: 'Categories Spec Test Ticket 1',
          price: 1000,
          currency: 'USD',
          quantity: 10,
          status: 'draft',
          eventId: anyEvent.id,
          categoryId: category.id,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 'categories-spec-ticket-2',
          name: 'Categories Spec Test Ticket 2',
          price: 2000,
          currency: 'USD',
          quantity: 5,
          status: 'draft',
          eventId: anyEvent.id,
          categoryId: category.id,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ]

      for (const ticket of ticketFixtures) {
        db.tickets.insert(ticket)
      }

      const { status, body } = await requestFor('delete', `/categories/${category.id}`)

      expect(status).toBe(409)
      expect(body).toEqual({
        code: 'CONFLICT',
        message: expect.any(String),
        entity: 'ticket',
        count: 2
      })
      expect(db.categories.get(category.id)).toBeDefined()
    })

    it('returns 404 for an unknown id', async () => {
      const { status, body } = await requestFor('delete', '/categories/unknown-id')

      expect(status).toBe(404)
      expect(body).toEqual({ code: 'NOT_FOUND', message: expect.any(String) })
    })
  })

  describe('GET /categories?format=csv', () => {
    it('returns a CSV document with the expected headers and content type', async () => {
      const { status, body } = await requestFor('get', '/categories?format=csv')

      expect(status).toBe(200)
      expect(typeof body).toBe('string')
      expect((body as string).split('\r\n')[0]).toBe('Name,Description,Created At')
    })

    it('serialises every filtered record, not just the current page', async () => {
      await requestFor('post', '/categories', validCategoryPayload({ name: 'CSV Export Probe' }))

      const { body } = await requestFor('get', '/categories?format=csv&perPage=1')
      const rows = (body as string).split('\r\n')

      // perPage=1 would cap a JSON list at a single record; the CSV export
      // must ignore pagination and include the full filtered result.
      expect(rows.length).toBeGreaterThan(2)
      expect(rows.some(row => row.startsWith('CSV Export Probe,'))).toBe(true)
    })
  })

  describe('POST /categories/bulk', () => {
    async function createCategory (name: string): Promise<ICategory> {
      return (await requestFor('post', '/categories', validCategoryPayload({ name }))).body as ICategory
    }

    it('total success: deletes every identifier and reports an empty failed array', async () => {
      const a = await createCategory('Bulk Delete Success A')
      const b = await createCategory('Bulk Delete Success B')

      const { status, body } = await requestFor('post', '/categories/bulk', { ids: [a.id, b.id], operation: 'delete' })

      expect(status).toBe(200)
      expect(body).toEqual({ succeeded: expect.arrayContaining([a.id, b.id]), failed: [] })
      expect(db.categories.get(a.id)).toBeUndefined()
      expect(db.categories.get(b.id)).toBeUndefined()
    })

    it('total failure: every identifier fails and succeeded is empty', async () => {
      const { status, body } = await requestFor('post', '/categories/bulk', {
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
      const valid = await createCategory('Bulk Partial Success')

      const { status, body } = await requestFor('post', '/categories/bulk', {
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
      const category = await createCategory('Bulk Delete Blocked')
      const anyEvent = db.events.list({ perPage: 1 }).data[0]

      if (anyEvent === undefined) {
        throw new Error('expected at least one seeded event')
      }

      db.tickets.insert({
        id: 'categories-bulk-spec-ticket',
        name: 'Categories Bulk Spec Test Ticket',
        price: 1000,
        currency: 'USD',
        quantity: 10,
        status: 'draft',
        eventId: anyEvent.id,
        categoryId: category.id,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      })

      const { status, body } = await requestFor('post', '/categories/bulk', { ids: [category.id], operation: 'delete' })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded).toEqual([])
      expect(result.failed).toEqual([{ id: category.id, code: 'CONFLICT', reason: expect.any(String), count: 1 }])
      expect(db.categories.get(category.id)).toBeDefined()
    })

    it('reports every identifier as failed for an unsupported archive operation, rather than silently no-op-ing', async () => {
      const category = await createCategory('Bulk Archive Unsupported')

      const { status, body } = await requestFor('post', '/categories/bulk', { ids: [category.id], operation: 'archive' })

      expect(status).toBe(200)

      const result = body as TBulkResult

      expect(result.succeeded).toEqual([])
      expect(result.failed).toEqual([{ id: category.id, code: expect.any(String), reason: expect.any(String) }])
      expect(db.categories.get(category.id)).toBeDefined()
    })

    it('returns 400 for a malformed request (empty ids array)', async () => {
      const { status, body } = await requestFor('post', '/categories/bulk', { ids: [], operation: 'delete' })

      expect(status).toBe(400)
      expect(body).toEqual({ code: 'VALIDATION_ERROR', message: expect.any(String) })
    })
  })

  describe('viewer permissions (PRD-007)', () => {
    it('rejects POST /categories for a viewer with 403', async () => {
      const token = await loginAsViewer()

      const { status, body } = await requestFor('post', '/categories', validCategoryPayload(), { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
    })

    it('rejects PATCH /categories/{id} for a viewer with 403', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory
      const token = await loginAsViewer()

      const { status, body } = await requestFor('patch', `/categories/${created.id}`, { name: 'Renamed' }, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
    })

    it('rejects DELETE /categories/{id} for a viewer with 403', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory
      const token = await loginAsViewer()

      const { status, body } = await requestFor('delete', `/categories/${created.id}`, undefined, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
      expect(db.categories.get(created.id)).toBeDefined()
    })

    it('rejects POST /categories/bulk for a viewer with 403', async () => {
      const created = (await requestFor('post', '/categories', validCategoryPayload())).body as ICategory
      const token = await loginAsViewer()

      const { status, body } = await requestFor('post', '/categories/bulk', { ids: [created.id], operation: 'delete' }, { token })

      expect(status).toBe(403)
      expect(body).toEqual({ code: 'FORBIDDEN', message: expect.any(String) })
      expect(db.categories.get(created.id)).toBeDefined()
    })

    it('regression: an admin can still create/update/delete after this slice', async () => {
      const token = await loginAsAdmin()

      const created = (await requestFor('post', '/categories', validCategoryPayload({ name: 'Admin Regression' }), { token })).body as ICategory

      expect(created.id).toEqual(expect.any(String))

      const updated = await requestFor('patch', `/categories/${created.id}`, { description: 'Updated' }, { token })

      expect(updated.status).toBe(200)

      const deleted = await requestFor('delete', `/categories/${created.id}`, undefined, { token })

      expect(deleted.status).toBe(204)
    })

    it('leaves the tokenless case unchanged: a write with no Authorization header still proceeds (requireWriteAccess only rejects a resolved viewer)', async () => {
      const { status, body } = await requestFor('post', '/categories', validCategoryPayload({ name: 'Tokenless Write Still Works' }))

      expect(status).toBe(201)
      expect((body as ICategory).name).toBe('Tokenless Write Still Works')
    })
  })
})
