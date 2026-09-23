import type { HttpHandler } from 'msw'

import { authHandlers } from './auth'
import { categoryHandlers } from './categories'
import { eventHandlers } from './events'
import { healthHandlers } from './health'
import { ticketHandlers } from './tickets'

/**
 * The production handler list: every route the mock backend actually
 * serves, shared verbatim by the browser worker (`src/mocks/browser.ts`)
 * and the Node server (`src/mocks/server.ts`) so both environments answer
 * requests identically.
 *
 * `/health`, the `/auth/*` paths, `/events`, `/categories` and `/tickets`
 * are registered here.
 */
export const handlers: HttpHandler[] = [
  ...healthHandlers,
  ...authHandlers,
  ...eventHandlers,
  ...categoryHandlers,
  ...ticketHandlers
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
