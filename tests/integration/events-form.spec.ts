import { flushPromises } from '@vue/test-utils'

import Events from '@/views/events/Events.vue'
import EventForm from '@/views/events/components/EventForm.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
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

async function fillRequiredFields (wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper']): Promise<void> {
  await wrapper.find('input[maxlength="120"]').setValue('Autumn Food Fair')

  const countrySelect = wrapper.find('.el-select')
  await countrySelect.trigger('click')
  await flushPromises()

  const countryOption = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
    .find(item => item.textContent?.trim() === 'Germany')
  expect(countryOption).toBeDefined()
  countryOption!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()

  const venueInputs = wrapper.findAll('input[maxlength="120"]')
  await venueInputs[1]!.setValue('Central Park')

  const dateInputs = wrapper.findAll('.el-date-editor input')
  await dateInputs[0]!.setValue('2028-03-01')
  await dateInputs[0]!.trigger('keydown', { key: 'Enter', code: 'Enter' })
  await dateInputs[0]!.trigger('keydown', { key: 'Enter', code: 'Enter' })
  await flushPromises()

  await dateInputs[1]!.setValue('2028-03-05')
  await dateInputs[1]!.trigger('keydown', { key: 'Enter', code: 'Enter' })
  await dateInputs[1]!.trigger('keydown', { key: 'Enter', code: 'Enter' })
  await flushPromises()
}

// Makes `DELETE /events/{id}` answer 409; inserts a category too since `beforeEach` clears them.
function seedBlockingTicket (eventId: string): void {
  const category: ICategory = {
    id: 'events-delete-spec-category',
    name: 'Test Category',
    description: 'Category inserted only to satisfy the ticket fixture.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
  db.categories.insert(category)

  const ticket: ITicket = {
    id: 'events-delete-spec-ticket',
    name: 'Blocking Ticket',
    price: 1000,
    currency: 'USD',
    quantity: 10,
    status: 'draft',
    eventId,
    categoryId: category.id,
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

  await row.find('button[aria-label="Row actions"]').trigger('click')
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

describe('Events form', () => {
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
    it('shows a validation error on an empty submit, then succeeds once filled in and the row appears on the list', async () => {
      const { wrapper, router } = await mountSignedIn(EventForm, '/events/new')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Required field')
      })

      expect(db.events.list({ perPage: 100 }).meta.total).toBe(0)

      await fillRequiredFields(wrapper)

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.events)
      })

      expect(db.events.list({ perPage: 100 }).meta.total).toBe(1)

      const listWrapper = await mountWithRouterAndPinia(Events, { initialRoute: '/events', attachTo: document.body })
      mountedWrappers.push(listWrapper.wrapper)
      await flushPromises()

      await vi.waitFor(() => {
        expect(listWrapper.wrapper.text()).toContain('Autumn Food Fair')
      })
    })
  })

  describe('edit', () => {
    it('loads an existing event, saves a change, and the update is reflected', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Original Name', venue: 'Original Venue' }))

      const { wrapper, router } = await mountSignedIn(EventForm, '/events/e1/edit')

      await vi.waitFor(() => {
        expect((wrapper.find('input[maxlength="120"]').element as HTMLInputElement).value).toBe('Original Name')
      })

      const nameInput = wrapper.find('input[maxlength="120"]')
      await nameInput.setValue('Updated Name')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(routeNames.events)
      })

      const updated = await eventsService.get('e1')
      expect(updated.name).toBe('Updated Name')
      expect(updated.venue).toBe('Original Venue')
    })

    it('shows a not-found result for an unknown event id instead of an empty form', async () => {
      const { wrapper } = await mountSignedIn(EventForm, '/events/does-not-exist/edit')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Event not found')
      })

      expect(wrapper.find('form').exists()).toBe(false)
    })
  })

  describe('delete', () => {
    describe('from the list, with confirmation', () => {
      it('removes the row and shows a success notification once confirmed', async () => {
        db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))

        const { wrapper } = await mountSignedIn(Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Rooftop Jazz Night')
        })

        await invokeRowAction(wrapper, 'Rooftop Jazz Night', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')?.textContent).toContain('Rooftop Jazz Night')
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(wrapper.text()).not.toContain('Rooftop Jazz Night')
        })

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('Event deleted.')
        })

        expect(db.events.get('e1')).toBeUndefined()
      })

      it('does not delete the row when the confirmation is cancelled', async () => {
        db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))

        const { wrapper } = await mountSignedIn(Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Rooftop Jazz Night')
        })

        await invokeRowAction(wrapper, 'Rooftop Jazz Night', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Cancel').click()
        await flushPromises()

        expect(wrapper.text()).toContain('Rooftop Jazz Night')
        expect(db.events.get('e1')).toBeDefined()
      })
    })

    describe('from the list, attempting to delete a referenced event', () => {
      it('surfaces the specific blocking-ticket-count message, keeps the row, and does not navigate', async () => {
        db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
        seedBlockingTicket('e1')

        const { wrapper, router } = await mountSignedIn(Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Rooftop Jazz Night')
        })

        await invokeRowAction(wrapper, 'Rooftop Jazz Night', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('1 ticket')
        })
        expect(document.querySelector('.el-notification')?.textContent).toContain('reference this event')

        expect(wrapper.text()).toContain('Rooftop Jazz Night')
        expect(db.events.get('e1')).toBeDefined()
        expect(router.currentRoute.value.name).toBe(routeNames.events)

        // Stays open on failure: onConfirm re-throws, so useConfirm's beforeClose never calls done().
        expect(document.querySelector('.el-message-box')).toBeTruthy()
      })
    })

    describe('deleting the last row on a page beyond the first', () => {
      it('navigates back to the previous page instead of showing it empty', async () => {
        // Default page size is 20, so the 21st event is the only row on page 2.
        for (let index = 1; index <= 21; index++) {
          db.events.insert(buildEvent({ id: `e${index}`, name: `Event ${String(index).padStart(2, '0')}` }))
        }

        const { wrapper, router } = await mountSignedIn(Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.find('.el-pagination__total').text()).toContain('21')
        })

        // Zero-padded names sorted ascending make "Event 21" deterministically the last row.
        await router.push({ query: { page: '2', sort: 'name', order: 'asc' } })
        await flushPromises()

        await vi.waitFor(() => {
          expect(router.currentRoute.value.query.page).toBe('2')
          expect(wrapper.text()).toContain('Event 21')
        })

        await invokeRowAction(wrapper, 'Event 21', 'Delete')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(router.currentRoute.value.query.page).toBeUndefined()
        })

        await vi.waitFor(() => {
          expect(wrapper.text()).not.toContain('Event 21')
        })
      })
    })

    describe('from the edit form', () => {
      it('deletes and navigates back to the list on success', async () => {
        db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))

        const { wrapper, router } = await mountSignedIn(EventForm, '/events/e1/edit')

        await vi.waitFor(() => {
          expect((wrapper.find('input[maxlength="120"]').element as HTMLInputElement).value).toBe('Rooftop Jazz Night')
        })

        const deleteButton = wrapper.findAll('button').find(button => button.text().includes('Delete event'))
        expect(deleteButton).toBeDefined()
        await deleteButton!.trigger('click')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')?.textContent).toContain('Rooftop Jazz Night')
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(router.currentRoute.value.name).toBe(routeNames.events)
        })

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('Event deleted.')
        })

        expect(db.events.get('e1')).toBeUndefined()
      })

      it('stays on the form and surfaces the conflict message when the event is referenced', async () => {
        db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
        seedBlockingTicket('e1')

        const { wrapper, router } = await mountSignedIn(EventForm, '/events/e1/edit')

        await vi.waitFor(() => {
          expect((wrapper.find('input[maxlength="120"]').element as HTMLInputElement).value).toBe('Rooftop Jazz Night')
        })

        const deleteButton = wrapper.findAll('button').find(button => button.text().includes('Delete event'))
        expect(deleteButton).toBeDefined()
        await deleteButton!.trigger('click')

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Delete').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-notification')?.textContent).toContain('1 ticket')
        })

        expect(router.currentRoute.value.name).toBe(routeNames.eventEdit)
        expect(db.events.get('e1')).toBeDefined()
      })
    })
  })
})
