import { flushPromises } from '@vue/test-utils'

import TicketForm from './TicketForm.vue'

import { mountWithRouterAndPinia, resetDatabase } from '../../../../tests/support'
import { db } from '@/mocks/db/singleton'
import type { ICategory, IEvent } from '@/mocks/db'

/**
 * `TicketForm` unit tests (GitHub issue #35, PRD-006's testing boundary:
 * "Unit tests: required fields, price and quantity bounds, integer-only
 * quantity, required currency"). Mounted in create mode behind a real router
 * (the component calls `useRoute`/`useUnsavedChangesGuard`, which needs a
 * matched route to register `onBeforeRouteLeave`) and against the real MSW
 * handlers (`RemoteSelect`'s `fetchOptions`/`resolveOption` hit
 * `eventsService`/`categoriesService`, which are thin `apiClient` wrappers —
 * no mocked service, no stubs, real Element Plus components throughout, per
 * `ELEMENT-PLUS.md`'s testing boundary). Integration-level create/edit flows
 * (validation-then-success, editing including changing the event) are left
 * to test-eng's integration suite, per this task's split.
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

async function mountCreateForm () {
  const { wrapper, router } = await mountWithRouterAndPinia(TicketForm, {
    initialRoute: '/tickets/new',
    attachTo: document.body
  })

  // The route is `meta: { requiresAuth: true }` — without a signed-in
  // session the route guard redirects to `login` before the form ever
  // mounts against `/tickets/new`, which only matters for the tests that
  // assert the post-submit navigation back to the list.
  const authStore = useAuthStore()
  authStore.token = 'mock-token-under-test'
  authStore.user = { id: 'u1', name: 'Ada Admin', email: 'admin@platinium.test', role: 'admin' }

  await router.push('/tickets/new')
  await flushPromises()

  return { wrapper, router }
}

async function submit (wrapper: Awaited<ReturnType<typeof mountCreateForm>>['wrapper']): Promise<void> {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

/** Opens a `RemoteSelect`'s dropdown by clicking the `el-form-item` labelled `label`'s own `.el-select__wrapper`, then clicks the option whose text is `optionText` from the teleported dropdown in `document.body`. */
async function pickRemoteOption (
  wrapper: Awaited<ReturnType<typeof mountCreateForm>>['wrapper'],
  label: string,
  optionText: string
): Promise<void> {
  const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes(label))
  if (!formItem) {
    throw new Error(`No el-form-item found for label "${label}"`)
  }

  await formItem.find('.el-select__wrapper').trigger('click')
  await flushPromises()

  const option = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
    .find(item => item.textContent?.trim() === optionText)
  if (!option) {
    throw new Error(`No dropdown option found with text "${optionText}"`)
  }

  option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

async function pickCurrency (
  wrapper: Awaited<ReturnType<typeof mountCreateForm>>['wrapper'],
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

let mountedWrappers: Awaited<ReturnType<typeof mountCreateForm>>['wrapper'][] = []

beforeEach(() => {
  resetDatabase({ events: [], categories: [], tickets: [], users: [] })
})

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }
  mountedWrappers = []
  document.body.innerHTML = ''
})

describe('TicketForm', () => {
  describe('required-field validation', () => {
    it('shows a required message for name, currency, event and category on submit', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await submit(wrapper)

      // name, currency, status, eventId, categoryId are all required.
      // `status` always carries a default (`draft`), so only four of the
      // five required rules can actually fire empty on a pristine form.
      await vi.waitFor(() => {
        expect(wrapper.findAll('.el-form-item__error').length).toBeGreaterThanOrEqual(4)
      })
      expect(wrapper.text()).toContain('Required field')

      const formItemLabels = ['Name', 'Currency', 'Event', 'Category']
      for (const label of formItemLabels) {
        const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes(label))!
        expect(formItem.find('.el-form-item__error').exists()).toBe(true)
      }
    })
  })

  describe('quantity bounds', () => {
    it('rejects a negative quantity typed directly into the input', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      const quantityFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Quantity'))!
      const quantityInput = quantityFormItem.find('.el-input-number input')
      await quantityInput.setValue('-5')
      await quantityInput.trigger('change')
      await flushPromises()

      // `el-input-number`'s own `:min="0"` clamps an out-of-range typed
      // value back to the boundary rather than accepting it — asserting the
      // model itself never goes negative is the behaviour PRD-006 asks for
      // ("quantity restricted to whole non-negative numbers").
      const vm = wrapper.findComponent(TicketForm).vm as unknown as { form: { quantity: number } }
      expect(vm.form.quantity).toBeGreaterThanOrEqual(0)
    })

    it('rejects a non-integer quantity typed directly into the input', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      const quantityFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Quantity'))!
      const quantityInput = quantityFormItem.find('.el-input-number input')
      await quantityInput.setValue('2.5')
      await quantityInput.trigger('change')
      await flushPromises()

      // `:precision="0" step-strictly` rounds/clamps a fractional entry to
      // a whole number rather than accepting the decimal.
      const vm = wrapper.findComponent(TicketForm).vm as unknown as { form: { quantity: number } }
      expect(Number.isInteger(vm.form.quantity)).toBe(true)
    })

    it('accepts zero and saves successfully', async () => {
      db.events.insert(buildEvent({ id: 'event-1', name: 'Rooftop Jazz Night' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'General Admission' }))

      const { wrapper, router } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await wrapper.find('input[placeholder="General Admission"]').setValue('Zero Stock Ticket')
      await pickCurrency(wrapper, 'USD')

      const quantityFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Quantity'))!
      const quantityInput = quantityFormItem.find('.el-input-number input')
      await quantityInput.setValue('0')
      await quantityInput.trigger('change')

      await pickRemoteOption(wrapper, 'Event', 'Rooftop Jazz Night')
      await pickRemoteOption(wrapper, 'Category', 'General Admission')

      await submit(wrapper)

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe('tickets')
      })

      const saved = Object.values(db.tickets.list({}).data).find(ticket => ticket.name === 'Zero Stock Ticket')
      expect(saved).toBeDefined()
      expect(saved!.quantity).toBe(0)
    })
  })

  describe('price round-trip through CurrencyInput', () => {
    it('produces the correct integer minor-unit value in the submitted payload', async () => {
      db.events.insert(buildEvent({ id: 'event-1', name: 'Rooftop Jazz Night' }))
      db.categories.insert(buildCategory({ id: 'category-1', name: 'General Admission' }))

      const { wrapper, router } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await wrapper.find('input[placeholder="General Admission"]').setValue('Priced Ticket')
      await pickCurrency(wrapper, 'USD')
      await flushPromises()

      // Once a currency is chosen, `CurrencyInput` mounts its own
      // `el-input-number` for the decimal amount, scoped by the "Price"
      // `el-form-item` rather than input order on the page (quantity is
      // also an `el-input-number`).
      const priceFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Price'))!
      const priceInput = priceFormItem.find('.el-input-number input')
      await priceInput.setValue('49.99')
      await priceInput.trigger('change')

      await pickRemoteOption(wrapper, 'Event', 'Rooftop Jazz Night')
      await pickRemoteOption(wrapper, 'Category', 'General Admission')

      await submit(wrapper)

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe('tickets')
      })

      const saved = Object.values(db.tickets.list({}).data).find(ticket => ticket.name === 'Priced Ticket')
      expect(saved).toBeDefined()
      expect(saved!.price).toBe(4999)
    })

    it('does not mount CurrencyInput until a currency is chosen', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      const priceFormItem = wrapper.findAll('.el-form-item').find(item => item.text().includes('Price'))!
      expect(priceFormItem.find('.el-input-number').exists()).toBe(false)
      expect(priceFormItem.find('input[disabled]').exists()).toBe(true)

      await pickCurrency(wrapper, 'EUR')

      expect(priceFormItem.find('.el-input-number').exists()).toBe(true)
    })
  })

  describe('status independence from quantity', () => {
    it('does not change status when quantity is set to zero', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      const soldOutRadio = wrapper.findAll('.el-radio').find(radio => radio.text() === 'Sold out')!
      await soldOutRadio.find('input').setValue(true)
      await flushPromises()

      const quantityInput = wrapper.find('.el-input-number input')
      await quantityInput.setValue('0')
      await quantityInput.trigger('change')
      await flushPromises()

      const vm = wrapper.findComponent(TicketForm).vm as unknown as { form: { status: string; quantity: number } }
      expect(vm.form.quantity).toBe(0)
      expect(vm.form.status).toBe('sold_out')
    })

    it('leaves quantity untouched when status changes', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      const quantityInput = wrapper.find('.el-input-number input')
      await quantityInput.setValue('42')
      await quantityInput.trigger('change')
      await flushPromises()

      const draftRadio = wrapper.findAll('.el-radio').find(radio => radio.text() === 'Archived')!
      await draftRadio.find('input').setValue(true)
      await flushPromises()

      const vm = wrapper.findComponent(TicketForm).vm as unknown as { form: { status: string; quantity: number } }
      expect(vm.form.status).toBe('archived')
      expect(vm.form.quantity).toBe(42)
    })
  })
})
