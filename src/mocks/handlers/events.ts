import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { requireWriteAccess } from './auth'
import { createBulkHandler, createEntityHandlers } from './factory'
import type { TBulkApplier, IBulkFailureReason, IValidateContext } from './factory'
import type { IEvent } from '../db'

// `search` matching is governed by `EVENT_SEARCHABLE_FIELDS` in db/database.ts, not the `searchableFields` below.

const BLOCKING_ENTITY_TYPE = 'ticket'

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/i

const VALID_EVENT_STATUSES = ['draft', 'published', 'cancelled', 'completed']

function requiredFieldErrors (input: Partial<IEvent>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (input.name === undefined || input.name === '') {
    errors.name = 'Name is required.'
  }

  if (input.country === undefined || input.country === '') {
    errors.country = 'Country is required.'
  }

  if (input.venue === undefined || input.venue === '') {
    errors.venue = 'Venue is required.'
  }

  if (input.startDate === undefined || input.startDate === '') {
    errors.startDate = 'Start date is required.'
  }

  if (input.endDate === undefined || input.endDate === '') {
    errors.endDate = 'End date is required.'
  }

  if (input.status === undefined) {
    errors.status = 'Status is required.'
  }

  return errors
}

function countryFormatError (input: Partial<IEvent>): Record<string, string> {
  if (input.country !== undefined && input.country !== '' && !COUNTRY_CODE_PATTERN.test(input.country)) {
    return { country: 'Country must be a 2-letter ISO 3166-1 alpha-2 code.' }
  }

  return {}
}

function statusFormatError (input: Partial<IEvent>): Record<string, string> {
  if (input.status !== undefined && !VALID_EVENT_STATUSES.includes(input.status)) {
    return { status: 'Status must be one of: draft, published, cancelled, completed.' }
  }

  return {}
}

// Checked against the merged record so a PATCH sending only `endDate` is validated against the stored `startDate`.
function dateOrderError (input: Partial<IEvent>, existing: IEvent | undefined): Record<string, string> {
  const effectiveStart = input.startDate === '' ? undefined : input.startDate ?? existing?.startDate
  const effectiveEnd = input.endDate === '' ? undefined : input.endDate ?? existing?.endDate

  if (effectiveStart !== undefined && effectiveEnd !== undefined && effectiveEnd < effectiveStart) {
    return { endDate: 'End date must not precede start date.' }
  }

  return {}
}

function validateEvent (input: Partial<IEvent>, context: IValidateContext<IEvent>): Record<string, string> | undefined {
  const errors: Record<string, string> = {
    ...(context.action === 'create' ? requiredFieldErrors(input) : {}),
    ...countryFormatError(input),
    ...statusFormatError(input),
    ...dateOrderError(input, context.existing)
  }

  return Object.keys(errors).length > 0 ? errors : undefined
}

function stampTimestamps (input: Partial<IEvent>): IEvent {
  const now = new Date().toISOString()

  return {
    ...input,
    createdAt: now,
    updatedAt: now
  } as IEvent
}

function bumpUpdatedAt (input: Partial<IEvent>): Partial<IEvent> {
  return { ...input, updatedAt: new Date().toISOString() }
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

const NOT_FOUND_FAILURE: IBulkFailureReason = {
  code: 'NOT_FOUND',
  reason: 'No event exists with this identifier.'
}

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
    searchableFields: ['name', 'venue'],
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
  createRecord: stampTimestamps,
  buildUpdatePatch: bumpUpdatedAt,
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
