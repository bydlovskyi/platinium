import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { parseDynamicKeys } from '../helpers'
import { getPersistedAuthToken } from '../auth-token'

// An explicit Authorization header set by the caller wins.
const requestInterceptor = (requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (requestConfig.headers && requestConfig.headers.Authorization === undefined) {
    const token = getPersistedAuthToken()

    if (token !== null) {
      requestConfig.headers.Authorization = `Bearer ${token}`
    }
  }

  if (requestConfig.url) {
    const dynamicKeys = requestConfig.dynamicKeys as Record<string, string | number> | undefined

    requestConfig.url = parseDynamicKeys(requestConfig.url, dynamicKeys)
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
