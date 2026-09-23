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

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'
const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check your connection and try again.'
const TIMEOUT_MESSAGE = 'The request took too long to respond. Please try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
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

  if (status === HTTP_STATUS.badRequest) {
    // Rejects with the parsed field-error map so a form can attach each
    // message to its input — no global toast for validation failures.
    const fieldErrors: TValidationError = errorResponseBody(error)?.errors ?? {}

    return Promise.reject(new ValidationFieldError(fieldErrors))
  }

  if (status === HTTP_STATUS.conflict) {
    // Rejects with the parsed dependent entity/count so a delete call site
    // can render its own actionable message — no global toast, same
    // reasoning as the 400 branch above.
    const body = errorResponseBody(error) as TDependencyConflict | undefined
    const message = body?.message ?? GENERIC_ERROR_MESSAGE
    const entity = body?.entity ?? ''
    const count = body?.count ?? 0

    return Promise.reject(new DependencyConflictError({ message, entity, count }))
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
  ValidationFieldError,
  DependencyConflictError
}
