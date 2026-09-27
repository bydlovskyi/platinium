import { setupWorker } from 'msw/browser'

import { chaos } from './chaos'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/** Dev only. Chaos `path` args are MSW route patterns (`'/events/:id'`); a concrete `'/events/123'` matches nothing. */
export function installChaosDebugSurface (): void {
  window.__mockChaos = chaos
}
