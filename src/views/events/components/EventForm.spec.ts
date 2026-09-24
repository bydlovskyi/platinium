import { flushPromises } from '@vue/test-utils'

import EventForm from './EventForm.vue'

import { mountWithRouterAndPinia } from '../../../../tests/support'

/**
 * `EventForm` unit tests (GitHub issue #27, PRD-004's testing boundary:
 * "Event form validation — unit tested: required fields, name length
 * bounds, the date ordering constraint in both directions, and clearing the
 * end date when the start date moves past it"). Mounted in create mode
 * behind a real router (the component calls `useRoute`/`useUnsavedChangesGuard`,
 * which needs a matched route to register `onBeforeRouteLeave`), no store
 * dependency exercised here. Real Element Plus components throughout — no
 * stubs — per `ELEMENT-PLUS.md`'s testing boundary.
 */

async function mountCreateForm () {
  const { wrapper, router } = await mountWithRouterAndPinia(EventForm, {
    initialRoute: '/events/new',
    attachTo: document.body
  })

  await flushPromises()

  return { wrapper, router }
}

async function submit (wrapper: Awaited<ReturnType<typeof mountCreateForm>>['wrapper']): Promise<void> {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

/**
 * Sets an `el-date-picker` field's value by typing into its rendered input
 * and committing with Enter — the picker binds `value-format="YYYY-MM-DD"`,
 * so the committed model value is the plain date string. Element Plus's own
 * keydown handler treats a first Enter as "open the panel" and only a
 * second Enter as "commit and close" — closing is what fires its `change`
 * event (`watch(pickerVisible)` in the library's `picker.mjs`), so two
 * Enters are sent to exercise this form's own `@change` handlers
 * (`onStartDateChange` / `onEndDateChange`), not just the `v-model` update.
 */
async function setDate (wrapper: Awaited<ReturnType<typeof mountCreateForm>>['wrapper'], label: string, value: string): Promise<void> {
  const formItem = wrapper.findAll('.el-form-item').find(item => item.text().includes(label))
  if (!formItem) {
    throw new Error(`No el-form-item found for label "${label}"`)
  }

  const input = formItem.find('input')
  await input.setValue(value)
  await input.trigger('keydown', { key: 'Enter', code: 'Enter' })
  await input.trigger('keydown', { key: 'Enter', code: 'Enter' })
  await flushPromises()
}

let mountedWrappers: Awaited<ReturnType<typeof mountCreateForm>>['wrapper'][] = []

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }
  mountedWrappers = []
  document.body.innerHTML = ''
})

describe('EventForm', () => {
  describe('required-field validation', () => {
    it('shows a required message for every empty field on submit', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await submit(wrapper)

      // name, country, venue, startDate, endDate — `status` always carries a
      // default (`draft`) so it is never empty and never fails "required".
      await vi.waitFor(() => {
        expect(wrapper.findAll('.el-form-item__error').length).toBeGreaterThanOrEqual(5)
      })
      expect(wrapper.text()).toContain('Required field')
    })
  })

  describe('name length bounds', () => {
    it('shows the max-length message when the name exceeds 120 characters', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      const nameInput = wrapper.find('input[maxlength="120"]')
      await nameInput.setValue('a'.repeat(121))
      await nameInput.trigger('blur')

      await submit(wrapper)

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Maximum 120 characters')
      })
    })
  })

  describe('date ordering constraint', () => {
    it('rejects picking an end date before the start date', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await setDate(wrapper, 'Start date', '2027-06-10')
      // Programmatically drive the underlying model past the picker's own
      // `:disabled-date` (which already prevents *selecting* an invalid
      // cell in the UI) so the form-rule validator itself — the second of
      // the three enforcement layers — is what's under test here.
      const vm = wrapper.findComponent(EventForm).vm as unknown as { form: { endDate: string } }
      vm.form.endDate = '2027-06-01'

      await submit(wrapper)

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('End date must not precede start date.')
      })
    })

    it('clears an existing end date and shows a warning alert when the start date moves past it', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await setDate(wrapper, 'Start date', '2027-06-01')
      await setDate(wrapper, 'End date', '2027-06-10')

      // Move the start date past the already-chosen end date.
      await setDate(wrapper, 'Start date', '2027-06-20')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('End date cleared')
      })

      const vm = wrapper.findComponent(EventForm).vm as unknown as { form: { endDate: string } }
      expect(vm.form.endDate).toBe('')
    })

    it('dismisses the cleared-end-date warning once a new end date is chosen', async () => {
      const { wrapper } = await mountCreateForm()
      mountedWrappers.push(wrapper)

      await setDate(wrapper, 'Start date', '2027-06-01')
      await setDate(wrapper, 'End date', '2027-06-10')
      await setDate(wrapper, 'Start date', '2027-06-20')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('End date cleared')
      })

      await setDate(wrapper, 'End date', '2027-06-25')

      await vi.waitFor(() => {
        expect(wrapper.text()).not.toContain('End date cleared')
      })
    })
  })
})
