import { flushPromises } from '@vue/test-utils'

import Events from '@/views/events/Events.vue'
import Categories from '@/views/categories/Categories.vue'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'
import { db } from '@/mocks/db/singleton'
import { server } from '@/mocks/server'
import { chaos } from '@/mocks/chaos'
import { notificationService } from '@/services/notification.service'
import { CSV_EXPORT_WARNING_THRESHOLD } from '@/composables/useCsvExport'
import type { ICategory, IEvent } from '@/mocks/db'

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
    description: 'Standard entry with access to general seating areas.',
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

function findMessageBoxButton (text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.el-message-box button'))
    .find(candidate => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`No message box button found with text "${text}"`)
  }

  return button
}

function findExportButton (wrapper: Awaited<ReturnType<typeof mountSignedIn>>['wrapper']) {
  const button = wrapper.findAll('button').find(candidate => candidate.text().trim() === 'Export CSV')
  if (!button) {
    throw new Error('No "Export CSV" button found')
  }
  return button
}

// A `request:start` listener rather than `server.use()`, so the real handler still answers.
function captureRequestUrls (): string[] {
  const captured: string[] = []

  function onRequestStart ({ request }: { request: Request }): void {
    captured.push(request.url)
  }

  server.events.on('request:start', onRequestStart)
  capturedListeners.push(onRequestStart)

  return captured
}

let capturedListeners: Parameters<typeof server.events.on<'request:start'>>[1][] = []

let createObjectUrlSpy: ReturnType<typeof vi.fn>
let revokeObjectUrlSpy: ReturnType<typeof vi.fn>
let clickSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  const seededUsers = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data
  resetDatabase({ events: [], categories: [], tickets: [], users: seededUsers })

  // jsdom lacks createObjectURL/revokeObjectURL. Spy on the real `URL` rather than replacing it:
  // axios and `new URL(...)` elsewhere in this file need the constructor intact.
  createObjectUrlSpy = vi.fn().mockReturnValue('blob:mock-url')
  revokeObjectUrlSpy = vi.fn()

  vi.stubGlobal('URL', URL)
  URL.createObjectURL = createObjectUrlSpy as (obj: Blob | MediaSource) => string
  URL.revokeObjectURL = revokeObjectUrlSpy as (url: string) => void

  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }
  mountedWrappers = []
  document.body.innerHTML = ''
  localStorage.clear()

  for (const listener of capturedListeners) {
    server.events.removeListener('request:start', listener)
  }
  capturedListeners = []

  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  vi.unstubAllGlobals()
  clickSpy.mockRestore()
})

describe('CSV export', () => {
  describe('events list', () => {
    it('requests the export with the active search, filter and sort, but no page/perPage, when clicked', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night', country: 'US', status: 'published' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbourside Market', country: 'AU', status: 'draft' }))

      const { wrapper } = await mountSignedIn(
        Events,
        '/events?search=Rooftop&status=published&country=US&sort=name&order=asc'
      )

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
      })

      const requests = captureRequestUrls()

      await findExportButton(wrapper).trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(requests.length).toBeGreaterThan(0)
      })

      const exportRequest = requests.map(url => new URL(url)).find(url => url.pathname === '/events')
      expect(exportRequest).toBeDefined()

      const params = exportRequest!.searchParams
      expect(params.get('format')).toBe('csv')
      expect(params.get('search')).toBe('Rooftop')
      expect(params.get('status')).toBe('published')
      expect(params.get('country')).toBe('US')
      expect(params.get('sort')).toBe('name')
      expect(params.get('order')).toBe('asc')
      expect(params.has('page')).toBe(false)
      expect(params.has('perPage')).toBe(false)
    })

    it('triggers a real download from the MSW response', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))
      db.events.insert(buildEvent({ id: 'e2', name: 'Harbour Food Fair', country: 'IE' }))

      const { wrapper } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
      })

      await findExportButton(wrapper).trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(clickSpy).toHaveBeenCalledTimes(1)
      })

      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
      const [blobArg] = createObjectUrlSpy.mock.calls[0] as [Blob]
      expect(blobArg.type).toContain('text/csv')

      // With no filter set, every row must be exported — empty filter values used to match nothing.
      const csv = await blobArg.text()
      expect(csv).toContain('Rooftop Jazz Night')
      expect(csv).toContain('Harbour Food Fair')

      const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement
      const today = new Date().toISOString().slice(0, 10)
      expect(anchor.download).toBe(`events-${today}.csv`)

      // Revoked on the next tick, after the click has been handed to the browser.
      await vi.waitFor(() => {
        expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url')
      })
    })

    it('shows the loading state on the button while the export request is in flight', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))

      const { wrapper } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
      })

      const exportButton = findExportButton(wrapper)
      expect(exportButton.classes()).not.toContain('is-loading')

      await exportButton.trigger('click')
      await nextTick()

      expect(exportButton.classes()).toContain('is-loading')

      await flushPromises()

      await vi.waitFor(() => {
        expect(exportButton.classes()).not.toContain('is-loading')
      })
    })

    it('clears the loading state and does not throw an unhandled rejection when the export request fails', async () => {
      db.events.insert(buildEvent({ id: 'e1', name: 'Rooftop Jazz Night' }))

      const { wrapper } = await mountSignedIn(Events, '/events')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Rooftop Jazz Night')
      })

      const notifySpy = vi.spyOn(notificationService, 'error')

      // List fetch and export share `/events` (`?format=csv` differs); the list fetch has settled, so this fails only the export.
      chaos.failNextRequest({ path: '/events', status: 500 })

      const exportButton = findExportButton(wrapper)
      await exportButton.trigger('click')
      await flushPromises()

      // Vitest fails on unhandled rejections, so passing here proves the failed export is caught.
      await vi.waitFor(() => {
        expect(exportButton.classes()).not.toContain('is-loading')
      })

      // The interceptor's toast is the only feedback; exactly once proves the catch doesn't double-notify.
      expect(notifySpy).toHaveBeenCalledOnce()
      expect(createObjectUrlSpy).not.toHaveBeenCalled()

      notifySpy.mockRestore()
    })

    describe('large-result warning (meta.total above the threshold)', () => {
      function seedManyEvents (): void {
        for (let index = 0; index < CSV_EXPORT_WARNING_THRESHOLD + 1; index += 1) {
          db.events.insert(buildEvent({ id: `bulk-e${index}`, name: `Bulk Event ${index}` }))
        }
      }

      it('warns before exporting and proceeds once confirmed', async () => {
        seedManyEvents()

        const { wrapper } = await mountSignedIn(Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Bulk Event')
        })

        const requests = captureRequestUrls()

        await findExportButton(wrapper).trigger('click')
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')?.textContent).toContain('Large export')
        })
        expect(document.querySelector('.el-message-box')?.textContent)
          .toContain(String(CSV_EXPORT_WARNING_THRESHOLD + 1))

        expect(requests.some(url => new URL(url).searchParams.get('format') === 'csv')).toBe(false)

        findMessageBoxButton('Export').click()
        await flushPromises()

        await vi.waitFor(() => {
          expect(clickSpy).toHaveBeenCalledTimes(1)
        })

        expect(requests.some(url => new URL(url).searchParams.get('format') === 'csv')).toBe(true)
      })

      it('does not export when the warning is cancelled', async () => {
        seedManyEvents()

        const { wrapper } = await mountSignedIn(Events, '/events')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Bulk Event')
        })

        const requests = captureRequestUrls()

        await findExportButton(wrapper).trigger('click')
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')).toBeTruthy()
        })

        findMessageBoxButton('Cancel').click()
        await flushPromises()

        expect(requests.some(url => new URL(url).searchParams.get('format') === 'csv')).toBe(false)
        expect(clickSpy).not.toHaveBeenCalled()
        expect(createObjectUrlSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('categories list', () => {
    it('requests the export with the active search and sort, but no page/perPage, when clicked', async () => {
      db.categories.insert(buildCategory({ id: 'c1', name: 'General Admission' }))
      db.categories.insert(buildCategory({ id: 'c2', name: 'VIP Pass' }))

      const { wrapper } = await mountSignedIn(Categories, '/categories?search=General&sort=name&order=desc')

      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('General Admission')
      })

      const requests = captureRequestUrls()

      await findExportButton(wrapper).trigger('click')
      await flushPromises()

      await vi.waitFor(() => {
        expect(requests.length).toBeGreaterThan(0)
      })

      const exportRequest = requests.map(url => new URL(url)).find(url => url.pathname === '/categories')
      expect(exportRequest).toBeDefined()

      const params = exportRequest!.searchParams
      expect(params.get('format')).toBe('csv')
      expect(params.get('search')).toBe('General')
      expect(params.get('sort')).toBe('name')
      expect(params.get('order')).toBe('desc')
      expect(params.has('page')).toBe(false)
      expect(params.has('perPage')).toBe(false)
    })

    describe('large-result warning (meta.total above the threshold)', () => {
      it('warns before exporting and does not download when cancelled', async () => {
        for (let index = 0; index < CSV_EXPORT_WARNING_THRESHOLD + 1; index += 1) {
          db.categories.insert(buildCategory({ id: `bulk-c${index}`, name: `Bulk Category ${index}` }))
        }

        const { wrapper } = await mountSignedIn(Categories, '/categories')

        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('Bulk Category')
        })

        await findExportButton(wrapper).trigger('click')
        await flushPromises()

        await vi.waitFor(() => {
          expect(document.querySelector('.el-message-box')?.textContent).toContain('Large export')
        })

        findMessageBoxButton('Cancel').click()
        await flushPromises()

        expect(clickSpy).not.toHaveBeenCalled()
        expect(createObjectUrlSpy).not.toHaveBeenCalled()
      })
    })
  })
})
