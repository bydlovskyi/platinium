import { flushPromises } from '@vue/test-utils'

import Categories from './Categories.vue'

import { mountWithRouterAndPinia, resetDatabase } from '../../../tests/support'
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

let capturedListeners: ((...args: any[]) => void)[] = []
let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountCategories () {
  const result = await mountWithRouterAndPinia(Categories, { initialRoute: '/categories', attachTo: document.body })

  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  authStore.token = 'mock-token-under-test'
  authStore.user = { id: 'u1', name: 'Ada Admin', email: 'admin@platinium.test', role: 'admin' }

  await result.router.push('/categories')
  await flushPromises()

  return result
}

describe('Categories list screen', () => {
  beforeEach(() => {
    resetDatabase({ events: [], categories: [], tickets: [], users: [] })
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

    describe('non-column "Sort by creation date" control', () => {
      it('reflects the selected option in the URL and the request MSW receives', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Older', createdAt: '2020-01-01T00:00:00.000Z' }))
        db.categories.insert(buildCategory({ id: 'c2', name: 'Newer', createdAt: '2031-01-01T00:00:00.000Z' }))
        const requests = captureCategoriesRequests()

        const { wrapper, router } = await mountCategories()

        const sortSelect = wrapper.find('[aria-label="Sort by creation date"]')
        await sortSelect.trigger('click')
        await flushPromises()

        const newestOption = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
          .find(item => item.textContent?.trim() === 'Newest first')
        expect(newestOption).toBeDefined()
        newestOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await flushPromises()

        await vi.waitFor(() => {
          expect(router.currentRoute.value.query.sort).toBe('createdAt')
          expect(router.currentRoute.value.query.order).toBe('desc')
        })

        await vi.waitFor(() => {
          expect(requests.some(params => params.get('sort') === 'createdAt' && params.get('order') === 'desc')).toBe(true)
        })
      })

      it('switches to the other order (oldest first) when re-selected', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Older', createdAt: '2020-01-01T00:00:00.000Z' }))
        db.categories.insert(buildCategory({ id: 'c2', name: 'Newer', createdAt: '2031-01-01T00:00:00.000Z' }))
        const requests = captureCategoriesRequests()

        const { wrapper, router } = await mountCategories()

        await router.push({ query: { sort: 'createdAt', order: 'desc' } })
        await flushPromises()

        const sortSelect = wrapper.find('[aria-label="Sort by creation date"]')
        await sortSelect.trigger('click')
        await flushPromises()

        const oldestOption = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
          .find(item => item.textContent?.trim() === 'Oldest first')
        expect(oldestOption).toBeDefined()
        oldestOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await flushPromises()

        await vi.waitFor(() => {
          expect(router.currentRoute.value.query.sort).toBe('createdAt')
          expect(router.currentRoute.value.query.order).toBe('asc')
        })

        await vi.waitFor(() => {
          expect(requests.some(params => params.get('sort') === 'createdAt' && params.get('order') === 'asc')).toBe(true)
        })
      })

      it('clears the sort from the URL and the request when the selection is cleared', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Older', createdAt: '2020-01-01T00:00:00.000Z' }))
        const requests = captureCategoriesRequests()

        const { wrapper, router } = await mountCategories()

        await router.push({ query: { sort: 'createdAt', order: 'desc' } })
        await flushPromises()

        // The clear icon only renders on hover (Element Plus's showClearBtn).
        const selectWrapper = wrapper.find('[aria-label="Sort by creation date"]').element.closest('.el-select')!
        selectWrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
        await flushPromises()

        const clearIcon = wrapper.find('.el-select__clear')
        expect(clearIcon.exists()).toBe(true)
        await clearIcon.trigger('click')
        await flushPromises()

        await vi.waitFor(() => {
          expect(router.currentRoute.value.query.sort).toBeUndefined()
          expect(router.currentRoute.value.query.order).toBeUndefined()
        })

        await vi.waitFor(() => {
          expect(requests.some(params => params.get('sort') === null)).toBe(true)
        })
      })

      it('does not show a name-column sort indicator while sorted by creation date', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Older', createdAt: '2020-01-01T00:00:00.000Z' }))

        const { wrapper, router } = await mountCategories()

        await router.push({ query: { sort: 'createdAt', order: 'desc' } })
        await flushPromises()

        await vi.waitFor(() => {
          const nameHeader = wrapper.findAll('th').find(header => header.text().includes('Name'))!
          expect(nameHeader.find('.sort-caret.ascending.is-active, .sort-caret.descending.is-active').exists()).toBe(false)
        })
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
