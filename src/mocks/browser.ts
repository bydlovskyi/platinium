import { setupWorker } from 'msw/browser'

import { chaos } from './chaos'
import { handlers } from './handlers'

// Vite serves modules and assets from these paths; HMR refetches them (`?t=…`) through the worker.
const DEV_SERVER_PATH_PREFIXES = ['/src/', '/node_modules/', '/@']

export const worker = setupWorker(...handlers)

export function warnOnUnhandledApiRequest (request: Request, print: { warning: () => void }): void {
  const url = new URL(request.url)
  const isDevServerFile = url.origin === window.location.origin && (
    DEV_SERVER_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix)) || /\.\w+$/.test(url.pathname)
  )

  if (!isDevServerFile) {
    print.warning()
  }
}

/** Dev only. Chaos `path` args are MSW route patterns (`'/events/:id'`); a concrete `'/events/123'` matches nothing. */
export function installChaosDebugSurface (): void {
  window.__mockChaos = chaos
}
