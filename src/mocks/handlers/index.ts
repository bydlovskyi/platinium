import type { HttpHandler } from 'msw'

import { authHandlers } from './auth'
import { eventHandlers } from './events'
import { healthHandlers } from './health'

/**
 * The production handler list: every route the mock backend actually
 * serves, shared verbatim by the browser worker (`src/mocks/browser.ts`)
 * and the Node server (`src/mocks/server.ts`) so both environments answer
 * requests identically.
 *
 * `/health`, the `/auth/*` paths and `/events` are registered here today.
 * The remaining entity paths (`/categories`, `/tickets`) are declared by
 * their own dedicated contract slices (#29, #31), which call
 * `createEntityHandlers` from `src/mocks/handlers/factory.ts` and append
 * their handlers to this array the same way `eventHandlers` does.
 */
export const handlers: HttpHandler[] = [
  ...healthHandlers,
  ...authHandlers,
  ...eventHandlers
]

export { createEntityHandlers } from './factory'
export type {
  IEntityFieldDeclaration,
  IEntityHandlerOptions,
  IStructuredConflict,
  IValidateContext,
  TConflictCheck
} from './factory'

export { requireAuth } from './auth'
