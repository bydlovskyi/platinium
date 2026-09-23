/**
 * Hand-declared domain types for the mock database.
 *
 * These mirror the shapes described in `docs/prd/PRD-001-platform-foundation.md`
 * ("Domain model") and the enum values already declared in `src/mocks/openapi.yaml`
 * (`EventStatus`, `TicketStatus`, `Currency`, `SortOrder`). The entity schemas
 * themselves are not yet part of the OpenAPI contract — they land with slices
 * #25/#29/#31 — so these types are hand-declared here rather than generated, and
 * must be kept in sync with the contract's enum values by hand until then.
 */

/** Lifecycle status of an {@link IEvent}. Mirrors `EventStatus` in `openapi.yaml`. */
export type TEventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

/** Lifecycle status of an {@link ITicket}. Mirrors `TicketStatus` in `openapi.yaml`. */
export type TTicketStatus = 'draft' | 'on_sale' | 'sold_out' | 'archived'

/** Supported ticket currency codes. Mirrors `Currency` in `openapi.yaml`. */
export type TCurrency = 'USD' | 'EUR' | 'GBP'

/** Sort direction for any `sort` query parameter. Mirrors `SortOrder` in `openapi.yaml`. */
export type TSortOrder = 'asc' | 'desc'

/** Role granted to an authenticated user. Mirrors `UserRole` in `openapi.yaml`. */
export type TUserRole = 'admin'

/** An opaque, UUID-shaped identifier. Never assumed sequential or sortable. */
export type TEntityId = string

/**
 * A record shape guaranteed to carry an opaque `id` — the minimal contract
 * required by the collection store, the query engine's sort tiebreaker, and
 * the database wiring alike.
 */
export interface IIdentifiable {
  id: TEntityId
}

/** Fields shared by every domain record. */
export interface IEntityBase extends IIdentifiable {
  createdAt: string
  updatedAt: string
}

/** An event administrators create tickets against. */
export interface IEvent extends IEntityBase {
  name: string
  /** ISO 3166-1 alpha-2 country code, e.g. `US`. */
  country: string
  venue: string
  /** ISO 8601 date string (`YYYY-MM-DD`), no time component. */
  startDate: string
  /** ISO 8601 date string (`YYYY-MM-DD`), no time component. */
  endDate: string
  status: TEventStatus
}

/** A ticket category, shared across events. */
export interface ICategory extends IEntityBase {
  name: string
  description: string
}

/**
 * A ticket offered for a given event and category.
 *
 * `price` is stored as an integer in minor currency units (e.g. cents) — never a
 * float — so formatting to a locale-aware string only happens at the presentation
 * boundary.
 */
export interface ITicket extends IEntityBase {
  name: string
  price: number
  currency: TCurrency
  quantity: number
  status: TTicketStatus
  eventId: TEntityId
  categoryId: TEntityId
}

/**
 * An authenticated administrator or viewer of the portal.
 *
 * `sessionActive` is internal mock bookkeeping only — it is never exposed on
 * the public `User` API shape (`id`/`name`/`email`/`role`, per
 * `openapi.yaml`). It tracks whether the current (deterministic) mock token
 * for this user is currently valid, so `POST /auth/logout`
 * (`src/mocks/handlers/auth.ts`) can genuinely invalidate a session rather
 * than being a client-side no-op. There is deliberately no `token` field
 * here — the mock token is derived deterministically from the user id, never
 * stored.
 */
export interface IUser extends IEntityBase {
  name: string
  email: string
  role: TUserRole
  sessionActive: boolean
}
