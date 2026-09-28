// Hand-declared, not generated: keep enum values in sync with `openapi.yaml` by hand.

export type TEventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export type TTicketStatus = 'draft' | 'on_sale' | 'sold_out' | 'archived'

export type TCurrency = 'USD' | 'EUR' | 'GBP'

export const EVENT_STATUSES: readonly TEventStatus[] = ['draft', 'published', 'cancelled', 'completed']

export const TICKET_STATUSES: readonly TTicketStatus[] = ['draft', 'on_sale', 'sold_out', 'archived']

export const CURRENCIES: readonly TCurrency[] = ['USD', 'EUR', 'GBP']

export type TSortOrder = 'asc' | 'desc'

export type TUserRole = 'admin' | 'viewer'

/** Opaque and UUID-shaped; never assume sequential or sortable. */
export type TEntityId = string

export interface IIdentifiable {
  id: TEntityId
}

export interface IEntityBase extends IIdentifiable {
  createdAt: string
  updatedAt: string
}

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

export interface ICategory extends IEntityBase {
  name: string
  description: string
}

/** `price` is an integer in minor currency units (e.g. cents), never a float. */
export interface ITicket extends IEntityBase {
  name: string
  price: number
  currency: TCurrency
  quantity: number
  status: TTicketStatus
  eventId: TEntityId
  categoryId: TEntityId
}

/** `sessionActive` is mock-only bookkeeping so logout can invalidate the token; never exposed on the API `User`. */
export interface IUser extends IEntityBase {
  name: string
  email: string
  role: TUserRole
  sessionActive: boolean
}
