import { flushPromises } from '@vue/test-utils'

import App from '@/App.vue'
import { AUTH_TOKEN_STORAGE_KEY } from '@/features/platform/api/auth-token'

import { mountWithRouterAndPinia, resetDatabase, seedSession } from '../support'

let mountedWrappers: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper'][] = []

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }
  mountedWrappers = []
  document.body.innerHTML = ''
  localStorage.clear()
  resetDatabase()
})

async function mountSignedIn () {
  const { token } = await seedSession('admin')

  const result = await mountWithRouterAndPinia(App, { initialRoute: '/', attachTo: document.body })
  mountedWrappers.push(result.wrapper)

  await useAuthStore().restore()
  await result.router.push('/')
  await flushPromises()

  return { ...result, token }
}

function findSignOutItem (): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.el-dropdown-menu__item'))
    .find(item => item.textContent?.trim() === 'Sign out')
}

describe('Signing out from the account menu', () => {
  it('ends the session, revokes the token server-side and sends the next navigation to login', async () => {
    const { wrapper, router, token } = await mountSignedIn()
    const authStore = useAuthStore()
    const onSignedOut = vi.fn()
    const subscription = helpers.eventEmitter.listen('authSignedOut', onSignedOut)

    expect(authStore.isAuthenticated).toBe(true)

    await wrapper.find('header').findAll('button').find(button => button.text().includes('Admin'))!.trigger('click')
    await vi.waitFor(() => {
      expect(findSignOutItem()).toBeDefined()
    })

    findSignOutItem()!.click()

    await vi.waitFor(() => {
      expect(onSignedOut).toHaveBeenCalledOnce()
    })

    expect(authStore.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()

    const revoked = await fetch(new URL('/auth/me', window.location.origin), { headers: { Authorization: `Bearer ${token}` } })
    expect(revoked.status).toBe(401)

    await router.push({ name: routeNames.events })
    expect(router.currentRoute.value.name).toBe(routeNames.login)

    subscription.remove()
  })
})
