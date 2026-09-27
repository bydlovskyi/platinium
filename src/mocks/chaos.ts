// Every `path` is an MSW route pattern (e.g. `'/events/:id'`), not a concrete request URL.

interface IForcedFailure {
  status: number
}

const DEFAULT_DEVELOPMENT_LATENCY_MS = 400
const DEFAULT_TEST_LATENCY_MS = 0

let latencyMs = import.meta.env.MODE === 'test' ? DEFAULT_TEST_LATENCY_MS : DEFAULT_DEVELOPMENT_LATENCY_MS

const oneShotFailuresByPath = new Map<string, IForcedFailure>()

const persistentFailuresByPath = new Map<string, IForcedFailure>()

function setLatency (milliseconds: number): void {
  latencyMs = Math.max(milliseconds, 0)
}

function getLatency (): number {
  return latencyMs
}

function failNextRequest ({ path, status }: { path: string; status: number }): void {
  oneShotFailuresByPath.set(path, { status })
}

function failPersistently ({ path, status }: { path: string; status: number }): void {
  persistentFailuresByPath.set(path, { status })
}

function clearPersistentFailure (path: string): void {
  persistentFailuresByPath.delete(path)
}

function clearChaos (): void {
  oneShotFailuresByPath.clear()
  persistentFailuresByPath.clear()
  latencyMs = import.meta.env.MODE === 'test' ? DEFAULT_TEST_LATENCY_MS : DEFAULT_DEVELOPMENT_LATENCY_MS
}

// One-shot wins over persistent so a test can force a single failure on a persistently broken path.
function consumeForcedFailure (path: string): IForcedFailure | undefined {
  const oneShot = oneShotFailuresByPath.get(path)

  if (oneShot !== undefined) {
    oneShotFailuresByPath.delete(path)

    return oneShot
  }

  return persistentFailuresByPath.get(path)
}

export const chaos = {
  setLatency,
  getLatency,
  failNextRequest,
  failPersistently,
  clearPersistentFailure,
  clearChaos,
  consumeForcedFailure
}
