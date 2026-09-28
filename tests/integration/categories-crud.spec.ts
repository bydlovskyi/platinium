import { flushPromises } from '@vue/test-utils'

import App from '@/App.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
import { db } from '@/mocks/db/singleton'
import type { ICategory, IEvent, ITicket } from '@/mocks/db'

// Mounts App.vue because CategoryModal renders in the shared <Modals /> host there, not inside Categories.vue.

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

let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

async function mountSignedIn<T extends Component> (component: T, initialRoute: string) {
  await seedSession('admin')

  const result = await mountWithRouterAndPinia(component, {
    initialRoute,
    attachTo: document.body,
    // VTU stubs <transition> by default, which no-ops el-dialog's @opened focus and focus-trap restore.
    global: { stubs: { transition: false } }
  })
  mountedWrappers.push(result.wrapper)

  const authStore = useAuthStore()
  await authStore.restore()

  await result.router.push(initialRoute)
  await flushPromises()

  return result
}

function seedBlockingTicket (categoryId: string): void {
  const anyEvent = db.events.list({ perPage: 1 }).data[0]
  const event: IEvent = anyEvent ?? {
    id: 'categories-crud-spec-event',
    name: 'Fixture Event',
    country: 'US',
    venue: 'Fixture Venue',
    startDate: '2027-01-01',
    endDate: '2027-01-02',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
  if (anyEvent === undefined) {
    db.events.insert(event)
  }

  const ticket: ITicket = {
    id: 'categories-crud-spec-ticket',
    name: 'Blocking Ticket',
    price: 1000,
    currency: 'USD',
    quantity: 10,
    status: 'draft',
    eventId: event.id,
    categoryId,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
  db.tickets.insert(ticket)
}

// `el-dropdown` teleports its menu, so the wrapper must be mounted with `attachTo: document.body`.
async function invokeRowAction (
  wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'],
  rowText: string,
  actionLabel: string
): Promise<void> {
  const row = wrapper.findAll('tr, .el-card').find(candidate => candidate.text().includes(rowText))
  if (!row) {
    throw new Error(`No row found containing text "${rowText}"`)
  }

  await row.find('button[aria-label^="Actions for"]').trigger('click')
  await flushPromises()

  const item = Array.from(document.querySelectorAll('.el-dropdown-menu__item'))
    .find(candidate => candidate.textContent?.trim() === actionLabel)
  if (!item) {
    throw new Error(`No dropdown item found with label "${actionLabel}"`)
  }

  item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
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

function submitDialogForm (): void {
  const form = document.querySelector('.el-dialog form')
  form?.dispatchEvent(new Event('submit', { cancelable: true }))
}

async function openCreateModal (wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper']): Promise<void> {
  const createButton = wrapper.findAll('button').find(button => button.text().includes('Create category'))
  expect(createButton).toBeDefined()
  await createButton!.trigger('click')
  await flushPromises()

  await vi.waitFor(() => {
    expect(document.querySelector('.el-dialog')).toBeTruthy()
  })
}

describe('Categories view', () => {
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

  describe('create', () => {
    it('creates a category through the dialog and the new row appears in the table', async () => {
      const { wrapper } = await mountSignedIn(App, '/categories')

      await openCreateModal(wrapper)

      await setInputValue(nameInput(), 'Backstage Pass')
      await setInputValue(descriptionTextarea(), 'All-access backstage entry.')

      submitDialogForm()
      await flushPromises()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')).toBeNull()
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Backstage Pass')
      })

      expect(document.querySelector('.el-notification')?.textContent).toContain('Category created.')
      expect(db.categories.list({ perPage: 100 }).data.some(category => category.name === 'Backstage Pass')).toBe(true)
    })
  })

  describe('duplicate-name handling', () => {
    it('lands the conflict message on the name field and keeps the dialog open, case-insensitively and whitespace-trimmed', async () => {
      db.categories.insert(buildCategory({ id: 'existing', name: 'VIP' }))

      const { wrapper } = await mountSignedIn(App, '/categories')

      await openCreateModal(wrapper)

      await setInputValue(nameInput(), '  vip  ')

      submitDialogForm()
      await flushPromises()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')).toBeTruthy()
      })

      await vi.waitFor(() => {
        const nameFormItem = Array.from(document.querySelectorAll('.el-dialog .el-form-item'))
          .find(item => item.textContent?.includes('Name'))
        expect(nameFormItem?.querySelector('.el-form-item__error')?.textContent).toContain('already exists')
      })

      expect(db.categories.list({ perPage: 100 }).meta.total).toBe(1)
    })
  })

  describe('edit', () => {
    it('loads the existing values, saves a change, and the row reflects it', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'Original Name', description: 'Original description.' }))

      const { wrapper } = await mountSignedIn(App, '/categories')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Original Name')
      })

      await invokeRowAction(wrapper, 'Original Name', 'Edit')

      await vi.waitFor(() => {
        expect(nameInput().value).toBe('Original Name')
        expect(descriptionTextarea().value).toBe('Original description.')
      })

      await setInputValue(nameInput(), 'Updated Name')

      submitDialogForm()
      await flushPromises()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')).toBeNull()
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Updated Name')
        expect(wrapper.text()).not.toContain('Original Name')
      })

      expect(db.categories.get('c1')?.name).toBe('Updated Name')
      expect(db.categories.get('c1')?.description).toBe('Original description.')
    })
  })

  describe('delete', () => {
    describe('with confirmation', () => {
      it('removes the row and shows a success notification once confirmed', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Early Bird' }))

        const { wrapper } = await mountSignedIn(App, '/categories')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Early Bird')
        })

        await invokeRowAction(wrapper, 'Early Bird', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')?.textContent).toContain('Early Bird')
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(wrapper.text()).not.toContain('Early Bird')
        })

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('Category deleted.')
        })

        expect(db.categories.get('c1')).toBeUndefined()
      })

      it('does not delete the row when the confirmation is cancelled', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Early Bird' }))

        const { wrapper } = await mountSignedIn(App, '/categories')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Early Bird')
        })

        await invokeRowAction(wrapper, 'Early Bird', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Cancel').click()
        await flushPromises()

        expect(wrapper.text()).toContain('Early Bird')
        expect(db.categories.get('c1')).toBeDefined()
      })
    })

    describe('attempting to delete a category referenced by a ticket', () => {
      it('surfaces the blocking-ticket-count conflict message, keeps the row, and does not remove the category', async () => {
        db.categories.insert(buildCategory({ id: 'c1', name: 'Reserved Seating' }))
        seedBlockingTicket('c1')

        const { wrapper } = await mountSignedIn(App, '/categories')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Reserved Seating')
        })

        await invokeRowAction(wrapper, 'Reserved Seating', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('1 ticket')
        })
        expect(document.querySelector('.el-notification')?.textContent).toContain('reference this category')

        expect(wrapper.text()).toContain('Reserved Seating')
        expect(db.categories.get('c1')).toBeDefined()
      })
    })
  })
})
