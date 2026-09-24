import axios, { type AxiosError, type AxiosResponse } from 'axios'

import { helpers } from '@/utils/helpers'
import { notificationService } from '@/services/notification.service'

/**
 * Rejection reason for a 401. An `Error` subclass (rather than a plain
 * object) so every rejection this interceptor produces stays a real `Error`
 * — satisfies `@typescript-eslint/prefer-promise-reject-errors` — while
 * still carrying a `code` a caller or the future #19 subscriber can branch
 * on without depending on this module's internals.
 */
class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED'
}

/**
 * Rejection reason for a 400. An `Error` subclass carrying the parsed
 * per-field message map so a form can attach each message to its input
 * (`error.fieldErrors`) while the rejection itself stays a real `Error`.
 */
class ValidationFieldError extends Error {
  constructor (readonly fieldErrors: TValidationError) {
    super('The request failed validation.')
  }
}

/**
 * Rejection reason for a 409 (`DependencyConflict`, PRD-004 "Deletion"). An
 * `Error` subclass carrying the blocking dependent entity's type and count
 * so a caller (e.g. an event delete) can render its own actionable message
 * — "3 tickets reference this event…" — instead of the generic toast this
 * status would otherwise get. Mirrors `ValidationFieldError`'s shape for the
 * same reason: the rejection itself stays a real `Error`.
 */
class DependencyConflictError extends Error {
  readonly entity: string
  readonly count: number

  constructor ({ message, entity, count }: { message: string; entity: string; count: number }) {
    super(message)
    this.entity = entity
    this.count = count
  }
}

/**
 * Rejection reason for a 409 whose body is NOT a `DependencyConflict` (PRD-005
 * "Uniqueness" — a category name collision has no blocking dependent
 * record, just a clash with another record of the same collection). The
 * mock's `conflictBody()` (`src/mocks/handlers/factory.ts`) returns this
 * shape — `{ code, message }`, no `entity`/`count` — for any
 * `ICodedConflict`, e.g. `{ code: 'DUPLICATE_NAME', message: '...' }`
 * (`src/mocks/handlers/categories.ts`'s `checkDuplicateName`). Distinct from
 * `DependencyConflictError` so a caller can tell "this clashes with another
 * record" apart from "other records depend on this one" without inspecting
 * an empty `entity`/zero `count` as a proxy for "not actually a dependency
 * conflict".
 */
class ConflictError extends Error {
  readonly code: string

  constructor ({ code, message }: { code?: string; message: string }) {
    super(message)
    this.code = code ?? 'CONFLICT'
  }
}

/**
 * Rejection reason for a 403 (PRD-007 permissions). A permission failure, NOT
 * a session failure: the caller is authenticated but their role (a `viewer`)
 * may not perform this write. Distinct from `SessionExpiredError` so the 403
 * branch below can notify WITHOUT signing the user out — there is nothing
 * wrong with the session, only with the attempted action. An `Error` subclass
 * for the same reason the others are: the rejection stays a real `Error`.
 */
class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'
}

/** Narrows a 409 body to the `DependencyConflict` shape — present iff both `entity` and `count` are on the payload. */
function isDependencyConflictBody (
  body: TErrorResponse | TDependencyConflict | undefined
): body is TDependencyConflict {
  return body !== undefined && 'entity' in body && 'count' in body
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'
const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action.'
const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check your connection and try again.'
const TIMEOUT_MESSAGE = 'The request took too long to respond. Please try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409
} as const

/**
 * A 401 from this endpoint is a rejected credential, not an expired
 * session — there is no session yet to expire. Excluded from the generic
 * 401 handling below so a bad login attempt surfaces the mock's actual
 * per-request message ("Email or password is incorrect.") instead of the
 * generic session-expiry copy, and does not publish `sessionExpired` (issue
 * #19's login form has nothing to sign out of).
 */
const LOGIN_PATH = '/auth/login'

const responseInterceptor = (response: AxiosResponse): Promise<AxiosResponse> => {
  return response.data
}

/** Whether the global toast should be shown for this request. Defaults to `true` when the per-request flag is unset. */
function shouldNotify (error: AxiosError): boolean {
  return error.config?.showNotification !== false
}

function errorResponseBody (error: AxiosError): TErrorResponse | undefined {
  return error.response?.data as TErrorResponse | undefined
}

const errorInterceptor = (error: AxiosError): Promise<never> => {
  // Aborted requests are not errors — a fast-typing administrator cancels
  // in-flight requests constantly (issue #20). Swallow silently: no
  // notification, reject with an inert reason nobody renders.
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return Promise.reject(error)
  }

  const status = error.response?.status

  if (status === HTTP_STATUS.unauthorized && error.config?.url === LOGIN_PATH) {
    const message = errorResponseBody(error)?.message ?? GENERIC_ERROR_MESSAGE

    return Promise.reject(new Error(message))
  }

  if (status === HTTP_STATUS.unauthorized) {
    // The auth store (issue #19) subscribes to clear the session and
    // navigate to login. Publish a typed event instead of redirecting
    // directly, keeping this module ignorant of the router/store.
    helpers.eventEmitter.publish('sessionExpired', { message: SESSION_EXPIRED_MESSAGE })

    return Promise.reject(new SessionExpiredError(SESSION_EXPIRED_MESSAGE))
  }

  if (status === HTTP_STATUS.forbidden) {
    // A permission failure, not a session failure (PRD-007): the caller is
    // authenticated but their role may not perform this write. Notify through
    // the same pathway as any other error toast, but do NOT sign the user out
    // — no `sessionExpired` event, no touching the 401 branch above. Prefer
    // the mock's actual per-request message where present.
    const message = errorResponseBody(error)?.message ?? FORBIDDEN_MESSAGE

    if (shouldNotify(error)) {
      notificationService.error({ message })
    }

    return Promise.reject(new ForbiddenError(message))
  }

  if (status === HTTP_STATUS.badRequest) {
    // Rejects with the parsed field-error map so a form can attach each
    // message to its input — no global toast for validation failures.
    const fieldErrors: TValidationError = errorResponseBody(error)?.errors ?? {}

    return Promise.reject(new ValidationFieldError(fieldErrors))
  }

  if (status === HTTP_STATUS.conflict) {
    // Rejects with a typed conflict reason so a call site can render its own
    // actionable message — no global toast, same reasoning as the 400
    // branch above. A body carrying both `entity` and `count` is a
    // `DependencyConflict` (PRD-004 "Deletion"); anything else is a coded,
    // non-dependency conflict (PRD-005 "Uniqueness", e.g. a duplicate name)
    // and must NOT be forced into `DependencyConflictError`'s shape — doing
    // so would report a misleading `entity: ''`/`count: 0` and give the
    // caller no `code` to branch on.
    const body = errorResponseBody(error) as TErrorResponse | TDependencyConflict | undefined
    const message = body?.message ?? GENERIC_ERROR_MESSAGE

    if (isDependencyConflictBody(body)) {
      return Promise.reject(new DependencyConflictError({ message, entity: body.entity, count: body.count }))
    }

    return Promise.reject(new ConflictError({ code: body?.code, message }))
  }

  if (status !== undefined) {
    // 404, 500 (and any other status the contract returns): toast a
    // human-readable message, then reject.
    const message = errorResponseBody(error)?.message ?? GENERIC_ERROR_MESSAGE

    if (shouldNotify(error)) {
      notificationService.error({ message })
    }

    return Promise.reject(new Error(message))
  }

  // No `error.response` at all: a network failure or a client-side timeout.
  // Raw axios messages ("Network Error", "timeout of 5000ms exceeded") are
  // not intelligible to an administrator — replace with a distinct message.
  const message = error.code === 'ECONNABORTED' ? TIMEOUT_MESSAGE : NETWORK_ERROR_MESSAGE

  if (shouldNotify(error)) {
    notificationService.error({ message })
  }

  return Promise.reject(new Error(message))
}

export {
  responseInterceptor,
  errorInterceptor,
  SessionExpiredError,
  ForbiddenError,
  ValidationFieldError,
  DependencyConflictError,
  ConflictError
}
