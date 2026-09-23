import App from '@/App.vue'

import { mountWithRouterAndPinia, setViewportToBreakpoint } from '../support'

/**
 * Admin shell component tests (PRD-002 "Testing boundary" — "Shell —
 * component tested at each breakpoint for the correct navigation
 * presentation, and tested for drawer-closes-on-navigate"). Mounted behind
 * a real router (seeded with the app's actual route table, so `App.vue`'s
 * `route.meta.layout` resolution genuinely renders `AdminLayout` around
 * `Home`) and a real Pinia instance with the auth store's state set
 * directly to an authenticated session — matching `route-guard.spec.ts`'s
 * established pattern for driving store state without a live login
 * round-trip.
 */
describe('AdminLayout — responsive navigation presentation', () => {
  function signIn (): void {
    const authStore = useAuthStore()

    authStore.token = 'mock-token-under-test'
    authStore.user = { id: 'u1', name: 'Ada Admin', email: 'admin@platinium.test', role: 'admin' }
  }

  async function mountShell () {
    const result = await mountWithRouterAndPinia(App, { initialRoute: '/' })

    signIn()
    await result.router.push('/')
    await nextTick()

    return result
  }

  it('desktop: renders a persistent full-width sidebar and no hamburger', async () => {
    setViewportToBreakpoint('desktop')

    const { wrapper } = await mountShell()
    await nextTick()

    expect(wrapper.find('nav[aria-label="Primary"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Open navigation"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Collapse navigation"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Expand navigation"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Dashboard')
  })

  it('tablet: renders the sidebar collapsed to icon-only, with a toggle to recover full width', async () => {
    setViewportToBreakpoint('tablet')

    const { wrapper } = await mountShell()
    await nextTick()

    // Icon-only: the nav is rendered, but its text label is not.
    expect(wrapper.find('nav[aria-label="Primary"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Primary"]').text()).not.toContain('Dashboard')

    const toggle = wrapper.find('[aria-label="Expand navigation"]')
    expect(toggle.exists()).toBe(true)

    await toggle.trigger('click')

    expect(wrapper.find('[aria-label="Collapse navigation"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Primary"]').text()).toContain('Dashboard')
  })

  it('mobile: hides the persistent sidebar and renders a hamburger behind a closed drawer', async () => {
    setViewportToBreakpoint('mobile')

    const { wrapper } = await mountShell()
    await nextTick()

    const hamburger = wrapper.find('[aria-label="Open navigation"]')
    expect(hamburger.exists()).toBe(true)

    // Closed: the drawer element isn't in an open state yet.
    expect(wrapper.find('.el-drawer.open').exists()).toBe(false)

    await hamburger.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('.el-drawer.open').exists()).toBe(true)
      expect(wrapper.find('.el-drawer.open').text()).toContain('Dashboard')
    })
  })

  it('mobile: the drawer closes when navigating to a new route', async () => {
    setViewportToBreakpoint('mobile')

    const { wrapper, router } = await mountShell()
    await nextTick()

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('.el-drawer.open').exists()).toBe(true)
    })

    // A genuinely different destination — pushing to the same route the
    // drawer's link is already on wouldn't change `route.fullPath` and
    // would give this assertion a false pass.
    await router.push({ name: routeNames.notFound, params: { pathMatch: ['nowhere'] } })

    await vi.waitFor(() => {
      expect(wrapper.find('.el-drawer.open').exists()).toBe(false)
    })
  })

  it('mobile: the drawer closes when clicking a nav link to the already-active route', async () => {
    setViewportToBreakpoint('mobile')

    const { wrapper } = await mountShell()
    await nextTick()

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('.el-drawer.open').exists()).toBe(true)
    })

    // "Dashboard" is the current route (`/`) — clicking it doesn't change
    // `route.fullPath`, so a close driven only by a route-change watcher
    // would miss this. AppSidebar must emit `navigate` on click regardless.
    await wrapper.find('.el-drawer.open a').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('.el-drawer.open').exists()).toBe(false)
    })
  })
})
