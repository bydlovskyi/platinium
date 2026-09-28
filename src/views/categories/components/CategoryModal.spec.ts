import { flushPromises } from '@vue/test-utils'

import CategoryModal from './CategoryModal.vue'

import { mountWithRouterAndPinia, signInAs } from '../../../../tests/support'
import { db } from '@/mocks/db/singleton'
import type { ICategory } from '@/mocks/db'

function buildCategory (overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: overrides.id ?? 'category-1',
    name: 'General Admission',
    description: 'Standard entry with access to general seating areas.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

async function mountModal (category?: ICategory) {
  const { openModal, closeModal } = useModals()

  const result = await mountWithRouterAndPinia(CategoryModal, {
    props: { category, onSaved: undefined },
    attachTo: document.body,
    // Unstub <transition>: VTU's default stub skips the hooks that drive el-dialog's focus-on-open/restore.
    global: { stubs: { transition: false } }
  })

  // The modal itself is not route-guarded, but its writes need a real session.
  await signInAs('admin')

  openModal('CategoryModal', { category, onSaved: undefined })
  await result.wrapper.setProps({ category })
  await flushPromises()

  return { ...result, openModal, closeModal }
}

function findMessageBoxButton (text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.el-message-box button'))
    .find(candidate => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`No message box button found with text "${text}"`)
  }

  return button
}

function nameInput (): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('.el-dialog input[maxlength="120"]')
  if (!input) {
    throw new Error('Name input not found in the dialog')
  }
  return input
}

function descriptionTextarea (): HTMLTextAreaElement {
  const textarea = document.querySelector<HTMLTextAreaElement>('.el-dialog textarea[maxlength="500"]')
  if (!textarea) {
    throw new Error('Description textarea not found in the dialog')
  }
  return textarea
}

async function setInputValue (input: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}

let mountedWrappers: Awaited<ReturnType<typeof mountModal>>['wrapper'][] = []

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }
  mountedWrappers = []

  // useModals state is module-level; close explicitly so it doesn't leak into the next test.
  const { closeModal } = useModals()
  closeModal('CategoryModal')

  document.body.innerHTML = ''
})

describe('CategoryModal', () => {
  describe('required-field validation', () => {
    it('shows a required message when the name is empty on submit', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      const form = document.querySelector('.el-dialog form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('Required field')
      })
    })

    it('rejects a whitespace-only name client-side (the bug fix under test)', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), '   ')

      const form = document.querySelector('.el-dialog form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('Required field')
      })
    })
  })

  describe('length bounds', () => {
    it('shows the max-length message when the name exceeds 120 characters', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), 'a'.repeat(121))

      const form = document.querySelector('.el-dialog form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('Maximum 120 characters')
      })
    })

    it('shows the max-length message when the description exceeds 500 characters', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), 'Valid Name')
      await setInputValue(descriptionTextarea(), 'a'.repeat(501))

      const form = document.querySelector('.el-dialog form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('Maximum 500 characters')
      })
    })
  })

  describe('optional description', () => {
    it('does not show a required message for an empty description on submit', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), 'Valid Name')

      const form = document.querySelector('.el-dialog form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
      await flushPromises()

      await flushPromises()

      const descriptionItem = Array.from(document.querySelectorAll('.el-dialog .el-form-item'))
        .find(item => item.textContent?.includes('Description'))
      expect(descriptionItem?.querySelector('.el-form-item__error')).toBeNull()
    })
  })

  describe('trimming before submission', () => {
    it('trims leading/trailing whitespace from both fields before sending the payload', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), '  Padded Name  ')
      await setInputValue(descriptionTextarea(), '  Padded description.  ')

      const form = document.querySelector('.el-dialog form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
      await flushPromises()
      await flushPromises()

      const created = db.categories.list({ perPage: Number.MAX_SAFE_INTEGER }).data
        .find(category => category.name === 'Padded Name')

      expect(created).toBeDefined()
      expect(created?.description).toBe('Padded description.')
    })
  })

  describe('dialog behaviour', () => {
    it('focuses the name input when the dialog opens', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await vi.waitFor(() => {
        expect(document.activeElement).toBe(nameInput())
      })
    })

    it('restores focus to the trigger element on close', async () => {
      const trigger = document.createElement('button')
      trigger.textContent = 'Create category'
      document.body.appendChild(trigger)
      trigger.focus()
      expect(document.activeElement).toBe(trigger)

      const { wrapper, closeModal } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await vi.waitFor(() => {
        expect(document.activeElement).toBe(nameInput())
      })

      closeModal('CategoryModal')
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.activeElement).toBe(trigger)
      })

      trigger.remove()
    })

    it('closes a clean form immediately on Escape, without prompting', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')).toBeTruthy()
      })

      const dialogWrapper = document.querySelector('.el-overlay-dialog') ?? document.querySelector('.el-dialog')
      dialogWrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      expect(document.querySelector('.el-message-box')).toBeNull()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')).toBeNull()
      })
    })

    it('prompts via ElMessageBox.confirm on Escape when the form is dirty, and stays open on Stay', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), 'Unsaved Name')

      const dialogWrapper = document.querySelector('.el-overlay-dialog') ?? document.querySelector('.el-dialog')
      dialogWrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')).toBeTruthy()
      })
      expect(document.querySelector('.el-message-box')?.textContent).toContain('unsaved changes')

      findMessageBoxButton('Stay').click()
      await flushPromises()

      expect(document.querySelector('.el-dialog')).toBeTruthy()
      expect((nameInput()).value).toBe('Unsaved Name')
    })

    it('discards changes and closes the dialog when the unsaved-changes prompt is confirmed', async () => {
      const { wrapper } = await mountModal(undefined)
      mountedWrappers.push(wrapper)

      await setInputValue(nameInput(), 'Unsaved Name')

      const dialogWrapper = document.querySelector('.el-overlay-dialog') ?? document.querySelector('.el-dialog')
      dialogWrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')).toBeTruthy()
      })

      findMessageBoxButton('Discard').click()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')).toBeNull()
      })
    })
  })

  describe('edit mode', () => {
    it('pre-fills the form with the existing record\'s values', async () => {
      const category = buildCategory({ name: 'VIP', description: 'Backstage access.' })
      const { wrapper } = await mountModal(category)
      mountedWrappers.push(wrapper)

      await vi.waitFor(() => {
        expect(nameInput().value).toBe('VIP')
        expect(descriptionTextarea().value).toBe('Backstage access.')
      })
    })
  })
})
