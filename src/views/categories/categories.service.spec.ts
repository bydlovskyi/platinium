import { categoriesService } from './categories.service'

import { resetDatabase } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { ICategory } from '@/mocks/db'

function buildCategory (overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: overrides.id ?? 'category-1',
    name: 'General Admission',
    description: 'Standard entry.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

interface ICapturedRequest {
  method: string
  pathname: string
  search: string
  body: unknown
}

function captureRequests (): ICapturedRequest[] {
  const captured: ICapturedRequest[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    const url = new URL(request.url)
    captured.push({ method: request.method, pathname: url.pathname, search: url.search, body: undefined })
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: ((...args: any[]) => void)[] = []

beforeEach(() => {
  resetDatabase({ events: [], categories: [], tickets: [], users: [] })
})

afterEach(() => {
  for (const listener of capturedListeners) {
    server.events.removeListener('request:start', listener)
  }
  capturedListeners = []
})

describe('categoriesService', () => {
  describe('list', () => {
    it('sends a GET request to /categories with the given params in the query string', async () => {
      db.categories.insert(buildCategory())
      const requests = captureRequests()

      await categoriesService.list({ search: 'general', sort: 'name', order: 'asc', page: 2, perPage: 10 })

      expect(requests).toHaveLength(1)
      expect(requests[0]!.method).toBe('GET')
      expect(requests[0]!.pathname).toBe('/categories')

      const params = new URLSearchParams(requests[0]!.search)
      expect(params.get('search')).toBe('general')
      expect(params.get('sort')).toBe('name')
      expect(params.get('order')).toBe('asc')
      expect(params.get('page')).toBe('2')
      expect(params.get('perPage')).toBe('10')
    })

    it('returns the list envelope', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'VIP' }))

      const result = await categoriesService.list({})

      expect(result.data.some(category => category.id === 'c1')).toBe(true)
      expect(result.meta).toEqual(expect.objectContaining({ total: expect.any(Number) }))
    })
  })

  describe('get', () => {
    it('sends a GET request to /categories/{id} with the given id interpolated into the URL', async () => {
      db.categories.insert(buildCategory({ id: 'category-42', name: 'VIP' }))
      const requests = captureRequests()

      const category = await categoriesService.get('category-42')

      expect(requests).toEqual([expect.objectContaining({ method: 'GET', pathname: '/categories/category-42' })])
      expect(category.name).toBe('VIP')
    })

    it('rejects when the id does not exist', async () => {
      await expect(categoriesService.get('does-not-exist')).rejects.toBeDefined()
    })
  })

  describe('create', () => {
    it('sends a POST request to /categories with the payload', async () => {
      const requests = captureRequests()

      const created = await categoriesService.create({ name: 'Early Bird', description: 'Discounted early tickets.' })

      expect(requests).toEqual([expect.objectContaining({ method: 'POST', pathname: '/categories' })])
      expect(created.name).toBe('Early Bird')
      expect(db.categories.get(created.id)).toBeDefined()
    })
  })

  describe('update', () => {
    it('sends a PATCH request to /categories/{id} with the given id interpolated into the URL', async () => {
      db.categories.insert(buildCategory({ id: 'category-42' }))
      const requests = captureRequests()

      const updated = await categoriesService.update('category-42', { name: 'Renamed', description: 'Updated.' })

      expect(requests).toEqual([expect.objectContaining({ method: 'PATCH', pathname: '/categories/category-42' })])
      expect(updated.name).toBe('Renamed')
    })
  })

  describe('delete', () => {
    it('sends a DELETE request to /categories/{id} with the given id interpolated into the URL', async () => {
      db.categories.insert(buildCategory({ id: 'category-42' }))
      const requests = captureRequests()

      await categoriesService.delete('category-42')

      expect(requests).toEqual([expect.objectContaining({ method: 'DELETE', pathname: '/categories/category-42' })])
    })

    it('actually removes the record from the mock database on success', async () => {
      db.categories.insert(buildCategory({ id: 'category-7' }))

      await categoriesService.delete('category-7')

      expect(db.categories.get('category-7')).toBeUndefined()
    })

    it('rejects when the id does not exist', async () => {
      await expect(categoriesService.delete('does-not-exist')).rejects.toBeDefined()
    })
  })

  describe('exportCsv', () => {
    it('sends a GET request to /categories with format=csv plus the given filter params, and resolves a Blob', async () => {
      db.categories.insert(buildCategory({ id: 'category-42', name: 'VIP' }))
      const requests = captureRequests()

      const blob = await categoriesService.exportCsv({ search: 'vip', sort: 'name', order: 'asc' })

      expect(requests).toHaveLength(1)
      expect(requests[0]!.method).toBe('GET')
      expect(requests[0]!.pathname).toBe('/categories')

      const params = new URLSearchParams(requests[0]!.search)
      expect(params.get('format')).toBe('csv')
      expect(params.get('search')).toBe('vip')

      // Duck-typed, not toBeInstanceOf(Blob): the fetch adapter's Blob comes from undici's realm, not jsdom's.
      expect(typeof blob.size).toBe('number')
      expect(blob.type).toContain('text/csv')
      const text = await blob.text()
      expect(text).toContain('VIP')
    })

    it('never sends page/perPage — the export always covers the full filtered result', async () => {
      const requests = captureRequests()

      await categoriesService.exportCsv({ search: 'vip' })

      const params = new URLSearchParams(requests[0]!.search)
      expect(params.has('page')).toBe(false)
      expect(params.has('perPage')).toBe(false)
    })
  })
})
