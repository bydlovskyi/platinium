import { flushPromises } from '@vue/test-utils'

import App from '@/App.vue'
import Events from '@/views/events/Events.vue'
import Categories from '@/views/categories/Categories.vue'
import Tickets from '@/views/tickets/Tickets.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
import { ForbiddenError } from '@/features/platform/api/interceptors/response.interceptor'
import { db } from '@/mocks/db/singleton'
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
    description: 'Standard entry with access to general seating areas.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    eventId: overrides.eventId ?? 'permissions-spec-event',
    categoryId: overrides.categoryId ?? 'permissions-spec-category',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountSignedIn<T extends Component> (
  role: 'admin' | 'viewer',
  component: T,
  initialRoute: string
) {
  await seedSession(role)

  const result = await mountWithRouterAndPinia(component, { initialRoute, attachTo: document.body })
  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  await authStore.restore()

  await result.router.push(initialRoute)
  await flushPromises()

  return result
}

describe('Role-based permissions', () => {
  beforeEach(() => {
    const seededUsers = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data
    resetDatabase({ events: [], categories: [], tickets: [], users: seededUsers })

    db.events.insert(buildEvent({ id: 'permissions-spec-event', name: 'Rooftop Jazz Night' }))
    db.categories.insert(buildCategory({ id: 'permissions-spec-category', name: 'General Admission' }))
    db.tickets.insert(buildTicket({ id: 'permissions-spec-ticket' }))
  })

  afterEach(() => {
    for (const wrapper of mountedWrappers) {
      wrapper.unmount()
    }
    mountedWrappers = []
    document.body.innerHTML = ''
    localStorage.clear()
  })

  describe('write actions on the list screens', () => {
    describe('viewer', () => {
      it('renders the events list with no create button and no row-actions control', async () => {
        const { wrapper } = await mountSignedIn('viewer', Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Rooftop Jazz Night')
        })

        expect(wrapper.findAll('button').some(button => button.text().includes('Create event'))).toBe(false)
        expect(wrapper.find('button[aria-label="Row actions"]').exists()).toBe(false)
      })

      it('renders the categories list with no create button and no row-actions control', async () => {
        const { wrapper } = await mountSignedIn('viewer', Categories, '/categories')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('General Admission')
        })

        expect(wrapper.findAll('button').some(button => button.text().includes('Create category'))).toBe(false)
        expect(wrapper.find('button[aria-label="Row actions"]').exists()).toBe(false)
      })

      it('renders the tickets list with no create button and no row-actions control', async () => {
        const { wrapper } = await mountSignedIn('viewer', Tickets, '/tickets')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('General Admission Ticket')
        })

        expect(wrapper.findAll('button').some(button => button.text().includes('Create ticket'))).toBe(false)
        expect(wrapper.find('button[aria-label="Row actions"]').exists()).toBe(false)
      })
    })

    describe('admin (control)', () => {
      it('renders the events list with a create button and a row-actions control', async () => {
        const { wrapper } = await mountSignedIn('admin', Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Rooftop Jazz Night')
        })

        expect(wrapper.findAll('button').some(button => button.text().includes('Create event'))).toBe(true)
        expect(wrapper.find('button[aria-label="Row actions"]').exists()).toBe(true)
      })

      it('renders the categories list with a create button and a row-actions control', async () => {
        const { wrapper } = await mountSignedIn('admin', Categories, '/categories')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('General Admission')
        })

        expect(wrapper.findAll('button').some(button => button.text().includes('Create category'))).toBe(true)
        expect(wrapper.find('button[aria-label="Row actions"]').exists()).toBe(true)
      })

      it('renders the tickets list with a create button and a row-actions control', async () => {
        const { wrapper } = await mountSignedIn('admin', Tickets, '/tickets')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('General Admission Ticket')
        })

        expect(wrapper.findAll('button').some(button => button.text().includes('Create ticket'))).toBe(true)
        expect(wrapper.find('button[aria-label="Row actions"]').exists()).toBe(true)
      })
    })
  })

  describe('direct navigation to a write URL', () => {
    describe('viewer', () => {
      it('is turned away from the event create route to the 403 page', async () => {
        const { wrapper, router } = await mountSignedIn('viewer', App, '/events/new')

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.forbidden)
        })

        expect(wrapper.text()).toContain('Access denied')
        expect(wrapper.text()).toContain("don't have permission")
      })

      it('is turned away from the event edit route to the 403 page', async () => {
        const { wrapper, router } = await mountSignedIn('viewer', App, '/events/permissions-spec-event/edit')

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.forbidden)
        })

        expect(wrapper.text()).toContain('Access denied')
      })

      it('is turned away from the ticket create route to the 403 page', async () => {
        const { wrapper, router } = await mountSignedIn('viewer', App, '/tickets/new')

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.forbidden)
        })

        expect(wrapper.text()).toContain('Access denied')
      })

      it('is turned away from the ticket edit route to the 403 page', async () => {
        const { wrapper, router } = await mountSignedIn('viewer', App, '/tickets/permissions-spec-ticket/edit')

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.forbidden)
        })

        expect(wrapper.text()).toContain('Access denied')
      })
    })

    describe('admin (control)', () => {
      it('reaches the event create form instead of the 403 page', async () => {
        const { wrapper, router } = await mountSignedIn('admin', App, '/events/new')

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.eventCreate)
        })

        expect(wrapper.text()).not.toContain('Access denied')
        expect(wrapper.find('form').exists()).toBe(true)
      })

      it('reaches the event edit form instead of the 403 page', async () => {
        const { wrapper, router } = await mountSignedIn('admin', App, '/events/permissions-spec-event/edit')

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.eventEdit)
        })

        expect(wrapper.text()).not.toContain('Access denied')
        expect(wrapper.find('form').exists()).toBe(true)
      })
    })
  })

  describe('a forced write request bypassing the UI', () => {
    describe('viewer', () => {
      it('has eventsService.create rejected with 403', async () => {
        await seedSession('viewer')
        const authStore = useAuthStore()
        await authStore.restore()

        await expect(eventsService.create({
          name: 'Forced Event',
          country: 'US',
          venue: 'Nowhere',
          startDate: '2028-01-01',
          endDate: '2028-01-02',
          status: 'draft'
        })).rejects.toBeInstanceOf(ForbiddenError)

        expect(db.events.list({ perPage: 100 }).data.some(event => event.name === 'Forced Event')).toBe(false)
      })

      it('has categoriesService.create rejected with 403', async () => {
        await seedSession('viewer')
        const authStore = useAuthStore()
        await authStore.restore()

        await expect(categoriesService.create({
          name: 'Forced Category',
          description: 'Should never be created.'
        })).rejects.toBeInstanceOf(ForbiddenError)

        expect(db.categories.list({ perPage: 100 }).data.some(category => category.name === 'Forced Category')).toBe(false)
      })

      it('has ticketsService.create rejected with 403', async () => {
        await seedSession('viewer')
        const authStore = useAuthStore()
        await authStore.restore()

        await expect(ticketsService.create({
          name: 'Forced Ticket',
          price: 500,
          currency: 'USD',
          quantity: 5,
          status: 'draft',
          eventId: 'permissions-spec-event',
          categoryId: 'permissions-spec-category'
        })).rejects.toBeInstanceOf(ForbiddenError)

        expect(db.tickets.list({ perPage: 100 }).data.some(ticket => ticket.name === 'Forced Ticket')).toBe(false)
      })

      it('has eventsService.delete rejected with 403', async () => {
        await seedSession('viewer')
        const authStore = useAuthStore()
        await authStore.restore()

        await expect(eventsService.delete('permissions-spec-event')).rejects.toBeInstanceOf(ForbiddenError)

        expect(db.events.get('permissions-spec-event')).toBeDefined()
      })
    })

    describe('admin (control)', () => {
      it('succeeds creating an event through eventsService', async () => {
        await seedSession('admin')
        const authStore = useAuthStore()
        await authStore.restore()

        const created = await eventsService.create({
          name: 'Real Event',
          country: 'US',
          venue: 'Somewhere',
          startDate: '2028-01-01',
          endDate: '2028-01-02',
          status: 'draft'
        })

        expect(created.name).toBe('Real Event')
        expect(db.events.get(created.id)).toBeDefined()
      })
    })
  })
})
