import axios from 'axios'

import { db } from '@/mocks/db/singleton'
import { AUTH_TOKEN_STORAGE_KEY } from '@/features/platform/api/auth-token'
import type { ISeedDataset, TUserRole } from '@/mocks/db'

export function resetDatabase<T extends ISeedDataset = ISeedDataset> (dataset?: T): void {
  db.reset(dataset)
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
