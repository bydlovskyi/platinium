import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

import { routeGuard } from './route-guard'

/**
 * `NavigationGuardNext`'s declared type is an overloaded call signature
 * (`next(): void`, `next(to: RouteLocationRaw): void`, `next(false): void`,
 * `next((vm) => void): void`, ...), which `vi.fn<T>()` cannot represent —
 * vitest's `Mock<T>` needs a single, plain function signature. `routeGuard`
 * itself only ever calls `next()` or `next(<a route location>)`, so a mock
 * typed as a plain, untyped `vi.fn()` and cast once here (rather than at
 * every call site) is both simplest and sufficient for every assertion
 * below.
 */
function createNextMock (): NavigationGuardNext {
  return vi.fn() as unknown as NavigationGuardNext
}

/**
 * Route guard unit tests (PRD-002 "Testing boundary"): every
 * `meta.requiresAuth` / `meta.requiresAnonymous` combination, asserting the
 * exact redirect target and that the intended destination is preserved.
 *
 * Calls `routeGuard` directly with mock `to`/`from`/`next` — no router, no
 * component — and a real Pinia instance whose auth-store state is set
 * directly to drive each authenticated/unauthenticated branch.
 */
describe('routeGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function routeStub (overrides: Partial<RouteLocationNormalized> = {}): RouteLocationNormalized {
    return {
      path: '/',
      fullPath: '/',
      name: undefined,
      params: {},
      query: {},
      hash: '',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
      ...overrides
    } as RouteLocationNormalized
  }

  function signIn (): void {
    const authStore = useAuthStore()

    authStore.token = 'mock-token-under-test'
    authStore.user = { id: 'u1', name: 'Admin', email: 'admin@platinium.test', role: 'admin' }
  }

  it('calls next() with no args when the route has no auth-related meta', () => {
    const to = routeStub({ path: '/somewhere', fullPath: '/somewhere', meta: {} })
    const next = createNextMock()

    routeGuard(to, routeStub(), next)

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith()
  })

  describe('requiresAuth', () => {
    it('redirects to login preserving the intended destination when unauthenticated', () => {
      const to = routeStub({
        path: '/tickets/42',
        fullPath: '/tickets/42?foo=bar',
        meta: { requiresAuth: true }
      })
      const next = createNextMock()

      routeGuard(to, routeStub(), next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith({ name: routeNames.login, query: { redirect: '/tickets/42?foo=bar' } })
    })

    it('calls next() with no args when authenticated', () => {
      signIn()

      const to = routeStub({ path: '/', fullPath: '/', meta: { requiresAuth: true } })
      const next = createNextMock()

      routeGuard(to, routeStub(), next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('requiresAnonymous', () => {
    it('redirects to home when authenticated', () => {
      signIn()

      const to = routeStub({ path: '/login', fullPath: '/login', meta: { requiresAnonymous: true } })
      const next = createNextMock()

      routeGuard(to, routeStub(), next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith({ name: routeNames.home })
    })

    it('calls next() with no args when unauthenticated', () => {
      const to = routeStub({ path: '/login', fullPath: '/login', meta: { requiresAnonymous: true } })
      const next = createNextMock()

      routeGuard(to, routeStub(), next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith()
    })
  })
})
