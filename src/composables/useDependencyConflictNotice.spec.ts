import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'

import { ConflictError, DependencyConflictError } from '@/features/platform/api/interceptors/response.interceptor'

async function setup () {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/tickets', name: routeNames.tickets, component: { template: '<div />' } }
    ]
  })

  await router.push('/')
  await router.isReady()

  let notice!: ReturnType<typeof useDependencyConflictNotice>

  mount(defineComponent({
    setup () {
      notice = useDependencyConflictNotice()

      return () => null
    }
  }), { global: { plugins: [router] } })

  const notifyError = vi.spyOn(notificationService, 'error').mockImplementation(() => undefined)

  return { router, notice, notifyError }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useDependencyConflictNotice', () => {
  it('ignores errors that are not dependency conflicts', async () => {
    const { notice, notifyError } = await setup()

    notice.notifyDependencyConflict(new ConflictError({ code: 'DUPLICATE_NAME', message: 'Taken' }), { entity: 'event', to: '/tickets' })
    notice.notifyDependencyConflict(new Error('boom'), { entity: 'event', to: '/tickets' })

    expect(notifyError).not.toHaveBeenCalled()
  })

  it('names the blocking records and pluralises them', async () => {
    const { notice, notifyError } = await setup()

    notice.notifyDependencyConflict(
      new DependencyConflictError({ message: 'Conflict', entity: 'ticket', count: 3 }),
      { entity: 'category', to: '/tickets' }
    )

    expect(notifyError).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Cannot delete category',
      message: '3 tickets reference this category and must be removed first.',
      action: expect.objectContaining({ label: 'View 3 tickets' })
    }))
  })

  it('keeps the singular for a single blocking record', async () => {
    const { notice, notifyError } = await setup()

    notice.notifyDependencyConflict(
      new DependencyConflictError({ message: 'Conflict', entity: 'ticket', count: 1 }),
      { entity: 'event', to: '/tickets' }
    )

    expect(notifyError.mock.calls[0]![0].message).toBe('1 ticket reference this event and must be removed first.')
  })

  it('navigates to the blocking records from the notification action', async () => {
    const { router, notice, notifyError } = await setup()

    notice.notifyDependencyConflict(
      new DependencyConflictError({ message: 'Conflict', entity: 'ticket', count: 2 }),
      { entity: 'event', to: { name: routeNames.tickets, query: { eventId: 'event-7' } } }
    )
    notifyError.mock.calls[0]![0].action!.onClick()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/tickets?eventId=event-7')
    })
  })
})
