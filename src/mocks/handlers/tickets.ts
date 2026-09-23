import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { createEntityHandlers } from './factory'
import type { IValidateContext } from './factory'
import type { IEntityCollection, IListQuery, IListResult, ITicket } from '../db'

/**
 * `GET /tickets`, `POST /tickets`, `GET /tickets/{id}`, `PATCH /tickets/{id}`,
 * `DELETE /tickets/{id}` — the OpenAPI contract's tickets paths
 * (`src/mocks/openapi.yaml`). Pure MSW wiring over `src/mocks/db`'s `tickets`
 * collection via `createEntityHandlers`, per this slice's acceptance
 * criteria that entity handlers are built through the factory rather than
 * hand-written.
 *
 * The `search` query parameter's actual matching fields are governed by
 * `db/database.ts`'s `TICKET_SEARCHABLE_FIELDS` (passed to `createCollection`
 * when `db.tickets` is built) — `collection.list()` searches against that
 * declaration, not the `searchableFields` given to `createEntityHandlers`
 * below, which the factory does not currently read for search matching
 * (only for documentation/parity with `sortableFields`). `database.ts`
 * already declares `['name']`, matching this slice's acceptance criteria of
 * "search (name)" exactly.
 *
 * Unlike Events/Categories, a Ticket's public shape carries two fields —
 * `eventName`/`categoryName` — that are not stored on `ITicket` at all
 * (`src/mocks/db/types.ts` deliberately has no such fields, to avoid a
 * duplicate copy of the name silently drifting out of sync with the
 * referenced event/category). `withDenormalisedNames` below decorates
 * `db.tickets` to join those names in on every read, and to strip them back
 * out before anything is persisted.
 */

type TTicketWithNames = ITicket & { eventName: string; categoryName: string }

const VALID_TICKET_STATUSES = ['draft', 'on_sale', 'sold_out', 'archived']
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP']
/** Matches the `Ticket`/`TicketPayload` schemas' `quantity` `maximum` in `src/mocks/openapi.yaml` — keep these in sync. */
const MAX_TICKET_QUANTITY = 100000

/** Fallback used when a ticket's `eventId`/`categoryId` does not resolve — see {@link withDenormalisedNames}. */
const UNKNOWN_REFERENCE_NAME = 'Unknown'

function denormalise (record: ITicket): TTicketWithNames {
  return {
    ...record,
    eventName: db.events.get(record.eventId)?.name ?? UNKNOWN_REFERENCE_NAME,
    categoryName: db.categories.get(record.categoryId)?.name ?? UNKNOWN_REFERENCE_NAME
  }
}

/** Strips the two computed-only fields back off before a record/patch reaches `db.tickets`, which never stores them. */
function withoutNames<T extends Partial<TTicketWithNames>> (input: T): Omit<T, 'eventName' | 'categoryName'> {
  const { eventName: _eventName, categoryName: _categoryName, ...rest } = input

  return rest
}

/**
 * Decorates `db.tickets` so every read carries denormalised `eventName`/
 * `categoryName` alongside the stored `eventId`/`categoryId`, joined in from
 * `db.events`/`db.categories` at read time rather than duplicated in
 * storage. `insert`/`update` strip those two fields from the given
 * record/patch before delegating to the real collection, since they must
 * never be persisted — only computed on the way out.
 *
 * The `?? UNKNOWN_REFERENCE_NAME` fallback in {@link denormalise} is purely
 * defensive: this slice's `validate` (see `validateTicket` below) rejects any
 * create/update whose `eventId`/`categoryId` does not resolve, so a dangling
 * reference should be unreachable through the API itself. It only guards
 * against a record reaching this collection some other way (e.g. a test
 * inserting directly via `db.tickets.insert`), mirroring how
 * `checkEventConflict`/`checkDependencyConflict` in `events.ts`/
 * `categories.ts` treat referential lookups defensively rather than assuming
 * they can never fail.
 */
function withDenormalisedNames (collection: IEntityCollection<ITicket>): IEntityCollection<TTicketWithNames> {
  return {
    list: (query: IListQuery<TTicketWithNames>): IListResult<TTicketWithNames> => {
      const result = collection.list(query as IListQuery<ITicket>)

      return { ...result, data: result.data.map(denormalise) }
    },

    get: (id) => {
      const record = collection.get(id)

      return record === undefined ? undefined : denormalise(record)
    },

    insert: (record) => {
      const inserted = collection.insert(withoutNames(record) as ITicket)

      return denormalise(inserted)
    },

    update: (id, patch) => {
      const updated = collection.update(id, withoutNames(patch))

      return updated === undefined ? undefined : denormalise(updated)
    },

    remove: id => collection.remove(id),

    replace: records => collection.replace(records.map(record => withoutNames(record) as ITicket))
  }
}

function requiredFieldErrors (input: Partial<ITicket>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (input.name === undefined || input.name === '') {
    errors.name = 'Name is required.'
  }

  if (input.price === undefined) {
    errors.price = 'Price is required.'
  }

  if (input.currency === undefined) {
    errors.currency = 'Currency is required.'
  }

  if (input.quantity === undefined) {
    errors.quantity = 'Quantity is required.'
  }

  if (input.status === undefined) {
    errors.status = 'Status is required.'
  }

  if (input.eventId === undefined || input.eventId === '') {
    errors.eventId = 'Event is required.'
  }

  if (input.categoryId === undefined || input.categoryId === '') {
    errors.categoryId = 'Category is required.'
  }

  return errors
}

/**
 * Validates `price` against the input only when the field is actually
 * present on the payload — on a partial update, an absent `price` means
 * "leave it alone", not "invalid" (that's `requiredFieldErrors`'s job on
 * create).
 */
function priceFormatError (input: Partial<ITicket>): Record<string, string> {
  if (input.price !== undefined && (!Number.isInteger(input.price) || input.price < 0)) {
    return { price: 'Price must be a non-negative integer number of minor currency units.' }
  }

  return {}
}

/**
 * Validates `quantity` against the input only when the field is actually
 * present on the payload, mirroring `priceFormatError`'s "leave it alone
 * when absent" behaviour on partial update.
 */
function quantityFormatError (input: Partial<ITicket>): Record<string, string> {
  const isInvalid = input.quantity !== undefined &&
    (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > MAX_TICKET_QUANTITY)

  if (isInvalid) {
    return { quantity: `Quantity must be a non-negative integer no greater than ${MAX_TICKET_QUANTITY}.` }
  }

  return {}
}

/**
 * Validates `currency` against the input only when the field is actually
 * present on the payload, mirroring `priceFormatError`'s "leave it alone
 * when absent" behaviour on partial update.
 */
function currencyFormatError (input: Partial<ITicket>): Record<string, string> {
  if (input.currency !== undefined && !VALID_CURRENCIES.includes(input.currency)) {
    return { currency: 'Currency must be one of: USD, EUR, GBP.' }
  }

  return {}
}

/**
 * Validates `status` against the input only when the field is actually
 * present on the payload, mirroring `priceFormatError`'s "leave it alone
 * when absent" behaviour on partial update.
 */
function statusFormatError (input: Partial<ITicket>): Record<string, string> {
  if (input.status !== undefined && !VALID_TICKET_STATUSES.includes(input.status)) {
    return { status: 'Status must be one of: draft, on_sale, sold_out, archived.' }
  }

  return {}
}

/**
 * Rejects an `eventId` that is present but does not resolve to an existing
 * event, only when the field is actually present on the payload — on a
 * partial update, an absent `eventId` means "leave it alone". This is the
 * only place a ticket's referential integrity toward `db.events` is
 * enforced: there is no `conflictCheck` in this slice, since a `400` field
 * error (not a `409`) is the correct response to an unknown reference on a
 * write, per this slice's acceptance criteria.
 */
function eventReferenceError (input: Partial<ITicket>): Record<string, string> {
  if (input.eventId !== undefined && db.events.get(input.eventId) === undefined) {
    return { eventId: 'References an event that does not exist.' }
  }

  return {}
}

/**
 * Rejects a `categoryId` that is present but does not resolve to an existing
 * category, only when the field is actually present on the payload — mirrors
 * `eventReferenceError` exactly, for `db.categories` instead of `db.events`.
 */
function categoryReferenceError (input: Partial<ITicket>): Record<string, string> {
  if (input.categoryId !== undefined && db.categories.get(input.categoryId) === undefined) {
    return { categoryId: 'References a category that does not exist.' }
  }

  return {}
}

function validateTicket (
  input: Partial<TTicketWithNames>,
  context: IValidateContext<TTicketWithNames>
): Record<string, string> | undefined {
  const errors: Record<string, string> = {
    ...(context.action === 'create' ? requiredFieldErrors(input) : {}),
    ...priceFormatError(input),
    ...quantityFormatError(input),
    ...currencyFormatError(input),
    ...statusFormatError(input),
    ...eventReferenceError(input),
    ...categoryReferenceError(input)
  }

  return Object.keys(errors).length > 0 ? errors : undefined
}

/**
 * Stamps `createdAt`/`updatedAt` on a create payload, mirroring
 * `stampTimestamps` in `events.ts`/`categories.ts`. The result is typed as
 * `TTicketWithNames` only because that is the type parameter
 * `createEntityHandlers` is instantiated with here (see the decorated
 * `collection` passed below) — `eventName`/`categoryName` are never actually
 * present at this point; `withDenormalisedNames`'s `insert` strips them
 * (a no-op, since they are absent) before delegating to `db.tickets.insert`,
 * which then computes and re-attaches them on the way back out.
 */
function stampTimestamps (input: Partial<TTicketWithNames>): TTicketWithNames {
  const now = new Date().toISOString()

  return {
    ...input,
    createdAt: now,
    updatedAt: now
  } as TTicketWithNames
}

function bumpUpdatedAt (input: Partial<TTicketWithNames>): Partial<TTicketWithNames> {
  return { ...input, updatedAt: new Date().toISOString() }
}

export const ticketHandlers: HttpHandler[] = createEntityHandlers<TTicketWithNames>({
  path: '/tickets',
  collection: withDenormalisedNames(db.tickets),
  fields: {
    searchableFields: ['name'],
    sortableFields: ['name', 'price', 'quantity', 'status', 'createdAt'],
    equalityFilters: [
      { field: 'eventId' },
      { field: 'categoryId' },
      { field: 'status' },
      { field: 'currency' }
    ],
    rangeFilters: [
      { field: 'price' }
    ]
  },
  validate: validateTicket,
  createRecord: stampTimestamps,
  buildUpdatePatch: bumpUpdatedAt
})
