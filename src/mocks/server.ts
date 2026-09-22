import { setupServer } from 'msw/node'

/**
 * Node MSW server used by the integration project and any test that talks
 * to the API client. Built with the same handler modules the browser worker
 * uses, so a passing test means the real request/response shape is exercised.
 *
 * No handlers exist yet — the contract and mock-backend slices (#13-#15)
 * register them here. Until then the server intercepts nothing and every
 * request that reaches it is unhandled, which `tests/setup.ts` turns into a
 * hard failure rather than a silent pass-through.
 */
export const server = setupServer()
