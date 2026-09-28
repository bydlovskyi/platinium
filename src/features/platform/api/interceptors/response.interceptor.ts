import axios, { type AxiosError, type AxiosResponse } from 'axios'

import { helpers } from '@/utils/helpers'
import { notificationService } from '@/services/notification.service'

class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED'
}

class ValidationFieldError extends Error {
  constructor (readonly fieldErrors: TValidationError) {
    super('The request failed validation.')
  }
}

class DependencyConflictError extends Error {
  readonly entity: string
  readonly count: number

  constructor ({ message, entity, count }: { message: string; entity: string; count: number }) {
    super(message)
    this.entity = entity
    this.count = count
  }
}

// A 409 that isn't a dependency conflict (e.g. DUPLICATE_NAME): has a `code`, no `entity`/`count`.
class ConflictError extends Error {
  readonly code: string

  constructor ({ code, message }: { code?: string; message: string }) {
    super(message)
    this.code = code ?? 'CONFLICT'
  }
}

// 403 is a permission failure, not a session failure: notify but never sign out.
class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'
}

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

// A 401 here is a rejected credential, not an expired session: surface the server message, don't publish sessionExpired.
const LOGIN_PATH = '/auth/login'

// Unwraps the body: the client's augmented types (`dts/axios.d.ts`) already describe the body, not the envelope.
const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
  return response.data as AxiosResponse
}

function shouldNotify (error: AxiosError): boolean {
  return error.config?.showNotification !== false
}

function errorResponseBody (error: AxiosError): TErrorResponse | undefined {
  return error.response?.data as TErrorResponse | undefined
}

const errorInterceptor = (error: AxiosError): Promise<never> => {
  // Aborted requests (e.g. superseded searches) are not errors: no toast.
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return Promise.reject(error)
  }

  const status = error.response?.status

  if (status === HTTP_STATUS.unauthorized && error.config?.url === LOGIN_PATH) {
    const message = errorResponseBody(error)?.message ?? GENERIC_ERROR_MESSAGE

    return Promise.reject(new Error(message))
  }

  if (status === HTTP_STATUS.unauthorized) {
    // Published instead of redirecting so this module stays ignorant of the router/store.
    helpers.eventEmitter.publish('sessionExpired', { message: SESSION_EXPIRED_MESSAGE })

    return Promise.reject(new SessionExpiredError(SESSION_EXPIRED_MESSAGE))
  }

  if (status === HTTP_STATUS.forbidden) {
    const message = errorResponseBody(error)?.message ?? FORBIDDEN_MESSAGE

    if (shouldNotify(error)) {
      notificationService.error({ message })
    }

    return Promise.reject(new ForbiddenError(message))
  }

  if (status === HTTP_STATUS.badRequest) {
    // No global toast: forms map field errors onto their inputs.
    const fieldErrors: TValidationError = errorResponseBody(error)?.errors ?? {}

    return Promise.reject(new ValidationFieldError(fieldErrors))
  }

  if (status === HTTP_STATUS.conflict) {
    // No global toast: call sites render their own message.
    const body = errorResponseBody(error) as TErrorResponse | TDependencyConflict | undefined
    const message = body?.message ?? GENERIC_ERROR_MESSAGE

    if (isDependencyConflictBody(body)) {
      return Promise.reject(new DependencyConflictError({ message, entity: body.entity, count: body.count }))
    }

    return Promise.reject(new ConflictError({ code: body?.code, message }))
  }

  if (status !== undefined) {
    const message = errorResponseBody(error)?.message ?? GENERIC_ERROR_MESSAGE

    if (shouldNotify(error)) {
      notificationService.error({ message })
    }

    return Promise.reject(new Error(message))
  }

  // No response: network failure or timeout; raw axios messages aren't user-readable.
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
