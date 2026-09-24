import type { HttpHandler } from 'msw'

import { authHandlers } from './auth'
import { categoryHandlers } from './categories'
import { dashboardHandlers } from './dashboard'
import { eventHandlers } from './events'
import { healthHandlers } from './health'
import { ticketHandlers } from './tickets'

/**
 * The production handler list: every route the mock backend actually
 * serves, shared verbatim by the browser worker (`src/mocks/browser.ts`)
 * and the Node server (`src/mocks/server.ts`) so both environments answer
 * requests identically.
 *
 * `/health`, the `/auth/*` paths, `/dashboard/stats`, `/events`,
 * `/categories` and `/tickets` (including their `/bulk` endpoints) are
 * registered here.
 */
export const handlers: HttpHandler[] = [
  ...healthHandlers,
  ...authHandlers,
  ...dashboardHandlers,
  ...eventHandlers,
  ...categoryHandlers,
  ...ticketHandlers
]

export { createBulkHandler, createEntityHandlers } from './factory'
export type {
  TBulkApplier,
  IBulkFailureReason,
  IBulkHandlerOptions,
  ICodedConflict,
  IEntityFieldDeclaration,
  IEntityHandlerOptions,
  IStructuredConflict,
  IValidateContext,
  TConflictCheck
} from './factory'

export { NEARLY_SOLD_OUT_MAX_QUANTITY } from './dashboard'

export { requireAuth, requireWriteAccess } from './auth'
