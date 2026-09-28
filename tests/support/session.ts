import { seedSession } from './seams'

// Signs in as a seeded user through the real login and `/auth/me` handlers, so the store holds exactly
// what a browser session would.
export async function signInAs (role: TUserRole): Promise<void> {
  await seedSession(role)
  await useAuthStore().restore()
}
