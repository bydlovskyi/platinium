import type { HttpHandler } from 'msw'

import { authHandlers } from './auth'
import { healthHandlers } from './health'

/**
 * The production handler list: every route the mock backend actually
 * serves, shared verbatim by the browser worker (`src/mocks/browser.ts`)
 * and the Node server (`src/mocks/server.ts`) so both environments answer
 * requests identically.
 *
 * `/health` and the `/auth/*` paths are registered here today. Entity paths
 * (`/events`, `/categories`, `/tickets`) are declared by their own
 * dedicated contract slices (#25, #29, #31), which call
 * `createEntityHandlers` from `src/mocks/handlers/factory.ts` and append
 * their handlers to this array — this slice does not pre-empt that work.
 */
export const handlers: HttpHandler[] = [
  ...healthHandlers,
  ...authHandlers
]

export { createEntityHandlers } from './factory'
export type {
  IEntityFieldDeclaration,
  IEntityHandlerOptions,
  TConflictCheck
} from './factory'

export { requireAuth } from './auth'
