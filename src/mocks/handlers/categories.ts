import type { HttpHandler } from 'msw'

import { db } from '../db/singleton'
import { requireWriteAccess } from './auth'
import { createBulkHandler, createEntityHandlers, notFoundFailure } from './factory'
import type { TBulkApplier, ICodedConflict, IStructuredConflict, IValidateContext } from './factory'
import type { ICategory } from '../db'

const BLOCKING_ENTITY_TYPE = 'ticket'

const DUPLICATE_NAME_CODE = 'DUPLICATE_NAME'

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

// Type-check before `.trim()` so a payload like `{ "name": 123 }` is a 400, not a resolver exception.
function nameFormatError (input: Partial<ICategory>): Record<string, string> {
  if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim() === '')) {
    return { name: 'Name is required.' }
  }

  return {}
}

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

// The contract allows `description: null` on the wire, but the stored value is always a string.
function withStringDescription (input: Partial<ICategory>): Partial<ICategory> {
  return input.description === null ? { ...input, description: '' } : input
}

// On update `record` is the merged record and its own id is excluded, so re-casing its own name is allowed.
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

const NOT_FOUND_FAILURE = notFoundFailure('category')

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

// Categories have no status: report every id as failed rather than silently doing nothing.
const archiveOne: TBulkApplier = (id) => {
  return db.categories.get(id) === undefined
    ? NOT_FOUND_FAILURE
    : { code: 'UNSUPPORTED_OPERATION', reason: 'Categories have no status to archive.' }
}

const entityHandlers: HttpHandler[] = createEntityHandlers<ICategory>({
  path: '/categories',
  collection: db.categories,
  fields: {
    sortableFields: ['name', 'createdAt']
  },
  validate: validateCategory,
  createRecord: input => ({ ...input, description: input.description ?? '' }) as ICategory,
  buildUpdatePatch: withStringDescription,
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
