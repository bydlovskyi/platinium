import { flushPromises } from '@vue/test-utils'

import AppSidebar from './AppSidebar.vue'

import { mountWithRouterAndPinia } from '../../../tests/support'

function signIn (): void {
  const authStore = useAuthStore()

  authStore.token = 'mock-token-under-test'
  authStore.user = { id: 'u1', name: 'Ada Admin', email: 'admin@platinium.test', role: 'admin' }
}

describe('AppSidebar', () => {
  it('navigates by route name when an entry is selected, and announces it', async () => {
    const { wrapper, router } = await mountWithRouterAndPinia(AppSidebar, { initialRoute: '/login' })

    signIn()
    await wrapper.get('li.el-menu-item').trigger('click')
    await flushPromises()

    // The route component is lazy-loaded, so the push settles after a tick.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(routeNames.home))
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('renders every declared nav entry and highlights the current route', async () => {
    const { wrapper, router } = await mountWithRouterAndPinia(AppSidebar, { initialRoute: '/' })

    // `/` requires auth; sign in and re-navigate so the guard lands on `home`.
    signIn()
    await router.push('/')

    const link = wrapper.get('li.el-menu-item')

    expect(link.text()).toContain('Dashboard')
    expect(link.attributes('aria-current')).toBe('page')
  })

  it('does not mark a non-matching entry as current', async () => {
    const { wrapper } = await mountWithRouterAndPinia(AppSidebar, {
      initialRoute: '/login'
    })

    const link = wrapper.get('li.el-menu-item')

    expect(link.attributes('aria-current')).toBeUndefined()
  })

  it('hides the label but keeps the entry accessible when collapsed', async () => {
    const { wrapper, router } = await mountWithRouterAndPinia(AppSidebar, {
      initialRoute: '/',
      props: { collapsed: true }
    })

    signIn()
    await router.push('/')

    const link = wrapper.get('li.el-menu-item')

    expect(link.text()).not.toContain('Dashboard')
    expect(link.attributes('aria-label')).toBe('Dashboard')
  })
})
