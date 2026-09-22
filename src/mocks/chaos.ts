/**
 * Chaos controls for the mock backend: configurable latency, forcing a
 * status code on the next request to a path (one-shot), and making a path
 * fail persistently until cleared.
 *
 * Every `path` here is the handler's *route pattern* as registered with MSW,
 * not a concrete request URL: the factory keys collection routes under
 * `/events` and item routes under `/events/:id`, so forcing a failure on a
 * single record means passing `'/events/:id'` — a concrete `'/events/123'`
 * matches no handler and is silently ignored.
 *
 * This module is the single source of truth every handler built by
 * `src/mocks/handlers/factory.ts` consults before answering a request (see
 * `withChaos` there). It is plain, synchronous, in-memory state — no MSW, no
 * Vue — so it is unit-testable in isolation and safely importable both from
 * test files (`import { chaos } from '@/mocks/chaos'`) and from the browser
 * debug surface wired up in `src/mocks/browser.ts`.
 */

/** A forced failure: the status code a matching request should answer with. */
interface IForcedFailure {
  status: number
}

const DEFAULT_DEVELOPMENT_LATENCY_MS = 400
const DEFAULT_TEST_LATENCY_MS = 0

let latencyMs = import.meta.env.MODE === 'test' ? DEFAULT_TEST_LATENCY_MS : DEFAULT_DEVELOPMENT_LATENCY_MS

/** One-shot: consumed and removed the first time a matching request is answered. */
const oneShotFailuresByPath = new Map<string, IForcedFailure>()

/** Persistent: stays in effect until explicitly cleared. */
const persistentFailuresByPath = new Map<string, IForcedFailure>()

/** Sets the simulated latency (in milliseconds) applied to every mock response. */
function setLatency (milliseconds: number): void {
  latencyMs = Math.max(milliseconds, 0)
}

/** The currently configured simulated latency, in milliseconds. */
function getLatency (): number {
  return latencyMs
}

/** Forces the next request to `path` (a route pattern, e.g. `/events` or `/events/:id`) to answer with `status`. Consumed after one match. */
function failNextRequest ({ path, status }: { path: string; status: number }): void {
  oneShotFailuresByPath.set(path, { status })
}

/** Makes every request to `path` (a route pattern, e.g. `/events` or `/events/:id`) answer with `status` until {@link clearChaos} or {@link clearPersistentFailure} runs. */
function failPersistently ({ path, status }: { path: string; status: number }): void {
  persistentFailuresByPath.set(path, { status })
}

/** Clears a single persistent failure for `path`, leaving other paths and one-shot failures untouched. */
function clearPersistentFailure (path: string): void {
  persistentFailuresByPath.delete(path)
}

/** Clears every forced failure (one-shot and persistent) and resets latency to its environment default. */
function clearChaos (): void {
  oneShotFailuresByPath.clear()
  persistentFailuresByPath.clear()
  latencyMs = import.meta.env.MODE === 'test' ? DEFAULT_TEST_LATENCY_MS : DEFAULT_DEVELOPMENT_LATENCY_MS
}

/**
 * Looks up (and, for a one-shot match, consumes) the forced failure that
 * applies to `path`. A one-shot failure takes precedence over a persistent
 * one for the same path, so a test can force a single failure through an
 * otherwise-persistently-broken path.
 */
function consumeForcedFailure (path: string): IForcedFailure | undefined {
  const oneShot = oneShotFailuresByPath.get(path)

  if (oneShot !== undefined) {
    oneShotFailuresByPath.delete(path)

    return oneShot
  }

  return persistentFailuresByPath.get(path)
}

/**
 * Programmatic chaos-control surface. Imported directly by tests
 * (`import { chaos } from '@/mocks/chaos'`) and re-exposed read/write on
 * `window` in development only by `src/mocks/browser.ts`.
 */
export const chaos = {
  setLatency,
  getLatency,
  failNextRequest,
  failPersistently,
  clearPersistentFailure,
  clearChaos,
  consumeForcedFailure
}
