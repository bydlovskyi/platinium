import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

import { helpers } from '@/utils/helpers'

import { errorInterceptor, responseInterceptor, SessionExpiredError, ValidationFieldError, DependencyConflictError } from './response.interceptor'

const { notifySuccess, notifyError, notifyWarning, notifyInfo } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
  notifyInfo: vi.fn()
}))

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    success: notifySuccess,
    error: notifyError,
    warning: notifyWarning,
    info: notifyInfo
  }
}))

function buildConfig (overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return { headers: {}, ...overrides } as InternalAxiosRequestConfig
}

function buildError ({
  status,
  data,
  code,
  message = 'Request failed',
  config = buildConfig()
}: {
  status?: number
  data?: unknown
  code?: string
  message?: string
  config?: InternalAxiosRequestConfig
}): AxiosError {
  const error = new Error(message) as AxiosError
  error.isAxiosError = true
  error.config = config
  error.code = code
  error.toJSON = () => ({})

  if (status !== undefined) {
    error.response = {
      status,
      data,
      statusText: '',
      headers: {},
      config
    } as AxiosResponse
  }

  return error
}

describe('responseInterceptor', () => {
  it('normalises a successful response to its payload', () => {
    const response = { data: { ok: true } } as AxiosResponse

    expect(responseInterceptor(response)).toEqual({ ok: true })
  })
})

describe('errorInterceptor', () => {
  afterEach(() => vi.clearAllMocks())

  describe('abort', () => {
    it('swallows a canceled request silently — no notification, rejects with an inert reason', async () => {
      const error = buildError({ code: 'ERR_CANCELED', message: 'canceled' })

      await expect(errorInterceptor(error)).rejects.toBeDefined()

      expect(notifyError).not.toHaveBeenCalled()
      expect(notifyWarning).not.toHaveBeenCalled()
      expect(notifyInfo).not.toHaveBeenCalled()
      expect(notifySuccess).not.toHaveBeenCalled()
    })
  })

  describe('401', () => {
    it('publishes sessionExpired, rejects with a SessionExpiredError, and raises no generic toast', async () => {
      const listener = vi.fn()
      const subscription = helpers.eventEmitter.listen('sessionExpired', listener)

      const error = buildError({ status: 401, data: { code: 'UNAUTHORIZED', message: 'Session expired.' } })

      await expect(errorInterceptor(error)).rejects.toBeInstanceOf(SessionExpiredError)

      expect(listener).toHaveBeenCalledOnce()
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))
      expect(notifyError).not.toHaveBeenCalled()

      subscription.remove()
    })
  })

  describe('400', () => {
    it('rejects with a ValidationFieldError carrying the parsed field-error map and raises no toast', async () => {
      const fieldErrors = { name: 'Name is required.' }
      const error = buildError({
        status: 400,
        data: { code: 'VALIDATION_ERROR', message: 'The request failed validation.', errors: fieldErrors }
      })

      await expect(errorInterceptor(error)).rejects.toBeInstanceOf(ValidationFieldError)

      try {
        await errorInterceptor(error)
      } catch (rejected) {
        expect((rejected as ValidationFieldError).fieldErrors).toEqual(fieldErrors)
      }

      expect(notifyError).not.toHaveBeenCalled()
    })

    it('rejects with an empty map when the server sends no field errors', async () => {
      const error = buildError({ status: 400, data: { code: 'VALIDATION_ERROR', message: 'Bad request.' } })

      try {
        await errorInterceptor(error)
        expect.unreachable()
      } catch (rejected) {
        expect((rejected as ValidationFieldError).fieldErrors).toEqual({})
      }
    })
  })

  describe.each([404, 500])('%i', (status) => {
    it('toasts a human-readable message and rejects', async () => {
      const error = buildError({ status, data: { code: 'X', message: 'Human readable message.' } })

      await expect(errorInterceptor(error)).rejects.toBeDefined()

      expect(notifyError).toHaveBeenCalledOnce()
      expect(notifyError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Human readable message.' }))
    })

    it('respects showNotification: false — skips the toast but still rejects', async () => {
      const config = buildConfig({ showNotification: false })
      const error = buildError({ status, data: { code: 'X', message: 'Human readable message.' }, config })

      await expect(errorInterceptor(error)).rejects.toBeDefined()

      expect(notifyError).not.toHaveBeenCalled()
    })

    it('rejects with a plain Error, not a DependencyConflictError', async () => {
      const error = buildError({ status, data: { code: 'X', message: 'Human readable message.' } })

      try {
        await errorInterceptor(error)
        expect.unreachable()
      } catch (rejected) {
        expect(rejected).toBeInstanceOf(Error)
        expect(rejected).not.toBeInstanceOf(DependencyConflictError)
      }
    })
  })

  describe('409', () => {
    it('rejects with a DependencyConflictError carrying the parsed entity/count and raises no generic toast (PRD-004 "Deletion")', async () => {
      const error = buildError({
        status: 409,
        data: { code: 'CONFLICT', message: '3 tickets reference this event.', entity: 'ticket', count: 3 }
      })

      await expect(errorInterceptor(error)).rejects.toBeInstanceOf(DependencyConflictError)

      try {
        await errorInterceptor(error)
        expect.unreachable()
      } catch (rejected) {
        const conflict = rejected as DependencyConflictError
        expect(conflict.message).toBe('3 tickets reference this event.')
        expect(conflict.entity).toBe('ticket')
        expect(conflict.count).toBe(3)
      }

      expect(notifyError).not.toHaveBeenCalled()
    })

    it('defaults entity to an empty string and count to 0 when the server omits them', async () => {
      const error = buildError({ status: 409, data: { code: 'CONFLICT', message: 'Cannot delete.' } })

      try {
        await errorInterceptor(error)
        expect.unreachable()
      } catch (rejected) {
        const conflict = rejected as DependencyConflictError
        expect(conflict.entity).toBe('')
        expect(conflict.count).toBe(0)
      }
    })

    it('still rejects with a DependencyConflictError when showNotification: false is set (there is no toast to suppress)', async () => {
      const config = buildConfig({ showNotification: false })
      const error = buildError({
        status: 409,
        data: { code: 'CONFLICT', message: '1 ticket references this event.', entity: 'ticket', count: 1 },
        config
      })

      await expect(errorInterceptor(error)).rejects.toBeInstanceOf(DependencyConflictError)
      expect(notifyError).not.toHaveBeenCalled()
    })
  })

  describe('network failure', () => {
    it('produces a distinct, intelligible message and toasts it', async () => {
      const error = buildError({ code: 'ERR_NETWORK', message: 'Network Error' })

      await expect(errorInterceptor(error)).rejects.toBeDefined()

      expect(notifyError).toHaveBeenCalledOnce()
      const [payload] = notifyError.mock.lastCall ?? []
      expect(payload?.message).not.toBe('Network Error')
      expect(payload?.message.length).toBeGreaterThan(0)
    })

    it('respects showNotification: false', async () => {
      const config = buildConfig({ showNotification: false })
      const error = buildError({ code: 'ERR_NETWORK', message: 'Network Error', config })

      await expect(errorInterceptor(error)).rejects.toBeDefined()

      expect(notifyError).not.toHaveBeenCalled()
    })
  })

  describe('timeout', () => {
    it('produces a distinct, intelligible message and toasts it', async () => {
      const error = buildError({ code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' })

      await expect(errorInterceptor(error)).rejects.toBeDefined()

      expect(notifyError).toHaveBeenCalledOnce()
      const [payload] = notifyError.mock.lastCall ?? []
      expect(payload?.message).not.toBe('timeout of 5000ms exceeded')
      expect(payload?.message.length).toBeGreaterThan(0)
    })
  })
})
