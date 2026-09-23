import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { parseDynamicKeys } from '../helpers'
import { getPersistedAuthToken } from '../auth-token'

/**
 * Attaches the persisted bearer token (see `../auth-token.ts`) to every
 * outgoing request, unless the caller already set an explicit
 * `Authorization` header on this request — that override always wins. No
 * auth store exists yet (it lands in issue #19), so the token is read
 * directly from `localStorage` rather than from Pinia state: this module
 * sits below the store layer in the dependency direction and must never
 * import one.
 */
const requestInterceptor = (requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (requestConfig.headers && requestConfig.headers.Authorization === undefined) {
    const token = getPersistedAuthToken()

    if (token !== null) {
      requestConfig.headers.Authorization = `Bearer ${token}`
    }
  }

  if (requestConfig.url) {
    requestConfig.url = parseDynamicKeys(requestConfig.url, requestConfig.dynamicKeys as TIndexedObject | undefined)
  }

  return requestConfig
}

const requestErrorInterceptor = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error)
}

export {
  requestInterceptor,
  requestErrorInterceptor
}
