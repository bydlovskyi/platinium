import { flushPromises } from '@vue/test-utils'

import TicketForm from '@/views/tickets/components/TicketForm.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
import { db } from '@/mocks/db/singleton'
import type { ICategory, IEvent } from '@/mocks/db'

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

let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountSignedIn<T extends Component> (component: T, initialRoute: string) {
  await seedSession('admin')

  const result = await mountWithRouterAndPinia(component, { initialRoute, attachTo: document.body })
  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  await authStore.restore()

  await result.router.push(initialRoute)
  await flushPromises()

  return result
}

async function pickRemoteOption (
  wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'],
  label: string,
  optionText: string
): Promise<void> {
  const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes(label))
  if (!formItem) {
    throw new Error(`No el-form-item found for label "${label}"`)
  }

  await formItem.find('.el-select__wrapper').trigger('click')
  await flushPromises()

  await vi.waitFor(() => {
    const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
      .find(item => item.textContent?.trim() === optionText)
    expect(option).toBeDefined()
  })

  const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
    .find(item => item.textContent?.trim() === optionText)!
  option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

async function pickCurrency (
  wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'],
  currency: 'USD' | 'EUR' | 'GBP'
): Promise<void> {
  const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Currency'))!
  await formItem.find('.el-select__wrapper').trigger('click')
  await flushPromises()

  const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
    .find(item => item.textContent?.trim() === currency)!
  option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

async function setPrice (
  wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'],
  decimalAmount: string
): Promise<void> {
  const priceFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Price'))!
  const priceInput = priceFormItem.find('.el-input-number input')
  await priceInput.setValue(decimalAmount)
  await priceInput.trigger('change')
  await flushPromises()
}

// `eventName`/`categoryName` must already be seeded so the RemoteSelects have options.
async function fillRequiredFields (
  wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'],
  { name, eventName, categoryName }: { name: string; eventName: string; categoryName: string }
): Promise<void> {
  await wrapper.find('input[placeholder="General Admission"]').setValue(name)
  await pickCurrency(wrapper, 'USD')
  await setPrice(wrapper, '49.99')
  await pickRemoteOption(wrapper, 'Event', eventName)
  await pickRemoteOption(wrapper, 'Category', categoryName)
}

describe('Tickets form', () => {
  beforeEach(() => {
    // `users` is kept so `seedSession('admin')` can find the seeded admin.
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

  describe('create', () => {
    it('shows required-field errors on an empty submit, creates nothing, then succeeds once filled in', async () => {
      db.events.insert(buildEvent({ id: 'event-1', name: 'Rooftop Jazz Night' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'General Admission' }))

      const { wrapper, router } = await mountSignedIn(TicketForm, '/tickets/new')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      // Field errors can render one at a time; waiting only for the first races under CPU load, so wait for all.
      const requiredLabels = ['Name', 'Currency', 'Event', 'Category']

      await vi.waitFor(() => {
        for (const label of requiredLabels) {
          const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes(label))!
          expect(formItem.find('.el-form-item__error').exists()).toBe(true)
        }
      })

      expect(db.tickets.list({ perPage: 100 }).meta.total).toBe(0)

      await fillRequiredFields(wrapper, {
        name: 'Autumn VIP Pass',
        eventName: 'Rooftop Jazz Night',
        categoryName: 'General Admission'
      })

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.tickets)
      })

      expect(db.tickets.list({ perPage: 100 }).meta.total).toBe(1)

      const created = db.tickets.list({ perPage: 100 }).data[0]!
      expect(created.name).toBe('Autumn VIP Pass')
      expect(created.currency).toBe('USD')
      // 49.99 USD at 2-decimal precision is 4999 minor units.
      expect(created.price).toBe(4999)
      expect(created.quantity).toBe(0)
      expect(created.status).toBe('draft')
      expect(created.eventId).toBe('event-1')
      expect(created.categoryId).toBe('category-1')
    })

    it('rejects a create referencing an event deleted after being picked, attaching the error to the event field', async () => {
      // RemoteSelect can't pick a nonexistent option, so the picked event is deleted before submit
      // to produce a dangling reference (400).
      db.events.insert(buildEvent({ id: 'event-1', name: 'Rooftop Jazz Night' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'General Admission' }))

      const { wrapper, router } = await mountSignedIn(TicketForm, '/tickets/new')

      await fillRequiredFields(wrapper, {
        name: 'Dangling Reference Ticket',
        eventName: 'Rooftop Jazz Night',
        categoryName: 'General Admission'
      })

      db.events.remove('event-1')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        const eventFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Event'))!
        expect(eventFormItem.find('.el-form-item__error').exists()).toBe(true)
      })

      const eventFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Event'))!
      expect(eventFormItem.text()).toContain('References an event that does not exist.')

      expect(db.tickets.list({ perPage: 100 }).meta.total).toBe(0)
      expect(router.currentRoute.value.name).toBe(routeNames.ticketCreate)
    })
  })

  describe('edit', () => {
    it('pre-fills the form (including resolved event/category names), saves a change to the name and event, and the update persists', async () => {
      db.events.insert(buildEvent({ id: 'event-1', name: 'Rooftop Jazz Night' }))
      db.events.insert(buildEvent({ id: 'event-2', name: 'Harbourside Comedy Night' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'General Admission' }))

      db.tickets.insert({
        id: 'ticket-1',
        name: 'Original Ticket Name',
        price: 2500,
        currency: 'USD',
        quantity: 5,
        status: 'draft',
        eventId: 'event-1',
        categoryId: 'category-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      })

      const { wrapper, router } = await mountSignedIn(TicketForm, '/tickets/ticket-1/edit')

      await vi.waitFor(() => {
        expect(wrapper.find('input[placeholder="General Admission"]').element).toHaveProperty('value', 'Original Ticket Name')
      })

      const eventFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Event'))!
      const categoryFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Category'))!
      await vi.waitFor(() => {
        expect(eventFormItem.text()).toContain('Rooftop Jazz Night')
        expect(categoryFormItem.text()).toContain('General Admission')
      })

      const nameInput = wrapper.find('input[placeholder="General Admission"]')
      await nameInput.setValue('Updated Ticket Name')

      await pickRemoteOption(wrapper, 'Event', 'Harbourside Comedy Night')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.tickets)
      })

      const updated = await ticketsService.get('ticket-1')
      expect(updated.name).toBe('Updated Ticket Name')
      expect(updated.eventId).toBe('event-2')
      expect(updated.categoryId).toBe('category-1')
      expect(updated.price).toBe(2500)
    })

    it('shows a not-found result for an unknown ticket id instead of an empty form', async () => {
      const { wrapper } = await mountSignedIn(TicketForm, '/tickets/does-not-exist/edit')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Ticket not found')
      })

      expect(wrapper.find('form').exists()).toBe(false)
    })
  })
})
