import type { HttpHandler } from 'msw'

import { authHandlers } from './auth'
import { categoryHandlers } from './categories'
import { eventHandlers } from './events'
import { healthHandlers } from './health'

/**
 * The production handler list: every route the mock backend actually
 * serves, shared verbatim by the browser worker (`src/mocks/browser.ts`)
 * and the Node server (`src/mocks/server.ts`) so both environments answer
 * requests identically.
 *
 * `/health`, the `/auth/*` paths, `/events` and `/categories` are
 * registered here today. The remaining entity paths (`/tickets`) are
 * declared by their own dedicated contract slice (#31), which calls
 * `createEntityHandlers` from `src/mocks/handlers/factory.ts` and appends
 * its handlers to this array the same way `eventHandlers`/`categoryHandlers`
 * do.
 */
export const handlers: HttpHandler[] = [
  ...healthHandlers,
  ...authHandlers,
  ...eventHandlers,
  ...categoryHandlers
]

export { createEntityHandlers } from './factory'
export type {
  ICodedConflict,
  IEntityFieldDeclaration,
  IEntityHandlerOptions,
  IStructuredConflict,
  IValidateContext,
  TConflictCheck
} from './factory'

export { requireAuth } from './auth'
