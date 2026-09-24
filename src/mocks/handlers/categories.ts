import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { requireWriteAccess } from './auth'
import { createBulkHandler, createEntityHandlers } from './factory'
import type { TBulkApplier, IBulkFailureReason, ICodedConflict, IStructuredConflict, IValidateContext } from './factory'
import type { ICategory } from '../db'

/**
 * `GET /categories`, `POST /categories`, `GET /categories/{id}`,
 * `PATCH /categories/{id}`, `DELETE /categories/{id}` — the OpenAPI
 * contract's categories paths (`src/mocks/openapi.yaml`). Pure MSW wiring
 * over `src/mocks/db`'s `categories` collection via `createEntityHandlers`,
 * per this slice's acceptance criteria that entity handlers are built
 * through the factory rather than hand-written.
 *
 * The `search` query parameter's actual matching fields are governed by
 * `db/database.ts`'s `CATEGORY_SEARCHABLE_FIELDS` (passed to
 * `createCollection` when `db.categories` is built) — `collection.list()`
 * searches against that declaration, not the `searchableFields` given to
 * `createEntityHandlers` below, which the factory does not currently read
 * for search matching (only for documentation/parity with
 * `sortableFields`). `database.ts` already declares `['name', 'description']`,
 * matching this slice's acceptance criteria of "search (name, description)"
 * exactly.
 */

const BLOCKING_ENTITY_TYPE = 'ticket'

const DUPLICATE_NAME_CODE = 'DUPLICATE_NAME'

/**
 * Normalises a category name for uniqueness comparison: trims surrounding
 * whitespace and lowercases it, so "VIP", " vip" and "Vip " are all
 * recognised as the same name. Comparing raw strings would let those
 * coexist, which defeats the point of a controlled vocabulary.
 */
function normaliseName (name: string): string {
  return name.trim().toLowerCase()
}

function requiredFieldErrors (input: Partial<ICategory>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (input.name === undefined || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.name = 'Name is required.'
  }

  return errors
}

/**
 * Rejects a `name` that is present but not a non-blank string, only when the
 * field is actually present on the payload — on a partial update, an absent
 * `name` means "leave it alone" (`requiredFieldErrors`'s job on create), but
 * a `name` that *is* present must be a non-blank string. Checking the type
 * here (rather than calling `.trim()` straight on an unchecked value) keeps
 * a malformed payload — e.g. `{ "name": 123 }` — a controlled `400` instead
 * of an unhandled exception in the MSW resolver.
 */
function nameFormatError (input: Partial<ICategory>): Record<string, string> {
  if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim() === '')) {
    return { name: 'Name is required.' }
  }

  return {}
}

/**
 * Rejects a `description` that is present but not a string, only when the
 * field is actually present — an absent or `null`/`undefined` description is
 * fine (`stampTimestamps` defaults it to `''`), but any other JSON type
 * would otherwise be persisted and echoed back as non-string data, breaking
 * the `Category.description: string` contract.
 */
function descriptionFormatError (input: Partial<ICategory>): Record<string, string> {
  if (input.description !== undefined && input.description !== null && typeof input.description !== 'string') {
    return { description: 'Description must be text.' }
  }

  return {}
}

function validateCategory (
  input: Partial<ICategory>,
  context: IValidateContext<ICategory>
): Record<string, string> | undefined {
  const errors: Record<string, string> = {
    ...(context.action === 'create' ? requiredFieldErrors(input) : nameFormatError(input)),
    ...descriptionFormatError(input)
  }

  return Object.keys(errors).length > 0 ? errors : undefined
}

function stampTimestamps (input: Partial<ICategory>): ICategory {
  const now = new Date().toISOString()

  return {
    ...input,
    description: input.description ?? '',
    createdAt: now,
    updatedAt: now
  } as ICategory
}

function bumpUpdatedAt (input: Partial<ICategory>): Partial<ICategory> {
  return { ...input, updatedAt: new Date().toISOString() }
}

/**
 * Rejects a name that collides with another category once trimmed and
 * lowercased — case-insensitively and whitespace-trimmed, per this slice's
 * acceptance criteria — with a `409` carrying the distinct `DUPLICATE_NAME`
 * code so the client can tell it apart from a `DependencyConflict`.
 *
 * On `create`, `record` is the raw input payload (no `id` yet), so every
 * existing category is a candidate collision. On `update`, `record` is the
 * factory's effective post-patch record (existing fields overlaid with the
 * patch — see `createEntityHandlers`'s `update` handler), so a patch that
 * does not touch `name` is checked against its own unchanged name and never
 * collides with itself; a category's own id is excluded from the candidate
 * set so renaming a category to its own (possibly re-cased) name is allowed.
 *
 * Deletion is blocked separately, by `checkDependencyConflict` below, when a
 * ticket still references the category.
 */
function checkDuplicateName (record: ICategory, action: 'create' | 'update' | 'delete'): ICodedConflict | undefined {
  if (action === 'delete' || record.name === undefined) {
    return undefined
  }

  const candidateName = normaliseName(record.name)
  const collision = db.categories
    .list({ perPage: Number.MAX_SAFE_INTEGER })
    .data.find(category => category.id !== record.id && normaliseName(category.name) === candidateName)

  return collision === undefined
    ? undefined
    : { code: DUPLICATE_NAME_CODE, message: `A category named "${record.name.trim()}" already exists.` }
}

/**
 * Blocks deletion when a ticket still references this category, answering
 * with the dependent count rather than a bare refusal — see
 * `DependencyConflict` in `src/mocks/openapi.yaml`. Categories have no
 * conflict rule on update beyond the name uniqueness `checkDuplicateName`
 * already enforces.
 */
function checkDependencyConflict (record: ICategory, action: 'create' | 'update' | 'delete'): IStructuredConflict | undefined {
  if (action !== 'delete') {
    return undefined
  }

  const count = db.tickets.list({ equals: { categoryId: record.id }, perPage: Number.MAX_SAFE_INTEGER }).meta.total

  return count > 0
    ? { message: `${count} ticket(s) reference this category.`, entity: BLOCKING_ENTITY_TYPE, count }
    : undefined
}

function checkCategoryConflict (record: ICategory, action: 'create' | 'update' | 'delete'): ICodedConflict | IStructuredConflict | undefined {
  return checkDuplicateName(record, action) ?? checkDependencyConflict(record, action)
}

const NOT_FOUND_FAILURE: IBulkFailureReason = {
  code: 'NOT_FOUND',
  reason: 'No category exists with this identifier.'
}

/**
 * Deletes one category within a bulk request, reusing the *same*
 * `checkDependencyConflict` a single delete runs — a category still referenced
 * by tickets is reported as a per-identifier failure carrying its blocking
 * count, not a top-level `409` (PRD-007).
 */
const deleteOne: TBulkApplier = (id) => {
  const existing = db.categories.get(id)

  if (existing === undefined) {
    return NOT_FOUND_FAILURE
  }

  const conflict = checkDependencyConflict(existing, 'delete')

  if (conflict !== undefined) {
    return { code: 'CONFLICT', reason: conflict.message, count: conflict.count }
  }

  db.categories.remove(id)

  return undefined
}

/**
 * Categories have no lifecycle status, so a bulk `archive` cannot be applied —
 * every identifier is reported as failed with an explanatory reason rather
 * than silently doing nothing (PRD-007's "worse than no bulk operation" rule).
 */
const archiveOne: TBulkApplier = (id) => {
  return db.categories.get(id) === undefined
    ? NOT_FOUND_FAILURE
    : { code: 'UNSUPPORTED_OPERATION', reason: 'Categories have no status to archive.' }
}

const entityHandlers: HttpHandler[] = createEntityHandlers<ICategory>({
  path: '/categories',
  collection: db.categories,
  fields: {
    searchableFields: ['name', 'description'],
    sortableFields: ['name', 'createdAt']
  },
  validate: validateCategory,
  createRecord: stampTimestamps,
  buildUpdatePatch: bumpUpdatedAt,
  conflictCheck: checkCategoryConflict,
  authorize: requireWriteAccess,
  csv: {
    entity: 'categories',
    columns: [
      { header: 'Name', value: category => category.name },
      { header: 'Description', value: category => category.description },
      { header: 'Created At', value: category => category.createdAt }
    ]
  }
})

const bulkHandler: HttpHandler = createBulkHandler({
  path: '/categories/bulk',
  appliers: { delete: deleteOne, archive: archiveOne },
  authorize: requireWriteAccess
})

export const categoryHandlers: HttpHandler[] = [...entityHandlers, bulkHandler]
