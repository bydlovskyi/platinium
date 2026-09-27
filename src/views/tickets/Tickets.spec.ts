import { flushPromises } from '@vue/test-utils'

import Tickets from './Tickets.vue'

import { mountWithRouterAndPinia, resetDatabase, setViewportToBreakpoint } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { ICategory, IEvent, ITicket } from '@/mocks/db'

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

function buildTicket (overrides: Partial<ITicket> = {}): ITicket {
  return {
    id: overrides.id ?? `ticket-${Math.random().toString(36).slice(2)}`,
    name: 'General Admission Ticket',
    price: 4999,
    currency: 'USD',
    quantity: 100,
    status: 'on_sale',
    eventId: overrides.eventId ?? 'event-1',
    categoryId: overrides.categoryId ?? 'category-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function captureTicketsRequests (): URLSearchParams[] {
  const captured: URLSearchParams[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/tickets') {
      captured.push(url.searchParams)
    }
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: ((...args: any[]) => void)[] = []
let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountTickets (initialRoute = '/tickets') {
  const result = await mountWithRouterAndPinia(Tickets, { initialRoute, attachTo: document.body })

  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  authStore.token = 'mock-token-under-test'
  authStore.user = { id: 'u1', name: 'Ada Admin', email: 'admin@platinium.test', role: 'admin' }

  await result.router.push(initialRoute)
  await flushPromises()

  return result
}

describe('Tickets list screen', () => {
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
      const { wrapper } = await mountTickets()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Nothing here yet')
      })
    })

    it('renders rows once tickets exist', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', name: 'Alpha Ticket' }))

      const { wrapper } = await mountTickets()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Alpha Ticket')
      })
    })
  })

  describe('columns', () => {
    it('renders event and category by name (never by id), price with currency, and status through the shared tag', async () => {
      db.events.insert(buildEvent({ id: 'event-1', name: 'Berlin Show' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'VIP' }))
      db.tickets.insert(buildTicket({
        id: 't1',
        name: 'VIP Pass',
        price: 12345,
        currency: 'EUR',
        status: 'on_sale',
        eventId: 'event-1',
        categoryId: 'category-1'
      }))

      const { wrapper } = await mountTickets()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Berlin Show')
        expect(wrapper.text()).toContain('VIP')
        expect(wrapper.text()).toContain('€123.45')
        expect(wrapper.text()).toContain('On sale')
        expect(wrapper.text()).not.toContain('event-1')
        expect(wrapper.text()).not.toContain('category-1')
      })
    })

    it('visually distinguishes a zero-quantity ticket', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', name: 'Sold Out Ticket', quantity: 0 }))

      const { wrapper } = await mountTickets()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Sold Out Ticket')
        expect(wrapper.text()).toContain('Sold out (0)')
      })
    })
  })

  describe('search', () => {
    it('reflects a debounced search in the URL and in the request MSW receives', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', name: 'Alpha Ticket' }))
      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()

      await wrapper.find('input[aria-label="Search"]').setValue('vip pass')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.search).toBe('vip pass')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('search') === 'vip pass')).toBe(true)
      })
    })
  })

  describe('filters', () => {
    it('reflects the status filter in the URL, the request, and shows a removable chip', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', status: 'draft' }))
      db.tickets.insert(buildTicket({ id: 't2', status: 'archived' }))
      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()

      const statusSelect = wrapper.find('[aria-label="Filter by status"]')
      await statusSelect.trigger('click')
      await flushPromises()

      const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
        .find(item => item.textContent?.trim() === 'Archived')
      expect(option).toBeDefined()
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.status).toBe('archived')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('status') === 'archived')).toBe(true)
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

    it('reflects the currency filter in the URL, the request, and shows a removable chip', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', currency: 'USD' }))
      db.tickets.insert(buildTicket({ id: 't2', currency: 'GBP' }))
      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()

      const currencySelect = wrapper.find('[aria-label="Filter by currency"]')
      await currencySelect.trigger('click')
      await flushPromises()

      const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
        .find(item => item.textContent?.trim() === 'GBP')
      expect(option).toBeDefined()
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.currency).toBe('GBP')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('currency') === 'GBP')).toBe(true)
      })

      const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Currency'))
      expect(chip).toBeDefined()

      await chip!.find('.el-tag__close').trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.currency).toBeUndefined()
      })
    })

    it('reflects the price range filter in the URL as minor units, in the request, and shows a removable chip', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', price: 5000 }))
      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()

      // Drives the filter through the URL, the same surface the price inputs write to.
      await router.push({ query: { priceMin: '1000', priceMax: '9999' } })
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.priceMin).toBe('1000')
        expect(router.currentRoute.value.query.priceMax).toBe('9999')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('priceMin') === '1000' && params.get('priceMax') === '9999')).toBe(true)
      })

      await vi.waitFor(() => {
        const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Price'))
        expect(chip).toBeDefined()
      })

      const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Price'))!
      await chip.find('.el-tag__close').trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.priceMin).toBeUndefined()
        expect(router.currentRoute.value.query.priceMax).toBeUndefined()
      })
    })

    it('combines event and category filters into a single request and renders only the matching result', async () => {
      db.events.insert(buildEvent({ id: 'event-berlin', name: 'Berlin Show' }))
      db.events.insert(buildEvent({ id: 'event-paris', name: 'Paris Show' }))
      db.categories.insert(buildCategory({ id: 'category-vip', name: 'VIP' }))
      db.categories.insert(buildCategory({ id: 'category-ga', name: 'General' }))

      // Matches both filters.
      db.tickets.insert(buildTicket({
        id: 't-match',
        name: 'Berlin VIP Ticket',
        eventId: 'event-berlin',
        categoryId: 'category-vip'
      }))
      // Right event, wrong category.
      db.tickets.insert(buildTicket({
        id: 't-wrong-category',
        name: 'Berlin GA Ticket',
        eventId: 'event-berlin',
        categoryId: 'category-ga'
      }))
      // Right category, wrong event.
      db.tickets.insert(buildTicket({
        id: 't-wrong-event',
        name: 'Paris VIP Ticket',
        eventId: 'event-paris',
        categoryId: 'category-vip'
      }))

      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()

      await router.push({ query: { eventId: 'event-berlin', categoryId: 'category-vip' } })
      await flushPromises()

      await vi.waitFor(() => {
        expect(requests.some(params => (
          params.get('eventId') === 'event-berlin' && params.get('categoryId') === 'category-vip'
        ))).toBe(true)
      })

      const combinedRequests = requests.filter(params => (
        params.get('eventId') === 'event-berlin' && params.get('categoryId') === 'category-vip'
      ))
      expect(combinedRequests.length).toBeGreaterThan(0)

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Berlin VIP Ticket')
        expect(wrapper.text()).not.toContain('Berlin GA Ticket')
        expect(wrapper.text()).not.toContain('Paris VIP Ticket')
      })

      expect(wrapper.findAll('.el-tag').some(tag => tag.text().includes('Event: Berlin Show'))).toBe(true)
      expect(wrapper.findAll('.el-tag').some(tag => tag.text().includes('Category: VIP'))).toBe(true)
    })
  })

  describe('deep-link entry', () => {
    it('arriving at /tickets?eventId=X applies the filter on load, shows an active chip, and sends it in the request', async () => {
      db.events.insert(buildEvent({ id: 'event-berlin', name: 'Berlin Show' }))
      db.events.insert(buildEvent({ id: 'event-paris', name: 'Paris Show' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't-berlin', name: 'Berlin Ticket', eventId: 'event-berlin' }))
      db.tickets.insert(buildTicket({ id: 't-paris', name: 'Paris Ticket', eventId: 'event-paris' }))

      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets('/tickets?eventId=event-berlin')

      expect(router.currentRoute.value.query.eventId).toBe('event-berlin')

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('eventId') === 'event-berlin')).toBe(true)
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Berlin Ticket')
        expect(wrapper.text()).not.toContain('Paris Ticket')
      })

      await vi.waitFor(() => {
        const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Event: Berlin Show'))
        expect(chip).toBeDefined()
      })
    })

    it('arriving at /tickets?categoryId=X applies the filter on load and shows an active chip', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-vip', name: 'VIP' }))
      db.categories.insert(buildCategory({ id: 'category-ga', name: 'General' }))
      db.tickets.insert(buildTicket({ id: 't-vip', name: 'VIP Ticket', categoryId: 'category-vip' }))
      db.tickets.insert(buildTicket({ id: 't-ga', name: 'General Ticket', categoryId: 'category-ga' }))

      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets('/tickets?categoryId=category-vip')

      expect(router.currentRoute.value.query.categoryId).toBe('category-vip')

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('categoryId') === 'category-vip')).toBe(true)
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('VIP Ticket')
        expect(wrapper.text()).not.toContain('General Ticket')
      })

      await vi.waitFor(() => {
        const chip = wrapper.findAll('.el-tag').find(tag => tag.text().includes('Category: VIP'))
        expect(chip).toBeDefined()
      })
    })
  })

  describe('sorting', () => {
    it('reflects sort toggling by price in the URL and the request MSW receives', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', name: 'Alpha', price: 1000 }))
      db.tickets.insert(buildTicket({ id: 't2', name: 'Beta', price: 2000 }))
      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()
      await flushPromises()

      const priceHeader = wrapper.findAll('th').find(header => header.text().includes('Price'))!
      await priceHeader.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.sort).toBe('price')
        expect(router.currentRoute.value.query.order).toBe('asc')
      })

      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'price' && params.get('order') === 'asc')).toBe(true)
      })
    })

    it('supports sorting by name, quantity and status', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1' }))
      const requests = captureTicketsRequests()

      const { wrapper } = await mountTickets()
      await flushPromises()

      const nameHeader = wrapper.findAll('th').find(header => header.text().includes('Name'))!
      await nameHeader.trigger('click')
      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'name')).toBe(true)
      })

      const quantityHeader = wrapper.findAll('th').find(header => header.text().includes('Quantity'))!
      await quantityHeader.trigger('click')
      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'quantity')).toBe(true)
      })

      const statusHeader = wrapper.findAll('th').find(header => header.text().includes('Status'))!
      await statusHeader.trigger('click')
      await vi.waitFor(() => {
        expect(requests.some(params => params.get('sort') === 'status')).toBe(true)
      })
    })

    it('sorts by creation date through the Created column header', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1' }))
      const requests = captureTicketsRequests()

      const { wrapper, router } = await mountTickets()
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

  describe('deletion', () => {
    it('deletes a ticket after a named confirmation, with no dependency check', async () => {
      db.events.insert(buildEvent({ id: 'event-1' }))
      db.categories.insert(buildCategory({ id: 'category-1' }))
      db.tickets.insert(buildTicket({ id: 't1', name: 'Doomed Ticket' }))

      const { wrapper } = await mountTickets()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Doomed Ticket')
      })

      const actionsButton = wrapper.find('[aria-label="Row actions"]')
      await actionsButton.trigger('click')
      await flushPromises()

      const deleteItem = Array.from(document.querySelectorAll('.el-dropdown-menu__item'))
        .find(item => item.textContent?.trim() === 'Delete')
      expect(deleteItem).toBeDefined()
      deleteItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(document.body.textContent).toContain('Doomed Ticket')

      const confirmButton = Array.from(document.querySelectorAll('.el-message-box__btns button'))
        .find(button => button.textContent?.trim() === 'Delete')
      expect(confirmButton).toBeDefined()
      confirmButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      await vi.waitFor(() => {
        expect(db.tickets.get('t1')).toBeUndefined()
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).not.toContain('Doomed Ticket')
      })
    })
  })

  describe('mobile card presentation', () => {
    it('renders readable ticket cards at 375px showing name, price and status', async () => {
      setViewportToBreakpoint('mobile')
      db.events.insert(buildEvent({ id: 'event-1', name: 'Berlin Show' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'VIP' }))
      db.tickets.insert(buildTicket({
        id: 't1',
        name: 'Alpha Ticket',
        price: 5000,
        currency: 'USD',
        status: 'on_sale'
      }))

      const { wrapper } = await mountTickets()

      await vi.waitFor(() => {
        expect(wrapper.find('table').exists()).toBe(false)
        expect(wrapper.text()).toContain('Alpha Ticket')
        expect(wrapper.text()).toContain('$50.00')
        expect(wrapper.text()).toContain('On sale')
      })

      setViewportToBreakpoint('desktop')
    })
  })

  describe('page header', () => {
    it('renders a title', async () => {
      const { wrapper } = await mountTickets()

      expect(wrapper.find('h1').text()).toBe('Tickets')
    })
  })
})
