import { AUTH_TOKEN_STORAGE_KEY, getPersistedAuthToken } from '@/features/platform/api/auth-token'

export const useAuthStore = defineStore('authStore', () => {
  const token = ref<string | null>(null)
  const user = ref<TUser | null>(null)

  const isAuthenticated = computed(() => token.value !== null && user.value !== null)

  function persistToken (nextToken: string | null): void {
    token.value = nextToken

    if (nextToken === null) {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    } else {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextToken)
    }
  }

  function clearSession (): void {
    persistToken(null)
    user.value = null
  }

  async function signIn (email: string, password: string): Promise<void> {
    const response = await authService.login(email, password)

    persistToken(response.token)
    user.value = response.user
  }

  function endSession (): void {
    clearSession()
    helpers.eventEmitter.publish('authSignedOut', undefined)
  }

  async function signOut (): Promise<void> {
    try {
      await authService.logout()
    } catch {
      // Best-effort: endSession() below runs either way.
    } finally {
      endSession()
    }
  }

  async function restore (): Promise<void> {
    const persistedToken = getPersistedAuthToken()

    if (persistedToken === null) {
      return
    }

    token.value = persistedToken

    try {
      user.value = await authService.me()
    } catch {
      clearSession()
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    signIn,
    signOut,
    endSession,
    restore
  }
})
