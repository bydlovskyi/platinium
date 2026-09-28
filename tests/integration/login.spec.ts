import Login from '@/views/auth/Login.vue'

import { mountWithRouterAndPinia } from '../support'

const SEEDED_EMAIL = 'admin@platinium.test'
const SEEDED_PASSWORD = 'admin123'

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
    // Distinct from the default `/` redirect, so this proves the preserved destination is used.
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

  it.each([
    ['an absolute URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example/phish']
  ])('ignores %s in ?redirect= and lands on home instead', async (_label, redirect) => {
    const { wrapper, router } = await mountWithRouterAndPinia(Login, {
      initialRoute: `/login?redirect=${encodeURIComponent(redirect)}`
    })

    await wrapper.find('input[type="email"]').setValue(SEEDED_EMAIL)
    await wrapper.find('input[type="password"]').setValue(SEEDED_PASSWORD)

    await submit(wrapper)

    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(routeNames.home)
    })
  })
})
