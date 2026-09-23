import { flushPromises } from '@vue/test-utils'

import Events from '@/views/events/Events.vue'
import EventForm from '@/views/events/components/EventForm.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
import { db } from '@/mocks/db/singleton'
import type { IEvent } from '@/mocks/db'

/**
 * Events create/edit form, integration tested end to end (GitHub issue #27,
 * PRD-004's testing boundary: "Full CRUD flow — integration tested against
 * MSW: create with a validation failure then a success, verify the row
 * appears; edit and verify the change"). Mounted behind a real
 * memory-history router (the app's actual route table, including this
 * slice's own `eventCreate` / `eventEdit` routes) and a real Pinia instance,
 * against the shared MSW node server answering `POST /events`,
 * `GET /events/{id}` and `PATCH /events/{id}` for real — no mocked
 * `eventsService`. A session is seeded via `seedSession('admin')` +
 * `authStore.restore()` (this repo's other established pattern alongside
 * writing to the auth store directly, used here since it exercises the real
 * persisted-token path a fresh navigation to a guarded route relies on).
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

describe('Events form', () => {
  beforeEach(() => {
    // Only `events` is cleared to an empty, deterministic slate — `users`
    // keeps the default seeded administrator `seedSession('admin')` looks
    // up, unlike `Events.spec.ts`'s reset (which doesn't need a session
    // since it signs in by writing to the auth store directly instead).
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

      // No event was created by the failed attempt.
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
})
