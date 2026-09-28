import { flushPromises } from '@vue/test-utils'

import Categories from '@/views/categories/Categories.vue'

import { mountWithRouterAndPinia, emptyDataset, resetDatabase, signInAs } from '../support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { ICategory } from '@/mocks/db'

function buildCategory (overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: overrides.id ?? `category-${Math.random().toString(36).slice(2)}`,
    name: 'General Admission',
    description: 'Standard entry.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function captureCategoriesRequests (): URLSearchParams[] {
  const captured: URLSearchParams[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/categories') {
      captured.push(url.searchParams)
    }
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: Parameters<typeof server.events.on<'request:start'>>[1][] = []
let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountCategories () {
  const result = await mountWithRouterAndPinia(Categories, { initialRoute: '/categories', attachTo: document.body })

  mountedWrappers.push(result.wrapper)

  await signInAs('admin')

  await result.router.push('/categories')
  await flushPromises()

  return result
}

describe('Categories list screen', () => {
  beforeEach(() => {
    resetDatabase(emptyDataset())
  })

  afterEach(() => {
    for (const listener of capturedListeners) {
      server.events.removeListener('request:start', listener)
    }
    capturedListeners = []

    for (const wrapper of mountedWrappers) {
      wrapper.unmount()
    }
    mountedWrappers = []

    document.body.innerHTML = ''
  })

  describe('async states', () => {
    it('shows the no-data empty state when nothing exists yet', async () => {
      const { wrapper } = await mountCategories()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Nothing here yet')
      })
    })

    it('renders rows once categories exist', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'Backstage Pass' }))

      const { wrapper } = await mountCategories()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Backstage Pass')
      })
    })
  })

  describe('search', () => {
    it('reflects a debounced search in the URL and in the request MSW receives', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'General Admission' }))
      const requests = captureCategoriesRequests()

      const { wrapper, router } = await mountCategories()

      await wrapper.find('input[aria-label="Search"]').setValue('vip lounge')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.search).toBe('vip lounge')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('search') === 'vip lounge')).toBe(true)
      })
    })

    it('sends one request per settled search term, not one per keystroke', async () => {
      const requests = captureCategoriesRequests()

      const { wrapper, router } = await mountCategories()
      const input = wrapper.find('input[aria-label="Search"]')

      for (const partial of ['v', 'vi', 'vip']) {
        await input.setValue(partial)
      }
      await flushPromises()

      expect(requests.some(params => params.has('search'))).toBe(false)

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.search).toBe('vip')
      })
      await flushPromises()

      expect(requests.filter(params => params.has('search')).map(params => params.get('search'))).toEqual(['vip'])
    })

    it('searches by description as well as name', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'Zeta Tier', description: 'Includes a backstage tour.' }))
      const requests = captureCategoriesRequests()

      const { router } = await mountCategories()

      await router.push({ query: { search: 'backstage tour' } })
      await flushPromises()

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('search') === 'backstage tour')).toBe(true)
      })
    })
  })

  describe('sorting', () => {
    it('reflects sort toggling by the name column header in the URL and the request MSW receives', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'Alpha Tier' }))
      db.categories.insert(buildCategory({ id: 'c2', name: 'Beta Tier' }))
      const requests = captureCategoriesRequests()

      const { wrapper, router } = await mountCategories()
      await flushPromises()

      const nameHeader = wrapper.findAll('th').find(header => header.text().includes('Name'))!
      await nameHeader.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.sort).toBe('name')
        expect(router.currentRoute.value.query.order).toBe('asc')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'name' && params.get('order') === 'asc')).toBe(true)
      })

      await nameHeader.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.order).toBe('desc')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'name' && params.get('order') === 'desc')).toBe(true)
      })
    })

    it('shows each category\'s creation date in a Created column', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'Older', createdAt: '2020-01-15T12:00:00.000Z' }))

      const { wrapper } = await mountCategories()

      await vi.waitFor(() => {
        expect(wrapper.findAll('th').some(header => header.text().includes('Created'))).toBe(true)
        expect(wrapper.text()).toContain('Jan 15, 2020')
      })
    })

    it('sorts by creation date through the Created column header', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'Older', createdAt: '2020-01-01T00:00:00.000Z' }))
      db.categories.insert(buildCategory({ id: 'c2', name: 'Newer', createdAt: '2031-01-01T00:00:00.000Z' }))
      const requests = captureCategoriesRequests()

      const { wrapper, router } = await mountCategories()
      await flushPromises()

      const createdHeader = wrapper.findAll('th').find(header => header.text().includes('Created'))!
      await createdHeader.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.sort).toBe('createdAt')
        expect(router.currentRoute.value.query.order).toBe('asc')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'createdAt' && params.get('order') === 'asc')).toBe(true)
      })
    })
  })

  describe('page header', () => {
    it('renders a title and a create action', async () => {
      const { wrapper } = await mountCategories()

      expect(wrapper.find('h1').text()).toBe('Categories')

      await vi.waitFor(() => {
        expect(wrapper.findAll('button').some(button => button.text().includes('Create category'))).toBe(true)
      })
    })
  })
})
