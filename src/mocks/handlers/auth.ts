import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'
import { db } from '../db/singleton'
import type { IUser } from '../db'

/**
 * `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` — the OpenAPI
 * contract's authentication paths (`src/mocks/openapi.yaml`). Pure MSW
 * wiring over `src/mocks/db`'s `users` collection: token issuance and
 * validation live here, not in any view/store layer (those land with
 * slices #19/#20).
 *
 * The mock token scheme is intentionally trivial: a deterministic string
 * derived from the user id, never a real signed token. There is exactly one
 * seeded user (`src/mocks/db/fixtures.ts`), so this never needs to be more
 * than a lookup key. `IUser.sessionActive` is what makes the token
 * genuinely revocable — `POST /auth/logout` flips it off, so a subsequent
 * request with the same (still well-formed) token is rejected.
 */

const HTTP_STATUS = {
  ok: 200,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401
} as const

const SEEDED_ADMIN_PASSWORD = 'admin123'

const UNAUTHORIZED_MESSAGE = 'Email or password is incorrect.'
const MISSING_TOKEN_MESSAGE = 'The session is absent or invalid.'
const VALIDATION_MESSAGE = 'The request failed validation.'

function errorBody (code: string, message: string, errors?: Record<string, string>): TErrorResponse {
  return errors === undefined ? { code, message } : { code, message, errors }
}

function unauthorizedResponse (message: string = MISSING_TOKEN_MESSAGE): Response {
  return HttpResponse.json(errorBody('UNAUTHORIZED', message), { status: HTTP_STATUS.unauthorized })
}

/** Deterministic mock token for a given user id. Never a real signed token — see the module doc comment. */
function mockTokenFor (userId: string): string {
  return `mock-token-${userId}`
}

/** Strips internal mock bookkeeping (`sessionActive`) down to the `User` schema's public shape. */
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

/**
 * Reads the `Authorization: Bearer <token>` header and resolves it to the
 * matching, currently-active user. Later entity slices reuse this exactly
 * like they reuse `createEntityHandlers` from `./factory` — a single
 * `requireAuth(request)` call at the top of a protected handler.
 *
 * Returns the resolved user on success, or the `401 Response` to return
 * verbatim on failure — missing header, malformed header, a token matching
 * no user, and a token matching a user whose session is no longer active
 * (logged out) are all indistinguishable from the caller's perspective, on
 * purpose: none of them leak whether a token was ever valid.
 */
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

/**
 * Wraps a resolver with the shared chaos behaviour every handler in this
 * module respects uniformly: simulated latency, then a forced status if one
 * is registered against `path` in `src/mocks/chaos.ts`. Mirrors
 * `withChaos` in `./factory.ts` — kept local here rather than exported from
 * there, since the two modules have no other coupling.
 */
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

  if (user === undefined || password !== SEEDED_ADMIN_PASSWORD) {
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
