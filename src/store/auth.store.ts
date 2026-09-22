import { AUTH_TOKEN_STORAGE_KEY, getPersistedAuthToken } from '@/features/platform/api/auth-token'

/**
 * Global session state — the token, the current administrator and the
 * derived authenticated flag. Global rather than view-scoped because the
 * route guard, the (future) shell header and PRD-007's permission checks
 * all read it.
 *
 * The token is persisted to `localStorage` under `AUTH_TOKEN_STORAGE_KEY`
 * (`src/features/platform/api/auth-token.ts`) — the request interceptor
 * reads that same key directly, since it sits below the store layer in the
 * dependency direction and must never import a Pinia store. This store is
 * the only thing that ever *writes* to that key.
 */
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

  /** Signs in with the given credentials. Throws on validation/credential failure — the caller (the login form) renders the error. */
  async function signIn (email: string, password: string): Promise<void> {
    const response = await authService.login(email, password)

    persistToken(response.token)
    user.value = response.user
  }

  /**
   * Clears the local session (token, user, `localStorage`) and notifies the
   * rest of the app — `authSignedOut` — so any cached entity-store state is
   * dropped too. Shared by `signOut()` below and by the `sessionExpired`
   * subscriber in `main.ts`: a 401 means the server has already invalidated
   * the token, so that path must not call `authService.logout()` again —
   * doing so would just 401 a second time and re-publish `sessionExpired`,
   * looping.
   */
  function endSession (): void {
    clearSession()
    helpers.eventEmitter.publish('authSignedOut', undefined)
  }

  /**
   * Signs out: invalidates the server-side session, then clears local
   * state. The logout request is best-effort — a network failure must not
   * strand the client in a signed-in-looking state, so the local session is
   * always cleared regardless of outcome.
   */
  async function signOut (): Promise<void> {
    try {
      await authService.logout()
    } catch {
      // Best-effort: endSession() below runs either way.
    } finally {
      endSession()
    }
  }

  /**
   * Session bootstrap. Reads any persisted token and, if present, resolves
   * it against `GET /auth/me` to restore the current user. Must run to
   * completion before the router's first guard evaluation (wired in
   * `src/main.ts`, before `router.isReady()`) — otherwise a reload on an
   * admin route races the guard and bounces to login.
   */
  async function restore (): Promise<void> {
    const persistedToken = getPersistedAuthToken()

    if (persistedToken === null) {
      return
    }

    token.value = persistedToken

    try {
      user.value = await authService.me()
    } catch {
      // The persisted token is stale, revoked or otherwise rejected: fall
      // back to a signed-out state rather than leaving a token with no user.
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
