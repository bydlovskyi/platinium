import { flushPromises } from '@vue/test-utils'

import TicketForm from '@/views/tickets/components/TicketForm.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
import { db } from '@/mocks/db/singleton'
import type { ICategory, IEvent } from '@/mocks/db'

/**
 * Tickets create/edit form, integration tested end to end (GitHub issue #35,
 * PRD-006's testing boundary: "Full CRUD flow — integration tested against
 * MSW: create with a validation failure then a success (errors asserted on
 * the `el-form-item`); edit including changing the event through the
 * `el-select` dropdown"). Mounted behind a real memory-history router (the
 * app's actual route table, including this slice's own `ticketCreate` /
 * `ticketEdit` routes) and a real Pinia instance, against the shared MSW node
 * server answering `POST /tickets`, `GET /tickets/{id}` and
 * `PATCH /tickets/{id}` for real — no mocked `ticketsService`/`eventsService`/
 * `categoriesService`. A session is seeded via `seedSession('admin')` +
 * `authStore.restore()`, mirroring `tests/integration/events-form.spec.ts`.
 *
 * Delete is deliberately not covered here — already covered by the existing
 * tickets-list integration coverage from issue #34 — nor is the deep-link
 * filter entry, also already covered there. Unit-level concerns (required
 * fields, quantity bounds, price/CurrencyInput round-trip, status
 * independence from quantity) live in
 * `src/views/tickets/components/TicketForm.spec.ts` and are not duplicated
 * here — this file only covers the integration-level CRUD boundary.
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

/** Opens a `RemoteSelect`'s dropdown by clicking the `el-form-item` labelled `label`'s own `.el-select__wrapper`, then clicks the option whose text is `optionText` from the teleported dropdown in `document.body`. Mirrors `TicketForm.spec.ts`'s own `pickRemoteOption` helper. */
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

/**
 * Fills every required field with deterministic values (name, currency,
 * event, category) and sets a price — enough for the form to validate and
 * submit successfully. `eventName`/`categoryName` must already be seeded in
 * the database (via `db.events.insert`/`db.categories.insert`) so the
 * `RemoteSelect` dropdowns have something to pick from.
 */
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
    // Only `events`/`categories`/`tickets` are cleared to an empty,
    // deterministic slate — `users` keeps the default seeded administrator
    // `seedSession('admin')` looks up, mirroring `events-form.spec.ts`'s own
    // `beforeEach`.
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

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Required field')
      })

      const requiredLabels = ['Name', 'Currency', 'Event', 'Category']
      for (const label of requiredLabels) {
        const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes(label))!
        expect(formItem.find('.el-form-item__error').exists()).toBe(true)
      }

      // No ticket was created by the failed attempt.
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
      // 49.99 USD at 2-decimal precision converts to 4999 minor units —
      // the sole conversion boundary is `CurrencyInput`, per PRD-006.
      expect(created.price).toBe(4999)
      expect(created.quantity).toBe(0)
      expect(created.status).toBe('draft')
      expect(created.eventId).toBe('event-1')
      expect(created.categoryId).toBe('category-1')
    })

    it('rejects a create referencing an event deleted after being picked, attaching the error to the event field', async () => {
      // PRD-006 "Referential validation": the mock's `eventReferenceError`
      // (src/mocks/handlers/tickets.ts) rejects a create whose `eventId`
      // does not resolve to an existing event, independent of whatever
      // `RemoteSelect` displayed at pick time. Triggered realistically here
      // by picking a real, currently-existing event through the actual
      // `RemoteSelect` dropdown, then deleting that event directly from the
      // database (simulating another administrator/tab deleting it) so the
      // reference is dangling by the time this form submits — `RemoteSelect`
      // itself has no way to select a nonexistent option, so this is the
      // only realistic path to a 400 on this field through the real UI.
      db.events.insert(buildEvent({ id: 'event-1', name: 'Rooftop Jazz Night' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'General Admission' }))

      const { wrapper, router } = await mountSignedIn(TicketForm, '/tickets/new')

      await fillRequiredFields(wrapper, {
        name: 'Dangling Reference Ticket',
        eventName: 'Rooftop Jazz Night',
        categoryName: 'General Admission'
      })

      // The event is removed from the database after being picked — the
      // form still holds `eventId: 'event-1'` in its local state, but the
      // server-side reference no longer resolves.
      db.events.remove('event-1')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        const eventFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Event'))!
        expect(eventFormItem.find('.el-form-item__error').exists()).toBe(true)
      })

      const eventFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Event'))!
      expect(eventFormItem.text()).toContain('References an event that does not exist.')

      // No ticket was created, and the administrator was not navigated away.
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

      // The event/category `RemoteSelect`s resolve to the referenced
      // records' real names, not raw ids or an empty field (PRD-006
      // "Editing pre-fills all values including the resolved event and
      // category, even when they are not on the first page").
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
      // Untouched fields survive the update unchanged.
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
