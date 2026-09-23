import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { createEntityHandlers } from './factory'
import type { IValidateContext } from './factory'
import type { IEvent } from '../db'

/**
 * `GET /events`, `POST /events`, `GET /events/{id}`, `PATCH /events/{id}`,
 * `DELETE /events/{id}` — the OpenAPI contract's events paths
 * (`src/mocks/openapi.yaml`). Pure MSW wiring over `src/mocks/db`'s
 * `events` collection via `createEntityHandlers`, per this slice's
 * acceptance criteria that entity handlers are built through the factory
 * rather than hand-written.
 *
 * The `search` query parameter's actual matching fields are governed by
 * `db/database.ts`'s `EVENT_SEARCHABLE_FIELDS` (passed to `createCollection`
 * when `db.events` is built) — `collection.list()` searches against that
 * declaration, not the `searchableFields` given to `createEntityHandlers`
 * below, which the factory does not currently read for search matching
 * (only for documentation/parity with `sortableFields`). `database.ts` was
 * updated alongside this slice to declare `['name', 'venue']`, matching this
 * slice's acceptance criteria of "search (name, venue)" exactly — `country`
 * has its own dedicated exact-match filter instead.
 */

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

/**
 * Validates a country code against the input only when the field is
 * actually present on the payload — on a partial update, an absent
 * `country` means "leave it alone", not "invalid".
 */
function countryFormatError (input: Partial<IEvent>): Record<string, string> {
  if (input.country !== undefined && input.country !== '' && !COUNTRY_CODE_PATTERN.test(input.country)) {
    return { country: 'Country must be a 2-letter ISO 3166-1 alpha-2 code.' }
  }

  return {}
}

/**
 * Validates `status` against the input only when the field is actually
 * present on the payload — on a partial update, an absent `status` means
 * "leave it alone", not "invalid" (that's `requiredFieldErrors`'s job on
 * create).
 */
function statusFormatError (input: Partial<IEvent>): Record<string, string> {
  if (input.status !== undefined && !VALID_EVENT_STATUSES.includes(input.status)) {
    return { status: 'Status must be one of: draft, published, cancelled, completed.' }
  }

  return {}
}

/**
 * Rejects an end date preceding a start date, checked against the
 * *effective* record — the given patch overlaid onto `existing` (update) or
 * the raw payload alone (create) — so a `PATCH` that only sends `endDate`
 * is still validated against the unchanged `startDate` already on file.
 */
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

/**
 * Blocks deletion when a ticket still references this event, answering with
 * the dependent count rather than a bare refusal — see `DependencyConflict`
 * in `src/mocks/openapi.yaml`. Events have no conflict rule on update.
 */
function checkEventConflict (record: IEvent, action: 'update' | 'delete'): { message: string; entity: string; count: number } | undefined {
  if (action !== 'delete') {
    return undefined
  }

  const count = db.tickets.list({ equals: { eventId: record.id }, perPage: Number.MAX_SAFE_INTEGER }).meta.total

  return count > 0
    ? { message: `${count} ticket(s) reference this event.`, entity: BLOCKING_ENTITY_TYPE, count }
    : undefined
}

export const eventHandlers: HttpHandler[] = createEntityHandlers<IEvent>({
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
  conflictCheck: checkEventConflict
})
