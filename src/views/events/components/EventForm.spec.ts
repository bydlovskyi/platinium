import { flushPromises } from '@vue/test-utils'

import EventForm from './EventForm.vue'

import { mountWithRouterAndPinia } from '../../../../tests/support'

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

// Two Enters: the first opens the picker panel, the second commits and closes it, which is what fires `change`.
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

      // `status` defaults to `draft`, so it never fails "required".
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
      // Bypasses the picker's :disabled-date so the form-rule validator itself is under test.
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
