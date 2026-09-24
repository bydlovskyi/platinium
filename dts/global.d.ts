/* eslint-disable @typescript-eslint/naming-convention */

import 'vue-router'

import type { chaos } from '@/mocks/chaos'
import type { ICapability } from '@/composables/useCapability'

declare module 'vue-router' {
  interface RouteMeta {
    label?: string
    /** Route requires an authenticated session; unauthenticated visitors are redirected to login (`src/router/route-guard.ts`). */
    requiresAuth?: boolean
    /** Route requires the visitor to be anonymous; authenticated users are redirected to home (`src/router/route-guard.ts`). */
    requiresAnonymous?: boolean
    /**
     * Which frame (`src/layouts/`) the route is rendered inside, resolved by
     * `src/App.vue` — a page component never imports a layout directly.
     * Defaults to `'admin'` when omitted (see `App.vue`).
     */
    layout?: 'auth' | 'admin'
    /**
     * Entity-and-operation pair (`src/composables/useCapability.ts`) an
     * authenticated visitor must be able to perform to view this route —
     * e.g. `{ entity: 'events', operation: 'create' }` on `eventCreate`. A
     * signed-in user who fails this check is redirected to
     * `routeNames.forbidden` by `src/router/route-guard.ts`. Omitted on
     * every read-only list/detail route.
     */
    requiredCapability?: ICapability
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
