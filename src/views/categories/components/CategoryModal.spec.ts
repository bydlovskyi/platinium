import { flushPromises } from '@vue/test-utils'

import CategoryModal from './CategoryModal.vue'

import { mountWithRouterAndPinia } from '../../../../tests/support'
import { db } from '@/mocks/db/singleton'
import type { ICategory } from '@/mocks/db'

/**
 * `CategoryModal` unit/component tests (GitHub issue #30, PRD-005's testing
 * boundary: "Category form validation — unit tested through the `el-form`
 * ref: required name, length bounds on both fields, optional description,
 * trimming" and "Dialog behaviour — component tested against the real
 * `el-dialog`: focus on open, focus restored on close, Escape closes a clean
 * form, Escape prompts on a dirty one"). Mounted behind a real router (the
 * component calls `useUnsavedChangesGuard`, which needs a matched route to
 * register itself, mirroring `EventForm.spec.ts`) with real Element Plus
 * components throughout — no stubs. `el-dialog` (via `useModals()`'s
 * `append-to-body` in `Modals.vue`) and `ElMessageBox` both teleport to
 * `document.body`, so this mounts with `attachTo: document.body` and queries
 * dialog content there, matching every other spec in this repo that deals
 * with teleported Element Plus content (`Events.spec.ts`,
 * `tests/integration/events-form.spec.ts`).
 *
 * `useModals()`'s `isOpen` is a module-level singleton (`useModals.ts`), not
 * per-component-instance state — exactly like the production `Modals.vue`
 * host renders it — so each test drives the dialog open/closed through the
 * real `openModal`/`closeModal` API rather than any component-internal prop.
 */

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
    // `el-dialog`'s focus-on-open (`@opened`, fired from its own `<Transition>`'s
    // `onAfterEnter` hook — see `use-dialog.mjs`) and focus-trap-restore-on-close
    // never fire under `@vue/test-utils`' default behaviour, which auto-stubs
    // Vue's built-in `<transition>`/`<transition-group>` (`DEFAULT_STUBS` in
    // `@vue/test-utils`) — a stub renders no transition hooks at all. Disabling
    // that one default stub (real teleport stays as-is; this component's own
    // `el-dialog` doesn't set `append-to-body` itself, only `Modals.vue` does)
    // is required for any assertion on dialog open/close side effects, not a
    // one-off test quirk.
    global: { stubs: { transition: false } }
  })

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

  // `useModals()`'s `isOpen`/`modals` maps are module-level singletons that
  // outlive any single component instance (mirrors production: `Modals.vue`
  // keeps one instance alive per modal name across every `openModal` call) —
  // close it explicitly so a leftover "open" state doesn't leak into the
  // next test in this file.
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

      // Give the (successful) submit request a chance to settle; the
      // create request itself is exercised by the integration suite — this
      // test only asserts no validation error appears against `description`.
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

      // The dialog remains open.
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
