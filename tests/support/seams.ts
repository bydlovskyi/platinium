import axios from 'axios'

import { db } from '@/mocks/db/singleton'
import { createSeedDataset, type ISeedDataset, type TUserRole } from '@/mocks/db'
import { AUTH_TOKEN_STORAGE_KEY } from '@/features/platform/api/auth-token'

export function resetDatabase<T extends ISeedDataset = ISeedDataset> (dataset?: T): void {
  db.reset(dataset)
}

// No records, but the seeded accounts stay: writes need a real session, so a test can still sign in.
export function emptyDataset (): ISeedDataset {
  return { events: [], categories: [], tickets: [], users: createSeedDataset().users }
}

const SEEDED_PASSWORD_BY_ROLE: Record<TUserRole, string> = {
  admin: 'admin123',
  viewer: 'viewer123'
}

// Logs in through the real /auth/login handler so the token can't drift from a genuine sign-in.
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
