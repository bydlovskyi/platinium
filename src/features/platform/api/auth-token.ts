/**
 * The `localStorage` key the persisted bearer token lives under.
 *
 * No auth store exists yet — it lands in issue #19, and will be the thing
 * that actually writes here on login/logout and clears it on session
 * expiry. This slice (#18) only needs a reader: the request interceptor
 * (`interceptors/request.interceptor.ts`) attaches whatever token is
 * currently persisted under this key to every outgoing request. `src/features/platform/api/`
 * sits below the store layer in the dependency direction (composable →
 * store → service → apiClient), so it must never import a Pinia store —
 * reading `localStorage` directly is the only way this layer can see the
 * token at all.
 */
export const AUTH_TOKEN_STORAGE_KEY = 'platinum:auth-token'

/** Reads the currently persisted bearer token, or `null` when no session is active. */
export function getPersistedAuthToken (): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}
