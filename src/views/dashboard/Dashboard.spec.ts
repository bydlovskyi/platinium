import { http, HttpResponse } from 'msw'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import Dashboard from './Dashboard.vue'
import { NEARLY_SOLD_OUT_MAX_QUANTITY } from '@/mocks/handlers/dashboard'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../../../tests/support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import type { ICategory, IEvent, ITicket } from '@/mocks/db'

const NOW_ISO = '2026-01-01T00:00:00.000Z'

function buildEvent (overrides: Partial<IEvent> = {}): IEvent {
  return {
    id: overrides.id ?? `event-${Math.random().toString(36).slice(2)}`,
    name: 'Rooftop Jazz Night',
    country: 'US',
    venue: 'Skyline Terrace',
    startDate: '2027-05-01',
    endDate: '2027-05-02',
    status: 'draft',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildCategory (overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: overrides.id ?? `category-${Math.random().toString(36).slice(2)}`,
    name: 'General Admission',
    description: 'Standard entry with access to general seating areas.',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

function buildTicket (overrides: Partial<ITicket> = {}): ITicket {
  return {
    id: overrides.id ?? `ticket-${Math.random().toString(36).slice(2)}`,
    name: 'General Admission Ticket',
    price: 1000,
    currency: 'USD',
    quantity: 10,
    status: 'draft',
    eventId: overrides.eventId ?? 'dash-event',
    categoryId: overrides.categoryId ?? 'dash-category',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides
  }
}

// Hand-built rather than the seed so totals are checkable by inspection; stable ids keep the nearly-sold-out tie-break deterministic.
function seedControlledDashboardDataset (): void {
  db.categories.insert(buildCategory({ id: 'dash-category' }))

  db.events.insert(buildEvent({ id: 'dash-evt-draft', name: 'Draft Gala', status: 'draft', startDate: '2027-01-01', endDate: '2027-01-02' }))
  db.events.insert(buildEvent({ id: 'dash-evt-published-1', name: 'Summer Fest', status: 'published', startDate: '2099-07-01', endDate: '2099-07-02' }))
  db.events.insert(buildEvent({ id: 'dash-evt-published-2', name: 'Autumn Ball', status: 'published', startDate: '2099-08-01', endDate: '2099-08-02' }))
  db.events.insert(buildEvent({ id: 'dash-evt-cancelled', name: 'Cancelled Run', status: 'cancelled', startDate: '2020-01-01', endDate: '2020-01-02' }))

  // USD: 1000*3 + 2000*5 + 100*NEARLY_SOLD_OUT_MAX_QUANTITY = 15000. EUR: 500*40 = 20000.
  db.tickets.insert(buildTicket({ id: 'dash-tix-usd-1', currency: 'USD', price: 1000, quantity: 3, status: 'draft' }))
  db.tickets.insert(buildTicket({ id: 'dash-tix-usd-2', currency: 'USD', price: 2000, quantity: 5, status: 'on_sale' }))
  db.tickets.insert(buildTicket({ id: 'dash-tix-eur-1', currency: 'EUR', price: 500, quantity: 40, status: 'sold_out' }))
  db.tickets.insert(buildTicket({ id: 'dash-tix-low-stock', currency: 'USD', price: 100, quantity: NEARLY_SOLD_OUT_MAX_QUANTITY, status: 'on_sale' }))
}

let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountDashboard () {
  await seedSession('admin')

  const result = await mountWithRouterAndPinia(Dashboard, { initialRoute: '/', attachTo: document.body })
  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  await authStore.restore()

  await result.router.push('/')
  await flushPromises()

  return result
}

describe('Dashboard screen', () => {
  beforeEach(() => {
    const seededUsers = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data
    resetDatabase({ events: [], categories: [], tickets: [], users: seededUsers })
  })

  afterEach(() => {
    for (const wrapper of mountedWrappers) {
      wrapper.unmount()
    }
    mountedWrappers = []
    document.body.innerHTML = ''
    localStorage.clear()
  })

  describe('headline figures', () => {
    it('renders every el-statistic figure from the real MSW-served aggregate response', async () => {
      seedControlledDashboardDataset()

      const { wrapper } = await mountDashboard()

      await vi.waitFor(() => {
        const statistics = wrapper.findAllComponents({ name: 'ElStatistic' })
        expect(statistics.length).toBeGreaterThan(0)
      })

      const statisticByTitle = (title: string) => wrapper.findAllComponents({ name: 'ElStatistic' }).find(stat => stat.props('title') === title)

      // totalAvailableQuantity: 3 + 5 + 40 + NEARLY_SOLD_OUT_MAX_QUANTITY.
      await vi.waitFor(() => {
        expect(statisticByTitle('Total events')?.props('value')).toBe(4)
        expect(statisticByTitle('Currently running')?.props('value')).toBe(2)
        expect(statisticByTitle('Draft events')?.props('value')).toBe(1)
        expect(statisticByTitle('Total tickets')?.props('value')).toBe(4)
        expect(statisticByTitle('Total available quantity')?.props('value')).toBe(3 + 5 + 40 + NEARLY_SOLD_OUT_MAX_QUANTITY)
      })
    })
  })

  describe('gross inventory value per currency', () => {
    it('renders one entry per currency present and never a cross-currency total', async () => {
      seedControlledDashboardDataset()

      const { wrapper } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Gross inventory value')
      })

      await vi.waitFor(() => {
        const items = wrapper.findAll('.el-descriptions__label')
        const labels = items.map(item => item.text())
        expect(labels).toContain('USD')
        expect(labels).toContain('EUR')
      })

      const items = wrapper.findAll('.el-descriptions__label')
      expect(items).toHaveLength(2)

      const descriptionsText = wrapper.find('.el-descriptions').text()
      expect(descriptionsText).toContain('$150.00') // USD 15000 minor units
      expect(descriptionsText).toContain('€200.00') // EUR 20000 minor units

      expect(wrapper.text()).not.toMatch(/total\s*(value|inventory value)\b(?!.*(USD|EUR))/i)
      expect(wrapper.findAll('.el-descriptions__label').map(item => item.text())).not.toContain('Total')
    })

    it('renders the empty-inventory fallback when no tickets exist', async () => {
      db.categories.insert(buildCategory({ id: 'dash-category' }))
      db.events.insert(buildEvent({ id: 'dash-evt-draft', status: 'draft' }))

      const { wrapper } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('No inventory')
      })

      expect(wrapper.findAll('.el-descriptions__label')).toHaveLength(1)
    })
  })

  describe('status breakdowns', () => {
    it('renders a single stacked distribution bar with the legend count matching the response data', async () => {
      seedControlledDashboardDataset()

      const { wrapper } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Events by status')
        expect(wrapper.findComponent({ name: 'StatusDistributionBar' }).exists()).toBe(true)
      })

      const eventsHeading = wrapper.findAll('h2').find(heading => heading.text() === 'Events by status')!
      const eventsSection = eventsHeading.element.closest('section')!
      expect(eventsSection.textContent).toContain('Draft')
      expect(eventsSection.textContent).toContain('Published')
      expect(eventsSection.textContent).toContain('Cancelled')

      const eventsLegendCounts = Array.from(eventsSection.querySelectorAll('li')).map(item => item.querySelector('span.tabular-nums')?.textContent)
      expect(eventsLegendCounts).toEqual(['1', '2', '1', '0']) // draft, published, cancelled, completed

      const ticketsHeading = wrapper.findAll('h2').find(heading => heading.text() === 'Tickets by status')!
      const ticketsSection = ticketsHeading.element.closest('section')!
      const ticketsLegendCounts = Array.from(ticketsSection.querySelectorAll('li')).map(item => item.querySelector('span.tabular-nums')?.textContent)
      // draft: dash-tix-usd-1 (1), on_sale: dash-tix-usd-2 + dash-tix-low-stock (2), sold_out: dash-tix-eur-1 (1), archived: 0.
      expect(ticketsLegendCounts).toEqual(['1', '2', '1', '0'])
    })

    it('renders each headline figure at the screen-heading type step with tabular figures', async () => {
      seedControlledDashboardDataset()

      const { wrapper } = await mountDashboard()

      await vi.waitFor(() => {
        const totalEvents = wrapper.findAllComponents({ name: 'ElStatistic' }).find(stat => stat.props('title') === 'Total events')
        expect(totalEvents?.classes()).toContain('headline-statistic')
        expect(totalEvents?.classes()).toContain('tabular-nums')
      })
    })

    it('shows the running/draft share of total events as a secondary figure', async () => {
      seedControlledDashboardDataset()

      const { wrapper } = await mountDashboard()

      // 2 running / 4 total = 50%; 1 draft / 4 total = 25% (seeded dataset above).
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('(50%)')
        expect(wrapper.text()).toContain('(25%)')
      })
    })
  })

  describe('navigation from headline figures and breakdowns', () => {
    it('clicking "Total events" resolves to the unfiltered events list', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Total events')
      })

      const link = wrapper.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Total events'))!
      await link.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.events)
        expect(router.currentRoute.value.query.status).toBeUndefined()
      })
    })

    it('clicking "Currently running" resolves to the events list filtered to published', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Currently running')
      })

      const link = wrapper.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Currently running'))!
      await link.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.events)
        expect(router.currentRoute.value.query.status).toBe('published')
      })
    })

    it('clicking "Draft events" resolves to the events list filtered to draft', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Draft events')
      })

      const link = wrapper.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Draft events'))!
      await link.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.events)
        expect(router.currentRoute.value.query.status).toBe('draft')
      })
    })

    it('clicking "Total tickets" resolves to the unfiltered tickets list', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Total tickets')
      })

      const link = wrapper.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Total tickets'))!
      await link.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.tickets)
      })
    })

    it('clicking "Total available quantity" resolves to the tickets list', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Total available quantity')
      })

      const link = wrapper.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Total available quantity'))!
      await link.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.tickets)
      })
    })

    it('clicking an event status-breakdown row resolves to the events list filtered to that status', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Events by status')
      })

      const eventsSection = wrapper.findAll('section').find(section => section.text().includes('Events by status'))!
      const cancelledRow = eventsSection.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Cancelled'))!

      await cancelledRow.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.events)
        expect(router.currentRoute.value.query.status).toBe('cancelled')
      })
    })

    it('clicking a ticket status-breakdown row resolves to the tickets list filtered to that status', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Tickets by status')
      })

      const ticketsSection = wrapper.findAll('section').find(section => section.text().includes('Tickets by status'))!
      const soldOutRow = ticketsSection.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Sold out'))!

      await soldOutRow.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.tickets)
        expect(router.currentRoute.value.query.status).toBe('sold_out')
      })
    })

    it('clicking an upcoming-event row resolves to that event\'s edit route', async () => {
      seedControlledDashboardDataset()

      const { wrapper, router } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Summer Fest')
      })

      const eventLink = wrapper.findAllComponents({ name: 'RouterLink' })
        .find((routerLink: VueWrapper) => routerLink.text().includes('Summer Fest'))!

      await eventLink.trigger('click')

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.eventEdit)
        expect(router.currentRoute.value.params.id).toBe('dash-evt-published-1')
      })
    })
  })

  describe('failed load and retry', () => {
    it('renders the el-result retry UI on a fetch failure, and retry re-fetches and shows real data', async () => {
      server.use(http.get('/dashboard/stats', () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))

      const { wrapper } = await mountDashboard()

      await vi.waitFor(() => {
        expect(wrapper.findComponent({ name: 'ElResult' }).exists()).toBe(true)
        expect(wrapper.text()).toContain("Couldn't load the dashboard")
      })

      server.resetHandlers()
      seedControlledDashboardDataset()

      const retryButton = wrapper.findAll('button').find(button => button.text().includes('Retry'))
      expect(retryButton).toBeDefined()

      await retryButton!.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(wrapper.findComponent({ name: 'ElResult' }).exists()).toBe(false)
        expect(wrapper.text()).toContain('Total events')
      })

      await vi.waitFor(() => {
        const statistics = wrapper.findAllComponents({ name: 'ElStatistic' })
        const totalEvents = statistics.find(stat => stat.props('title') === 'Total events')
        expect(totalEvents?.props('value')).toBe(4)
      })
    })

    it('does not require a page reload to recover — the same mounted instance re-fetches', async () => {
      server.use(http.get('/dashboard/stats', () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))

      const { wrapper, router } = await mountDashboard()
      const routeBeforeRetry = router.currentRoute.value.fullPath

      await vi.waitFor(() => {
        expect(wrapper.findComponent({ name: 'ElResult' }).exists()).toBe(true)
      })

      server.resetHandlers()
      seedControlledDashboardDataset()

      const retryButton = wrapper.findAll('button').find(button => button.text().includes('Retry'))!
      await retryButton.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Total events')
      })

      expect(router.currentRoute.value.fullPath).toBe(routeBeforeRetry)
    })
  })
})
