import Login from '@/views/auth/Login.vue'

import { mountWithRouterAndPinia } from '../support'

const SEEDED_EMAIL = 'admin@platinium.test'
const SEEDED_PASSWORD = 'admin123'

/**
 * Login screen, integration tested end to end (PRD-002 "Testing boundary"):
 * validation failure, credential rejection, successful sign-in and redirect,
 * and redirect back to a preserved destination.
 *
 * Mounted behind a real memory-history router (seeded with the app's actual
 * route table and the real `routeGuard`) and a real Pinia instance, against
 * the shared MSW node server answering `/auth/login` for real — no mocked
 * `authService`, no mocked store. Assertions are on visible text and input
 * values only, never on store internals.
 */
describe('Login screen', () => {
  async function submit (wrapper: Awaited<ReturnType<typeof mountWithRouterAndPinia>>['wrapper']): Promise<void> {
    await wrapper.find('form').trigger('submit')
  }

  it('shows inline required errors when submitted empty', async () => {
    const { wrapper } = await mountWithRouterAndPinia(Login, { initialRoute: '/login' })

    // The form comes pre-filled with the seeded credentials, so clear it first.
    await wrapper.find('input[type="email"]').setValue('')
    await wrapper.find('input[type="password"]').setValue('')

    await submit(wrapper)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Email is required.')
      expect(wrapper.text()).toContain('Password is required.')
    })
  })

  it('shows a non-blaming error when credentials are rejected', async () => {
    const { wrapper, router } = await mountWithRouterAndPinia(Login, { initialRoute: '/login' })

    await wrapper.find('input[type="email"]').setValue(SEEDED_EMAIL)
    await wrapper.find('input[type="password"]').setValue('wrong-password')

    await submit(wrapper)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Email or password is incorrect.')
    })

    // Rejected credentials must not navigate anywhere.
    expect(router.currentRoute.value.name).toBe(routeNames.login)
  })

  it('signs in successfully and redirects to home', async () => {
    const { wrapper, router } = await mountWithRouterAndPinia(Login, { initialRoute: '/login' })

    await wrapper.find('input[type="email"]').setValue(SEEDED_EMAIL)
    await wrapper.find('input[type="password"]').setValue(SEEDED_PASSWORD)

    await submit(wrapper)

    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(routeNames.home)
    })
  })

  it('redirects back to a preserved destination from ?redirect=', async () => {
    // Only `/` (home) and `/login` are registered routes in this slice — the
    // catch-all (`path: '/:pathMatch(.*)*', redirect: '/'`) would swallow an
    // arbitrary deep path like `/tickets/42` before this assertion could
    // observe it. `/?highlight=42` is a real, resolvable destination distinct
    // from the plain `/` a successful sign-in redirects to by default, so it
    // still proves the preserved-redirect path rather than the default one.
    const { wrapper, router } = await mountWithRouterAndPinia(Login, {
      initialRoute: '/login?redirect=%2F%3Fhighlight%3D42'
    })

    await wrapper.find('input[type="email"]').setValue(SEEDED_EMAIL)
    await wrapper.find('input[type="password"]').setValue(SEEDED_PASSWORD)

    await submit(wrapper)

    await vi.waitFor(() => {
      expect(router.currentRoute.value.fullPath).toBe('/?highlight=42')
    })
  })
})
