export function parseDynamicKeys (url: string, dynamicKeys?: Record<string, string | number>): string {
  const regex = /\{([^}]+)\}/g

  const replacedUrl = url.replace(regex, (match: string, key: string) => {
    if (dynamicKeys?.[key]) {
      return dynamicKeys[key]?.toString() || match
    }
    return match
  })

  return replacedUrl
}

/**
 * Extra `apiClient` request config applied ONLY under Vitest, for a
 * `responseType: 'blob'` request (the three entity `exportCsv` methods,
 * GitHub issue #40, PRD-007 "CSV export"). Works around a jsdom/MSW
 * test-environment limitation, never a production concern:
 *
 * axios's default adapter resolves to XHR in a browser-like environment.
 * Under Vitest (jsdom) with MSW's Node XHR interceptor, requesting
 * `responseType: 'blob'` through that combination throws a `TypeError` deep
 * in undici's `Response` construction (`object.stream is not a function`) —
 * the identical request succeeds under axios's `fetch` adapter instead, so
 * that adapter is forced here, with `baseURL` falling back to
 * `window.location.origin` because axios's fetch adapter (unlike XHR)
 * resolves a relative URL through Node's own `URL`, which has no document to
 * resolve against.
 *
 * This must stay test-only: axios's `fetch` adapter in the installed version
 * drops `error.response` on any non-2xx status (`fetch.js`'s catch block
 * re-wraps the already-correct, settle()-rejected `AxiosError` via
 * `AxiosError.from(err, err.code, config, request)`, omitting the response
 * argument) — verified live by forcing a failure and inspecting the caught
 * error. Under that adapter every real failure (400/403/409/500) would
 * misreport through the response interceptor as "Unable to reach the
 * server", masking the actual error. A real browser's default XHR adapter
 * has no such defect and handles `responseType: 'blob'` natively, so this
 * override must never reach a production build.
 *
 * Takes the caller's own `apiClient.defaults.baseURL` rather than importing
 * `apiClient` here (`./client.ts`'s own interceptor chain already imports
 * `parseDynamicKeys` from this file — importing `apiClient` back would be a
 * circular module dependency).
 */
export function blobExportTestOverrides (currentBaseUrl: string | undefined): { adapter: 'fetch'; baseURL: string } | Record<string, never> {
  if (import.meta.env.MODE !== 'test') {
    return {}
  }

  return {
    adapter: 'fetch',
    baseURL: currentBaseUrl ?? window.location.origin
  }
}
