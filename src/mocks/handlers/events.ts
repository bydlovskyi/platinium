import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { requireWriteAccess } from './auth'
import { createBulkHandler, createEntityHandlers, notFoundFailure } from './factory'
import type { TBulkApplier, IValidateContext } from './factory'
import { EVENT_STATUSES } from '../db'
import type { IEvent } from '../db'

const BLOCKING_ENTITY_TYPE = 'ticket'

// Uppercase only: the `country` filter is an exact match, so a lowercase stored value would never be found.
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

// Round-trips through `Date` so an impossible day like `2027-02-30` is rejected, not silently rolled over.
function isIsoDate (value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, ISO_DATE_LENGTH) === value
}

function textError (value: unknown, label: string): string | undefined {
  if (typeof value !== 'string') {
    return `${label} must be text.`
  }

  return value.trim() === '' ? `${label} is required.` : undefined
}

function dateError (value: unknown, label: string): string | undefined {
  if (value === '') {
    return `${label} is required.`
  }

  return isIsoDate(value) ? undefined : `${label} must be a valid date in YYYY-MM-DD format.`
}

// Each check only runs on a present value; a missing one is a "required" error on create and untouched on update.
const FIELD_CHECKS: Record<keyof TEventPayload, { required: string; check: (value: unknown) => string | undefined }> = {
  name: { required: 'Name is required.', check: value => textError(value, 'Name') },
  country: {
    required: 'Country is required.',
    check: (value) => {
      if (value === '') {
        return 'Country is required.'
      }

      return typeof value === 'string' && COUNTRY_CODE_PATTERN.test(value)
        ? undefined
        : 'Country must be an uppercase 2-letter ISO 3166-1 alpha-2 code.'
    }
  },
  venue: { required: 'Venue is required.', check: value => textError(value, 'Venue') },
  startDate: { required: 'Start date is required.', check: value => dateError(value, 'Start date') },
  endDate: { required: 'End date is required.', check: value => dateError(value, 'End date') },
  status: {
    required: 'Status is required.',
    check: value => (EVENT_STATUSES.includes(value as IEvent['status'])
      ? undefined
      : `Status must be one of: ${EVENT_STATUSES.join(', ')}.`)
  }
}

function fieldErrors (input: Partial<IEvent>, action: 'create' | 'update'): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const [field, { required, check }] of Object.entries(FIELD_CHECKS)) {
    const value = input[field as keyof IEvent]

    if (value === undefined) {
      if (action === 'create') {
        errors[field] = required
      }

      continue
    }

    const error = check(value)

    if (error !== undefined) {
      errors[field] = error
    }
  }

  return errors
}

// Checked against the merged record so a PATCH sending only `endDate` is validated against the stored `startDate`.
function dateOrderError (input: Partial<IEvent>, existing: IEvent | undefined): Record<string, string> {
  const effectiveStart = input.startDate ?? existing?.startDate
  const effectiveEnd = input.endDate ?? existing?.endDate

  if (isIsoDate(effectiveStart) && isIsoDate(effectiveEnd) && effectiveEnd < effectiveStart) {
    return { endDate: 'End date must not precede start date.' }
  }

  return {}
}

function validateEvent (input: Partial<IEvent>, context: IValidateContext<IEvent>): Record<string, string> | undefined {
  const errors: Record<string, string> = {
    ...fieldErrors(input, context.action),
    ...dateOrderError(input, context.existing)
  }

  return Object.keys(errors).length > 0 ? errors : undefined
}

function checkEventConflict (record: IEvent, action: 'create' | 'update' | 'delete'): { message: string; entity: string; count: number } | undefined {
  if (action !== 'delete') {
    return undefined
  }

  const count = db.tickets.list({ equals: { eventId: record.id }, perPage: Number.MAX_SAFE_INTEGER }).meta.total

  return count > 0
    ? { message: `${count} ticket(s) reference this event.`, entity: BLOCKING_ENTITY_TYPE, count }
    : undefined
}

// Events have no `archived` status; `completed` is the closest terminal state.
const EVENT_ARCHIVE_STATUS: IEvent['status'] = 'completed'

const NOT_FOUND_FAILURE = notFoundFailure('event')

const deleteOne: TBulkApplier = (id) => {
  const existing = db.events.get(id)

  if (existing === undefined) {
    return NOT_FOUND_FAILURE
  }

  const conflict = checkEventConflict(existing, 'delete')

  if (conflict !== undefined) {
    return { code: 'CONFLICT', reason: conflict.message, count: conflict.count }
  }

  db.events.remove(id)

  return undefined
}

const archiveOne: TBulkApplier = (id) => {
  const updated = db.events.update(id, { status: EVENT_ARCHIVE_STATUS, updatedAt: new Date().toISOString() })

  return updated === undefined ? NOT_FOUND_FAILURE : undefined
}

const entityHandlers: HttpHandler[] = createEntityHandlers<IEvent>({
  path: '/events',
  collection: db.events,
  fields: {
    sortableFields: ['name', 'startDate', 'endDate', 'status', 'createdAt'],
    equalityFilters: [
      { field: 'status' },
      { field: 'country' }
    ],
    overlapFilters: [
      { startField: 'startDate', endField: 'endDate', param: 'startDate' }
    ]
  },
  validate: validateEvent,
  conflictCheck: checkEventConflict,
  authorize: requireWriteAccess,
  csv: {
    entity: 'events',
    columns: [
      { header: 'Name', value: event => event.name },
      { header: 'Country', value: event => event.country },
      { header: 'Venue', value: event => event.venue },
      { header: 'Start Date', value: event => event.startDate },
      { header: 'End Date', value: event => event.endDate },
      { header: 'Status', value: event => event.status },
      { header: 'Created At', value: event => event.createdAt }
    ]
  }
})

const bulkHandler: HttpHandler = createBulkHandler({
  path: '/events/bulk',
  appliers: { delete: deleteOne, archive: archiveOne },
  authorize: requireWriteAccess
})

export const eventHandlers: HttpHandler[] = [...entityHandlers, bulkHandler]
