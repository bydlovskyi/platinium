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

// Test-only: jsdom + MSW's XHR interceptor breaks on responseType 'blob', so force the fetch adapter (it needs an absolute baseURL).
// Never in production: this axios version's fetch adapter drops error.response on non-2xx.
// baseURL is passed in because importing apiClient here would be circular.
export function blobExportTestOverrides (currentBaseUrl: string | undefined): { adapter: 'fetch'; baseURL: string } | Record<string, never> {
  if (import.meta.env.MODE !== 'test') {
    return {}
  }

  return {
    adapter: 'fetch',
    baseURL: currentBaseUrl ?? window.location.origin
  }
}
