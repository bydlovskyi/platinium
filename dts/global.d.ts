/* eslint-disable @typescript-eslint/naming-convention */

import 'vue-router'

import type { chaos } from '@/mocks/chaos'

declare module 'vue-router' {
  interface RouteMeta {
    label?: string
    /** Route requires an authenticated session; unauthenticated visitors are redirected to login (`src/router/route-guard.ts`). */
    requiresAuth?: boolean
    /** Route requires the visitor to be anonymous; authenticated users are redirected to home (`src/router/route-guard.ts`). */
    requiresAnonymous?: boolean
  }
}

// TODO: Here you define you global vue definitions. Uncomment if needed
// declare module 'vue' {
// interface ComponentCustomProperties {
// }
// }

declare global {
  interface Window {
    /**
     * Chaos-controls debug surface, attached only in development by
     * `installChaosDebugSurface()` in `src/mocks/browser.ts`. Undefined in
     * production and under test.
     */
    __mockChaos?: typeof chaos
  }
}

export { }
