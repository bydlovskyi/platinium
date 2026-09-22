/**
 * Seams for kit helpers that need real infrastructure this slice doesn't
 * build yet. The signatures are locked now so tests written against them
 * don't change call sites once the owning slice fills them in.
 */

/**
 * Resets the mock database and, when given one, seeds it with a specific
 * dataset. Implemented by the mock database slice (#14).
 */
export function resetDatabase<T = unknown> (dataset?: T): never {
  const suffix = dataset === undefined ? '' : ' A dataset was provided but is ignored until then.'

  throw new Error(`resetDatabase() has no implementation yet — it lands with the mock database slice (#14).${suffix}`)
}

/** Implemented by the session and login slice (#19). */
export function seedSession (role: string): never {
  throw new Error(`seedSession() has no implementation yet — it lands with the session and login slice (#19). Requested role: "${role}".`)
}
