import { AUTH_TOKEN_STORAGE_KEY } from '@/features/platform/api/auth-token'
import { chaos } from '@/mocks/chaos'
import { resetDatabase, seedSession } from '../../tests/support'

const SEEDED_EMAIL = 'admin@platinium.test'
const SEEDED_PASSWORD = 'admin123'

describe('useAuthStore', () => {
  beforeEach(() => {
    resetDatabase()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('signIn', () => {
    it('persists the token and the user on success, and derives isAuthenticated', async () => {
      const authStore = useAuthStore()

      expect(authStore.isAuthenticated).toBe(false)

      await authStore.signIn(SEEDED_EMAIL, SEEDED_PASSWORD)

      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.token).toEqual(expect.any(String))
      expect(authStore.user).toEqual({
        id: expect.any(String),
        name: 'Admin',
        email: SEEDED_EMAIL,
        role: 'admin'
      })
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(authStore.token)
    })

    it('throws and leaves the store signed out when credentials are rejected', async () => {
      const authStore = useAuthStore()

      await expect(authStore.signIn(SEEDED_EMAIL, 'wrong-password')).rejects.toThrow()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(authStore.user).toBeNull()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('throws and leaves the store signed out for an unknown email', async () => {
      const authStore = useAuthStore()

      await expect(authStore.signIn('nobody@platinium.test', SEEDED_PASSWORD)).rejects.toThrow()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })
  })

  describe('signOut', () => {
    it('clears the token, the user and localStorage after a successful sign-in', async () => {
      const authStore = useAuthStore()

      await authStore.signIn(SEEDED_EMAIL, SEEDED_PASSWORD)
      expect(authStore.isAuthenticated).toBe(true)

      await authStore.signOut()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(authStore.user).toBeNull()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('still clears local state when the logout request fails (best-effort)', async () => {
      const authStore = useAuthStore()

      await authStore.signIn(SEEDED_EMAIL, SEEDED_PASSWORD)

      chaos.failNextRequest({ path: '/auth/logout', status: 500 })

      await authStore.signOut()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(authStore.user).toBeNull()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('publishes authSignedOut', async () => {
      const authStore = useAuthStore()
      const listener = vi.fn()
      const subscription = helpers.eventEmitter.listen('authSignedOut', listener)

      await authStore.signIn(SEEDED_EMAIL, SEEDED_PASSWORD)
      await authStore.signOut()

      expect(listener).toHaveBeenCalledOnce()

      subscription.remove()
    })
  })

  describe('restore', () => {
    it('leaves the store signed out when no token is persisted', async () => {
      const authStore = useAuthStore()

      await authStore.restore()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(authStore.user).toBeNull()
    })

    it('restores the user for a valid persisted token', async () => {
      const { token } = await seedSession('admin')

      const authStore = useAuthStore()

      await authStore.restore()

      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.token).toBe(token)
      expect(authStore.user).toEqual({
        id: expect.any(String),
        name: 'Admin',
        email: SEEDED_EMAIL,
        role: 'admin'
      })
    })

    it('clears the session when the persisted token is stale/unknown', async () => {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'mock-token-does-not-exist')

      const authStore = useAuthStore()

      await authStore.restore()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.token).toBeNull()
      expect(authStore.user).toBeNull()
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })
  })
})
