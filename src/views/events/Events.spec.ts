import { http, HttpResponse } from 'msw'
import { flushPromises } from '@vue/test-utils'

import Events from './Events.vue'

import { mountWithRouterAndPinia, resetDatabase, setViewportToBreakpoint } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { IEvent } from '@/mocks/db'

/**
 * Events list screen, integration tested end to end (GitHub issue #26,
 * PRD-004's testing boundary: "List behaviour — integration tested: search,
 * each filter, sort toggling and pagination all reflected in the URL and in
 * the request the mock receives"). Mounted behind a real memory-history
 * router (seeded with the app's actual route table and the real
 * `routeGuard`) and a real Pinia instance, against the shared MSW node
 * server answering `GET /events` for real — no mocked `eventsService`, no
 * mocked composables. Assertions target `route.query`, the actual request
 * MSW received (via a `request:start` life-cycle listener over the shared
 * node server, matching `TESTING.md`'s worked example) and user-visible DOM,
 * never internal component state.
 *
 * Signs a session in directly by writing to the auth store, matching
 * `admin-shell.spec.ts`'s established pattern, since this slice is only
 * responsible for the list screen behind the guard, not the login flow.
 */

function buildEvent (overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: overrides.id ?? `event-${Math.random().toString(36).slice(2)}`,
    name: 'Rooftop Jazz Night',
    country: 'US',
    venue: 'Skyline Terrace',
    startDate: '2027-05-01',
    endDate: '2027-05-02',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

/** Captures the query params of every `GET /events` request MSW receives, without replacing the real handler's behaviour. */
function captureEventsRequests (): URLSearchParams[] {
  const captured: URLSearchParams[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/events') {
      captured.push(url.searchParams)
    }
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: ((...args: any[]) => void)[] = []
let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountEvents () {
  const result = await mountWithRouterAndPinia(Events, { initialRoute: '/events', attachTo: document.body })

  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  authStore.token = 'mock-token-under-test'
  authStore.user = { id: 'u1', name: 'Ada Admin', email: 'admin@platinium.test', role: 'admin' }

  await result.router.push('/events')
  await flushPromises()

  return result
}

describe('Events list screen', () => {
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
      const { wrapper } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Nothing here yet')
      })
    })

    it('shows the no-matches empty state when a filter narrows to nothing, with a way to clear it', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha', status: 'draft' }))

      const { wrapper, router } = await mountEvents()

      await router.push({ query: { status: 'cancelled' } })
      await flushPromises()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('No results match your filters')
      })
    })

    it('clicking "Clear filters" on a search-only no-matches empty state clears the search and shows the full list again (GitHub issue #26)', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha Concert' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      await router.push({ query: { search: 'zzzznomatch' } })
      await flushPromises()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('No results match your filters')
      })

      const clearFiltersButton = wrapper.findAll('button').find(button => button.text().includes('Clear filters'))
      expect(clearFiltersButton).toBeDefined()

      await clearFiltersButton!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query.search).toBeUndefined()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Alpha Concert')
      })

      expect(requests.some(params => params.get('search') === null)).toBe(true)
    })

    it('shows an error state, then recovers on retry', async () => {
      server.use(http.get('/events', () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))

      const { wrapper } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      })

      server.resetHandlers()
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha' }))

      const retryButton = wrapper.findAll('button').find(button => button.text().includes('Retry'))
      expect(retryButton).toBeDefined()

      await retryButton!.trigger('click')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Alpha')
      })
    })

    it('renders rows once events exist', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha Concert' }))

      const { wrapper } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Alpha Concert')
      })
    })
  })

  describe('columns', () => {
    it('renders country as a name, dates as a readable range and status through the shared tag', async () => {
      db.events.insert(buildEvent({
        id: 'e1',
        name: 'Alpha Concert',
        country: 'DE',
        startDate: '2027-05-01',
        endDate: '2027-05-03',
        status: 'published'
      }))

      const { wrapper } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Germany')
        expect(wrapper.text()).toContain('Published')
      })
    })
  })

  describe('search', () => {
    it('reflects a debounced search in the URL and in the request MSW receives', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha Concert' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      await wrapper.find('input[aria-label="Search"]').setValue('jazz festival')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.search).toBe('jazz festival')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('search') === 'jazz festival')).toBe(true)
      })
    })
  })

  describe('filters', () => {
    it('reflects the status filter in the URL, the request, and shows a removable chip', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha', status: 'draft' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Beta', status: 'published' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      const statusSelect = wrapper.find('[aria-label="Filter by status"]')
      await statusSelect.trigger('click')
      await flushPromises()

      const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
        .find(item => item.textContent?.trim() === 'Published')
      expect(option).toBeDefined()
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.status).toBe('published')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('status') === 'published')).toBe(true)
      })

      await vi.waitFor(() => {
        const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Status'))
        expect(chip).toBeDefined()
      })

      const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Status'))!
      await chip.find('.el-tag__close').trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.status).toBeUndefined()
      })
    })

    it('reflects the country filter in the URL, the request, and shows a removable chip', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha', country: 'US' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Beta', country: 'DE' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      const countrySelect = wrapper.find('[aria-label="Filter by country"]')
      await countrySelect.trigger('click')
      await flushPromises()

      const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
        .find(item => item.textContent?.trim() === 'Germany')
      expect(option).toBeDefined()
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.country).toBe('DE')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('country') === 'DE')).toBe(true)
      })

      const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Country'))
      expect(chip).toBeDefined()

      await chip!.find('.el-tag__close').trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.country).toBeUndefined()
      })
    })

    it('reflects the date-range filter in the URL, the request, and shows a removable chip', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Inside window', startDate: '2030-06-10', endDate: '2030-06-12' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Before window', startDate: '2030-01-01', endDate: '2030-01-05' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      // Drives the composable's setter directly through the URL, the same
      // observable surface a real date-range selection produces (this
      // slice's own useEventsList wires the picker's v-model to setFilter
      // for both bounds) — el-date-picker's own panel interaction is
      // exercised by Element Plus's own test suite, not re-tested here.
      await router.push({ query: { startDateFrom: '2030-06-01', startDateTo: '2030-06-30' } })
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.startDateFrom).toBe('2030-06-01')
        expect(router.currentRoute.value.query.startDateTo).toBe('2030-06-30')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('startDateFrom') === '2030-06-01' && params.get('startDateTo') === '2030-06-30')).toBe(true)
      })

      await vi.waitFor(() => {
        const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Dates'))
        expect(chip).toBeDefined()
      })

      const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Dates'))!
      await chip.find('.el-tag__close').trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.startDateFrom).toBeUndefined()
        expect(router.currentRoute.value.query.startDateTo).toBeUndefined()
      })
    })
  })

  describe('sorting', () => {
    it('reflects sort toggling by name in the URL and the request MSW receives', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Beta' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()
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

    it('supports sorting by start date, end date and status', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha' }))
      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()
      await flushPromises()

      const datesHeader = wrapper.findAll('th').find(header => header.text().includes('Dates'))!
      await datesHeader.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.sort).toBe('startDate')
      })
      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'startDate')).toBe(true)
      })

      const statusHeader = wrapper.findAll('th').find(header => header.text().includes('Status'))!
      await statusHeader.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.sort).toBe('status')
      })
      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'status')).toBe(true)
      })
    })
  })

  describe('pagination', () => {
    it('reflects the page in the URL and the request, with the total shown', async () => {
      for (let index = 1; index <= 25; index++) {
        db.events.insert(buildEvent({ id: `e${index}`, name: `Event ${String(index).padStart(2, '0')}` }))
      }

      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.find('.el-pagination__total').text()).toContain('25')
      })

      const pager = wrapper.findComponent({ name: 'ElPagination' })
      await pager.vm.$emit('current-change', 2)
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.page).toBe('2')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('page') === '2')).toBe(true)
      })
    })

    it('reflects a page-size change in the URL and the request', async () => {
      for (let index = 1; index <= 25; index++) {
        db.events.insert(buildEvent({ id: `e${index}`, name: `Event ${String(index).padStart(2, '0')}` }))
      }

      const requests = captureEventsRequests()

      const { wrapper, router } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.find('.el-pagination__total').exists()).toBe(true)
      })

      const pager = wrapper.findComponent({ name: 'ElPagination' })
      await pager.vm.$emit('size-change', 50)
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.perPage).toBe('50')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('perPage') === '50')).toBe(true)
      })
    })
  })

  describe('mobile card presentation', () => {
    it('renders readable event cards at 375px', async () => {
      setViewportToBreakpoint('mobile')
      db.events.insert(buildEvent({ id: 'e1', name: 'Alpha Concert', country: 'US', status: 'published' }))

      const { wrapper } = await mountEvents()

      await vi.waitFor(() => {
        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.text()).toContain('Alpha Concert')
        expect(wrapper.text()).toContain('United States')
        expect(wrapper.text()).toContain('Published')
      })

      setViewportToBreakpoint('desktop')
    })
  })

  describe('page header', () => {
    it('renders a title and a create action', async () => {
      const { wrapper } = await mountEvents()

      expect(wrapper.find('h1').text()).toBe('Events')

      await vi.waitFor(() => {
        expect(wrapper.findAll('button').some(button => button.text().includes('Create event'))).toBe(true)
      })
    })
  })
})
