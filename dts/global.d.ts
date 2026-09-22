/* eslint-disable @typescript-eslint/naming-convention */

import 'vue-router'

import type { chaos } from '@/mocks/chaos'

declare module 'vue-router' {
  interface RouteMeta {
    // todo: this is just an example. Please setup your own route meta params.
    label?: string
    requireAuth?: boolean
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
