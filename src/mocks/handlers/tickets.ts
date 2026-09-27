import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { requireWriteAccess } from './auth'
import { formatMoneyMinorUnits } from './csv'
import { createBulkHandler, createEntityHandlers } from './factory'
import type { TBulkApplier, IBulkFailureReason, IValidateContext } from './factory'
import type { IEntityCollection, IListQuery, IListResult, ITicket } from '../db'

// `search` matching is governed by `TICKET_SEARCHABLE_FIELDS` in db/database.ts, not the `searchableFields` below.
// `eventName`/`categoryName` are never stored; they're joined in on read so they can't drift from the referenced records.

type TTicketWithNames = ITicket & { eventName: string; categoryName: string }

const VALID_TICKET_STATUSES = ['draft', 'on_sale', 'sold_out', 'archived']
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP']
// Keep in sync with the `quantity` `maximum` in openapi.yaml.
const MAX_TICKET_QUANTITY = 100000

const UNKNOWN_REFERENCE_NAME = 'Unknown'

function denormalise (record: ITicket): TTicketWithNames {
  return {
    ...record,
    eventName: db.events.get(record.eventId)?.name ?? UNKNOWN_REFERENCE_NAME,
    categoryName: db.categories.get(record.categoryId)?.name ?? UNKNOWN_REFERENCE_NAME
  }
}

function withoutNames<T extends Partial<TTicketWithNames>> (input: T): Omit<T, 'eventName' | 'categoryName'> {
  const { eventName: _eventName, categoryName: _categoryName, ...rest } = input

  return rest
}

// The `Unknown` fallback only guards records inserted directly (e.g. in tests); the API rejects dangling references.
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

function priceFormatError (input: Partial<ITicket>): Record<string, string> {
  if (input.price !== undefined && (!Number.isInteger(input.price) || input.price < 0)) {
    return { price: 'Price must be a non-negative integer number of minor currency units.' }
  }

  return {}
}

function quantityFormatError (input: Partial<ITicket>): Record<string, string> {
  const isInvalid = input.quantity !== undefined &&
    (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > MAX_TICKET_QUANTITY)

  if (isInvalid) {
    return { quantity: `Quantity must be a non-negative integer no greater than ${MAX_TICKET_QUANTITY}.` }
  }

  return {}
}

function currencyFormatError (input: Partial<ITicket>): Record<string, string> {
  if (input.currency !== undefined && !VALID_CURRENCIES.includes(input.currency)) {
    return { currency: 'Currency must be one of: USD, EUR, GBP.' }
  }

  return {}
}

function statusFormatError (input: Partial<ITicket>): Record<string, string> {
  if (input.status !== undefined && !VALID_TICKET_STATUSES.includes(input.status)) {
    return { status: 'Status must be one of: draft, on_sale, sold_out, archived.' }
  }

  return {}
}

// An unknown reference is a 400 field error, not a 409, so there's deliberately no `conflictCheck`.
function eventReferenceError (input: Partial<ITicket>): Record<string, string> {
  if (input.eventId !== undefined && db.events.get(input.eventId) === undefined) {
    return { eventId: 'References an event that does not exist.' }
  }

  return {}
}

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

const TICKET_ARCHIVE_STATUS: ITicket['status'] = 'archived'

const NOT_FOUND_FAILURE: IBulkFailureReason = {
  code: 'NOT_FOUND',
  reason: 'No ticket exists with this identifier.'
}

const deleteOne: TBulkApplier = (id) => {
  return db.tickets.remove(id) ? undefined : NOT_FOUND_FAILURE
}

const archiveOne: TBulkApplier = (id) => {
  const updated = db.tickets.update(id, { status: TICKET_ARCHIVE_STATUS, updatedAt: new Date().toISOString() })

  return updated === undefined ? NOT_FOUND_FAILURE : undefined
}

const entityHandlers: HttpHandler[] = createEntityHandlers<TTicketWithNames>({
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
  buildUpdatePatch: bumpUpdatedAt,
  authorize: requireWriteAccess,
  csv: {
    entity: 'tickets',
    columns: [
      { header: 'Name', value: ticket => ticket.name },
      // Currency in its own column so a spreadsheet can sum the price.
      { header: 'Price', value: ticket => formatMoneyMinorUnits(ticket.price) },
      { header: 'Currency', value: ticket => ticket.currency },
      { header: 'Quantity', value: ticket => ticket.quantity },
      { header: 'Status', value: ticket => ticket.status },
      { header: 'Event', value: ticket => ticket.eventName },
      { header: 'Category', value: ticket => ticket.categoryName },
      { header: 'Created At', value: ticket => ticket.createdAt }
    ]
  }
})

const bulkHandler: HttpHandler = createBulkHandler({
  path: '/tickets/bulk',
  appliers: { delete: deleteOne, archive: archiveOne },
  authorize: requireWriteAccess
})

export const ticketHandlers: HttpHandler[] = [...entityHandlers, bulkHandler]
