import { setupWorker } from 'msw/browser'

import { chaos } from './chaos'
import { handlers } from './handlers'

/**
 * Browser MSW worker, built from the exact same handler list the Node
 * server uses (`src/mocks/server.ts`), so development and the integration
 * suite answer requests identically.
 *
 * Started from `src/main.ts`, guarded behind `import.meta.env.DEV` so the
 * worker never registers in a production build.
 */
export const worker = setupWorker(...handlers)

/**
 * Debug surface for the chaos controls, reachable from the browser console
 * in development only. Chosen over a UI panel or a query-string protocol as
 * the simplest reasonable option: it needs no extra component, no route and
 * no bundle cost in production (this module is never imported outside a
 * `DEV`-guarded call in `main.ts`), while still letting a developer force a
 * failure interactively — `window.__mockChaos.failNextRequest({ path:
 * '/events', status: 500 })` — while exercising the running app. The
 * `window.__mockChaos` type is declared globally in `dts/global.d.ts`.
 *
 * `path` is the route pattern the handler was registered under, not the URL
 * in the address bar: the list and create routes live at `/events`, while
 * read, update and delete all share `/events/:id`. Breaking a single record's
 * fetch therefore means `failNextRequest({ path: '/events/:id', status: 500
 * })`; a concrete `'/events/123'` matches nothing and does nothing.
 */

/** Attaches the chaos debug surface to `window`. Call only when `import.meta.env.DEV` is true. */
export function installChaosDebugSurface (): void {
  window.__mockChaos = chaos
}
