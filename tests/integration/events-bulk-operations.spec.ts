import { flushPromises } from '@vue/test-utils'

import Events from '@/views/events/Events.vue'

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

// Makes the bulk delete report a per-id CONFLICT for `eventId`, carrying the blocking count.
function seedBlockingTicket (eventId: string): void {
  const category: ICategory = {
    id: 'events-bulk-spec-category',
    name: 'Test Category',
    description: 'Category inserted only to satisfy the ticket fixture.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
  db.categories.insert(category)

  const ticket: ITicket = {
    id: 'events-bulk-spec-ticket',
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

function findMessageBoxButton (text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.el-message-box button'))
    .find(candidate => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`No message box button found with text "${text}"`)
  }

  return button
}

async function selectRow (
  wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'],
  rowText: string
): Promise<void> {
  const row = wrapper.findAll('tbody tr').find(candidate => candidate.text().includes(rowText))
  if (!row) {
    throw new Error(`No row found containing text "${rowText}"`)
  }

  await row.find('input[type="checkbox"]').setValue(true)
}

function findBulkButton (wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper'], label: string) {
  return wrapper.findAll('button').find(button => button.text().trim() === label)
}

describe('Events bulk operations', () => {
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

  describe('bulk delete, fully successful', () => {
    it('deletes every selected event, refreshes the list and shows a success result', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbourside Market' }))

      const { wrapper } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
        expect(wrapper.text()).toContain('Harbourside Market')
      })

      await selectRow(wrapper, 'Rooftop Jazz Night')
      await selectRow(wrapper, 'Harbourside Market')
      await flushPromises()

      expect(wrapper.text()).toContain('2 selected on this page')

      const deleteButton = findBulkButton(wrapper, 'Delete')
      expect(deleteButton).toBeDefined()
      await deleteButton!.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')?.textContent).toContain('2 events')
      })

      findMessageBoxButton('Delete').click()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('2 succeeded, 0 failed')
      })

      expect(wrapper.text()).not.toContain('Rooftop Jazz Night')
      expect(wrapper.text()).not.toContain('Harbourside Market')
      expect(db.events.get('e1')).toBeUndefined()
      expect(db.events.get('e2')).toBeUndefined()

      expect(wrapper.text()).not.toContain('selected on this page')
    })
  })

  describe('bulk delete, partial failure', () => {
    it('deletes the unblocked event, reports the blocked one with its blocking count, and keeps the blocked row', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbourside Market' }))
      seedBlockingTicket('e2')

      const { wrapper } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
        expect(wrapper.text()).toContain('Harbourside Market')
      })

      await selectRow(wrapper, 'Rooftop Jazz Night')
      await selectRow(wrapper, 'Harbourside Market')
      await flushPromises()

      const deleteButton = findBulkButton(wrapper, 'Delete')
      await deleteButton!.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')).toBeTruthy()
      })

      findMessageBoxButton('Delete').click()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('1 succeeded, 1 failed')
      })

      const dialogText = document.querySelector('.el-dialog')?.textContent ?? ''
      expect(dialogText).toContain('e2')
      expect(dialogText).toContain('reference this event')
      expect(dialogText).toContain('1')

      expect(db.events.get('e1')).toBeUndefined()
      expect(db.events.get('e2')).toBeDefined()

      await vi.waitFor(() => {
        expect(wrapper.text()).not.toContain('Rooftop Jazz Night')
      })
      expect(wrapper.text()).toContain('Harbourside Market')
    })
  })

  describe('bulk archive', () => {
    it('sets every selected event\'s status to completed', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night', status: 'published' }))

      const { wrapper } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
      })

      await selectRow(wrapper, 'Rooftop Jazz Night')
      await flushPromises()

      const archiveButton = findBulkButton(wrapper, 'Archive')
      expect(archiveButton).toBeDefined()
      await archiveButton!.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')?.textContent).toContain('1 event')
      })

      findMessageBoxButton('Archive').click()
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-dialog')?.textContent).toContain('1 succeeded, 0 failed')
      })

      expect(db.events.get('e1')?.status).toBe('completed')
    })
  })

  describe('bulk delete, page-back on an emptied page', () => {
    it('steps back a page when every row on a page beyond the first is bulk-deleted', async () => {
      // perPage=2 with 3 events puts only "e3" on page 2.
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbourside Market' }))
      db.events.insert(buildEvent({ id: 'e3', name: 'Lakeside Book Fair' }))

      const { wrapper, router } = await mountSignedIn(Events, '/events?page=2&perPage=2')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Lakeside Book Fair')
      })
      expect(wrapper.text()).not.toContain('Rooftop Jazz Night')

      await selectRow(wrapper, 'Lakeside Book Fair')
      await flushPromises()

      const deleteButton = findBulkButton(wrapper, 'Delete')
      await deleteButton!.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')).toBeTruthy()
      })

      findMessageBoxButton('Delete').click()
      await flushPromises()

      // `useListQuery` omits `page` from the URL at the default page, so no param means page 1.
      await vi.waitFor(() => {
        expect(router.currentRoute.value.query.page).toBeUndefined()
      })

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
        expect(wrapper.text()).toContain('Harbourside Market')
      })
      expect(wrapper.text()).not.toContain('Lakeside Book Fair')
      expect(db.events.get('e3')).toBeUndefined()
    })

    it('does not step back when only some of the page\'s rows are bulk-deleted (still on the same page)', async () => {
      // Page 2 keeps "e4" after "e3" is deleted, so no page-back should happen.
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbourside Market' }))
      db.events.insert(buildEvent({ id: 'e3', name: 'Lakeside Book Fair' }))
      db.events.insert(buildEvent({ id: 'e4', name: 'Hilltop Comedy Night' }))

      const { wrapper, router } = await mountSignedIn(Events, '/events?page=2&perPage=2')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Lakeside Book Fair')
        expect(wrapper.text()).toContain('Hilltop Comedy Night')
      })

      await selectRow(wrapper, 'Lakeside Book Fair')
      await flushPromises()

      const deleteButton = findBulkButton(wrapper, 'Delete')
      await deleteButton!.trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')).toBeTruthy()
      })

      findMessageBoxButton('Delete').click()
      await flushPromises()

      await vi.waitFor(() => {
        expect(wrapper.text()).not.toContain('Lakeside Book Fair')
      })

      expect(router.currentRoute.value.query.page).toBe('2')
      expect(wrapper.text()).toContain('Hilltop Comedy Night')
      expect(db.events.get('e3')).toBeUndefined()
      expect(db.events.get('e4')).toBeDefined()
    })
  })

  describe('selection safety', () => {
    it('clears the selection and hides the bulk bar when the query changes (e.g. a filter)', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night', country: 'US' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbourside Market', country: 'AU' }))

      const { wrapper, router } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
      })

      await selectRow(wrapper, 'Rooftop Jazz Night')
      await flushPromises()

      expect(wrapper.text()).toContain('1 selected on this page')

      await router.push({ path: '/events', query: { country: 'AU' } })
      await flushPromises()

      expect(wrapper.text()).not.toContain('selected on this page')
    })
  })
})
