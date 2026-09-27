// Read from localStorage directly: this layer sits below the store and must never import it.
export const AUTH_TOKEN_STORAGE_KEY = 'platinum:auth-token'

export function getPersistedAuthToken (): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}
