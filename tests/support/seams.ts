/**
 * Seams for kit helpers that need real infrastructure this slice doesn't
 * build yet. The signatures are locked now so tests written against them
 * don't change call sites once the owning slice fills them in.
 */

import axios from 'axios'

import { db } from '@/mocks/db/singleton'
import { AUTH_TOKEN_STORAGE_KEY } from '@/features/platform/api/auth-token'
import type { ISeedDataset, TUserRole } from '@/mocks/db'

/**
 * Resets the shared mock database (`src/mocks/db`) back to its deterministic
 * seed, or to a given dataset override when one is provided. Call this
 * between tests that mutate the database so each test starts from a known,
 * independent state.
 */
export function resetDatabase<T extends ISeedDataset = ISeedDataset> (dataset?: T): void {
  db.reset(dataset)
}

/**
 * The seeded accounts' passwords, keyed by role — one entry per
 * {@link TUserRole}. PRD-002 introduced the `role` field and seeded the
 * administrator; PRD-007 adds the read-only `viewer` account
 * (`src/mocks/db/fixtures.ts`). Kept as a lookup table (rather than a bare
 * constant) so extending the seed with more roles stays a one-line addition
 * here, and so this record must stay exhaustive over `TUserRole`.
 */
const SEEDED_PASSWORD_BY_ROLE: Record<TUserRole, string> = {
  admin: 'admin123',
  viewer: 'viewer123'
}

/**
 * Seeds an authenticated session for a user with the given role, so a test
 * can start already signed in without driving the login form. Goes through
 * the real `POST /auth/login` handler (`src/mocks/handlers/auth.ts`) over
 * the shared MSW node server — the same server every test already talks to
 * via `apiClient` (`tests/setup.ts`) — rather than reaching into the mock
 * token scheme by hand: that scheme is intentionally private to the auth
 * handler, and going through the real endpoint means this seam can never
 * drift from what a genuine sign-in produces.
 *
 * Persists the resulting token under the same `localStorage` key the auth
 * store writes to (`AUTH_TOKEN_STORAGE_KEY`), so `authStore.restore()` or a
 * fresh page load picks it up exactly like a real persisted session. Returns
 * the token and the public user record for a caller that also wants to seed
 * Pinia state directly instead of going through `restore()`.
 */
export async function seedSession (role: string): Promise<{ token: string; user: TUser }> {
  const password = SEEDED_PASSWORD_BY_ROLE[role as TUserRole]

  if (password === undefined) {
    throw new Error(`seedSession(): no seeded user with role "${role}". Seeded roles: ${Object.keys(SEEDED_PASSWORD_BY_ROLE).join(', ')}.`)
  }

  const seededUser = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data.find(user => user.role === role)

  if (seededUser === undefined) {
    throw new Error(`seedSession(): no seeded user with role "${role}" in the current database.`)
  }

  const response = await axios.request<TLoginResponse>({
    method: 'post',
    url: '/auth/login',
    data: { email: seededUser.email, password },
    validateStatus: status => status === 200
  })

  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.data.token)

  return response.data
}
