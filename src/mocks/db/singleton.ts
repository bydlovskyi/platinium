import { createDatabase, type IMockDatabase } from './database'

/**
 * The one mock database instance shared by the whole app: MSW handlers
 * (slice #15) query and mutate it, the persistence adapter hydrates and
 * flushes it, and `resetDatabase()` in `tests/support/seams.ts` resets it
 * back to the deterministic seed between tests.
 */
export const db: IMockDatabase = createDatabase()
