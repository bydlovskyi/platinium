import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/**
 * Node MSW server used by the integration project and any test that talks
 * to the API client. Built with the same handler list the browser worker
 * (`src/mocks/browser.ts`) uses, so a passing test means the real
 * request/response shape is exercised.
 *
 * Only handlers actually registered in `src/mocks/handlers/index.ts` answer
 * requests here — an endpoint no handler covers stays unhandled, which
 * `tests/setup.ts` (`onUnhandledRequest: 'error'`) turns into a hard test
 * failure rather than a silent pass-through.
 */
export const server = setupServer(...handlers)
