/**
 * Seams for kit helpers that need real infrastructure this slice doesn't
 * build yet. The signatures are locked now so tests written against them
 * don't change call sites once the owning slice fills them in.
 */

import { db } from '@/mocks/db/singleton'
import type { ISeedDataset } from '@/mocks/db'

/**
 * Resets the shared mock database (`src/mocks/db`) back to its deterministic
 * seed, or to a given dataset override when one is provided. Call this
 * between tests that mutate the database so each test starts from a known,
 * independent state.
 */
export function resetDatabase<T extends ISeedDataset = ISeedDataset> (dataset?: T): void {
  db.reset(dataset)
}

/** Implemented by the session and login slice (#19). */
export function seedSession (role: string): never {
  throw new Error(`seedSession() has no implementation yet — it lands with the session and login slice (#19). Requested role: "${role}".`)
}
