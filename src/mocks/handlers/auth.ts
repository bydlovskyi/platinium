import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'
import { db } from '../db/singleton'
import type { IUser } from '../db'

// The mock token is derived from the user id; `IUser.sessionActive` is what makes it revocable on logout.

const HTTP_STATUS = {
  ok: 200,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403
} as const

// Passwords live only here, never on `IUser` or in the fixtures.
const SEEDED_PASSWORDS: Record<string, string> = {
  'admin@platinium.test': 'admin123',
  'viewer@platinium.test': 'viewer123'
}

const UNAUTHORIZED_MESSAGE = 'Email or password is incorrect.'
const MISSING_TOKEN_MESSAGE = 'The session is absent or invalid.'
const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action.'
const VALIDATION_MESSAGE = 'The request failed validation.'

function errorBody (code: string, message: string, errors?: Record<string, string>): TErrorResponse {
  return errors === undefined ? { code, message } : { code, message, errors }
}

function unauthorizedResponse (message: string = MISSING_TOKEN_MESSAGE): Response {
  return HttpResponse.json(errorBody('UNAUTHORIZED', message), { status: HTTP_STATUS.unauthorized })
}

function forbiddenResponse (message: string = FORBIDDEN_MESSAGE): Response {
  return HttpResponse.json(errorBody('FORBIDDEN', message), { status: HTTP_STATUS.forbidden })
}

function mockTokenFor (userId: string): string {
  return `mock-token-${userId}`
}

function publicUser (user: IUser): TUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

async function readJsonBody (request: Request): Promise<Partial<Record<string, unknown>>> {
  try {
    const body: unknown = await request.json()

    return typeof body === 'object' && body !== null ? body as Partial<Record<string, unknown>> : {}
  } catch {
    return {}
  }
}

// Every failure returns the same 401 on purpose, so it never leaks whether a token was ever valid.
export function requireAuth (request: Request): { user: IUser } | Response {
  const header = request.headers.get('Authorization')

  if (header === null) {
    return unauthorizedResponse()
  }

  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || token === undefined || token === '') {
    return unauthorizedResponse()
  }

  const user = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data
    .find(candidate => mockTokenFor(candidate.id) === token)

  if (!user?.sessionActive) {
    return unauthorizedResponse()
  }

  return { user }
}

function resolveUser (request: Request): IUser | undefined {
  const authResult = requireAuth(request)

  return authResult instanceof Response ? undefined : authResult.user
}

// Deliberately lets tokenless writes through; only a signed-in viewer is rejected.
// 403 (not 401) so the client notifies without signing the user out.
export function requireWriteAccess (request: Request): Response | undefined {
  const user = resolveUser(request)

  return user !== undefined && user.role !== 'admin' ? forbiddenResponse() : undefined
}

async function withChaos (path: string, resolve: () => Response | Promise<Response>): Promise<Response> {
  const latencyMs = chaos.getLatency()

  if (latencyMs > 0) {
    await delay(latencyMs)
  }

  const forced = chaos.consumeForcedFailure(path)

  if (forced !== undefined) {
    return HttpResponse.json(errorBody('CHAOS_FORCED_FAILURE', 'The mock backend was forced to fail this request.'), { status: forced.status })
  }

  return resolve()
}

const login = http.post('/auth/login', ({ request }) => withChaos('/auth/login', async () => {
  const body = await readJsonBody(request) as Partial<TLoginRequest>
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const fieldErrors: Record<string, string> = {}

  if (email === '') {
    fieldErrors.email = 'Email is required.'
  }

  if (password === '') {
    fieldErrors.password = 'Password is required.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return HttpResponse.json(errorBody('VALIDATION_ERROR', VALIDATION_MESSAGE, fieldErrors), { status: HTTP_STATUS.badRequest })
  }

  const user = db.users.list({ perPage: Number.MAX_SAFE_INTEGER }).data.find(candidate => candidate.email === email)

  if (user === undefined || password === '' || SEEDED_PASSWORDS[user.email] !== password) {
    return unauthorizedResponse(UNAUTHORIZED_MESSAGE)
  }

  const updated = db.users.update(user.id, { sessionActive: true })

  if (updated === undefined) {
    return unauthorizedResponse(UNAUTHORIZED_MESSAGE)
  }

  const response: TLoginResponse = { token: mockTokenFor(updated.id), user: publicUser(updated) }

  return HttpResponse.json(response, { status: HTTP_STATUS.ok })
}))

const logout = http.post('/auth/logout', ({ request }) => withChaos('/auth/logout', () => {
  const authResult = requireAuth(request)

  if (authResult instanceof Response) {
    return Promise.resolve(authResult)
  }

  db.users.update(authResult.user.id, { sessionActive: false })

  return Promise.resolve(new HttpResponse(null, { status: HTTP_STATUS.noContent }))
}))

const me = http.get('/auth/me', ({ request }) => withChaos('/auth/me', () => {
  const authResult = requireAuth(request)

  if (authResult instanceof Response) {
    return Promise.resolve(authResult)
  }

  return Promise.resolve(HttpResponse.json(publicUser(authResult.user), { status: HTTP_STATUS.ok }))
}))

export const authHandlers: HttpHandler[] = [login, logout, me]
