import { http, HttpResponse, type HttpHandler } from 'msw'

import { csvContentDisposition, serialiseCsv, type ICsvColumn } from './csv'
import { errorBody, HTTP_STATUS, readJsonBody, withChaos } from './shared'
import type { IEntityCollection, IIdentifiable, IListQuery, IOverlapFilter, IRangeFilter, TSortOrder } from '../db'

interface IEqualityFilterField<T> {
  field: keyof T
  parse?: (raw: string) => unknown
}

interface IRangeFilterField<T> {
  field: keyof T
  /** Query-string prefix for `<param>Min`/`<param>Max`; defaults to the field name. */
  param?: string
  parse?: (raw: string) => number | string
}

/** Matches when the record's `[startField, endField]` overlaps `<param>From`/`<param>To`, unlike range containment. */
interface IOverlapFilterField<T> {
  startField: keyof T
  endField: keyof T
  param: string
}

/** Search fields are declared on the collection (db/database.ts), not here. */
export interface IEntityFieldDeclaration<T> {
  sortableFields?: (keyof T)[]
  equalityFilters?: IEqualityFilterField<T>[]
  rangeFilters?: IRangeFilterField<T>[]
  overlapFilters?: IOverlapFilterField<T>[]
}

export interface IStructuredConflict {
  message: string
  entity: string
  count: number
}

/** A non-dependency conflict (e.g. duplicate name); its `code` replaces the default `'CONFLICT'`. */
export interface ICodedConflict {
  code: string
  message: string
}

// string -> 409 `CONFLICT`; ICodedConflict -> its own code; IStructuredConflict -> `DependencyConflict` body.
// On create, `record` is the raw payload cast to `T`, so only fields present on it are meaningful.
export type TConflictCheck<T> = (
  record: T,
  action: 'create' | 'update' | 'delete'
) => string | ICodedConflict | IStructuredConflict | undefined

export interface IValidateContext<T> {
  action: 'create' | 'update'
  existing?: T
}

export interface IEntityHandlerOptions<T extends IIdentifiable> {
  path: string
  collection: IEntityCollection<T>
  fields?: IEntityFieldDeclaration<T>
  /** `context.existing` (update only) lets cross-field checks run against the merged record. */
  validate?: (input: Partial<T>, context: IValidateContext<T>) => Record<string, string> | undefined
  /** Receives the input already stamped with a generated `id`, `createdAt` and `updatedAt`. */
  createRecord?: (input: Partial<T>) => T
  /** Receives the input already stamped with a fresh `updatedAt`. */
  buildUpdatePatch?: (input: Partial<T>) => Partial<T>
  conflictCheck?: TConflictCheck<T>
  /** Viewers must get 403 here, not just in the UI. Read handlers are never guarded. */
  authorize?: (request: Request) => Response | undefined
  csv?: {
    entity: string
    columns: ICsvColumn<T>[]
  }
}

export interface IBulkFailureReason {
  code: string
  reason: string
  /** Dependency conflicts only. */
  count?: number
}

export type TBulkApplier = (id: string) => IBulkFailureReason | undefined

export interface IBulkHandlerOptions {
  path: string
  appliers: Partial<Record<TBulkOperation, TBulkApplier>>
  authorize?: (request: Request) => Response | undefined
}

export function notFoundFailure (entityLabel: string): IBulkFailureReason {
  return { code: 'NOT_FOUND', reason: `No ${entityLabel} exists with this identifier.` }
}

function isStructuredConflict (conflict: ICodedConflict | IStructuredConflict): conflict is IStructuredConflict {
  return 'entity' in conflict && 'count' in conflict
}

function conflictBody (conflict: string | ICodedConflict | IStructuredConflict): TErrorResponse | TDependencyConflict {
  if (typeof conflict === 'string') {
    return errorBody('CONFLICT', conflict)
  }

  return isStructuredConflict(conflict)
    ? { code: 'CONFLICT', message: conflict.message, entity: conflict.entity, count: conflict.count }
    : errorBody(conflict.code, conflict.message)
}

const NOT_FOUND_MESSAGE = 'No resource exists with the given identifier.'
const VALIDATION_MESSAGE = 'The request failed validation.'

// Mirrors `perPage` `maximum` in openapi.yaml; internal callers may still ask a collection for every record.
const MAX_PER_PAGE = 100

function parseEquals<T> (url: URL, declarations: IEqualityFilterField<T>[]): Partial<Record<keyof T, unknown>> {
  const equals: Partial<Record<keyof T, unknown>> = {}

  for (const declaration of declarations) {
    const raw = url.searchParams.get(String(declaration.field))

    if (raw !== null) {
      equals[declaration.field] = (declaration.parse ?? ((value: string) => value))(raw)
    }
  }

  return equals
}

function parseRange<T> (url: URL, declarations: IRangeFilterField<T>[]): Partial<Record<keyof T, IRangeFilter>> {
  const range: Partial<Record<keyof T, IRangeFilter>> = {}

  for (const declaration of declarations) {
    const param = declaration.param ?? String(declaration.field)
    const parse = declaration.parse ?? Number
    const rawMin = url.searchParams.get(`${param}Min`)
    const rawMax = url.searchParams.get(`${param}Max`)

    if (rawMin !== null || rawMax !== null) {
      range[declaration.field] = {
        min: rawMin === null ? undefined : parse(rawMin),
        max: rawMax === null ? undefined : parse(rawMax)
      }
    }
  }

  return range
}

function parseOverlap<T> (url: URL, declarations: IOverlapFilterField<T>[]): IOverlapFilter | undefined {
  for (const declaration of declarations) {
    const rawFrom = url.searchParams.get(`${declaration.param}From`)
    const rawTo = url.searchParams.get(`${declaration.param}To`)

    if (rawFrom !== null || rawTo !== null) {
      return {
        startField: String(declaration.startField),
        endField: String(declaration.endField),
        from: rawFrom ?? undefined,
        to: rawTo ?? undefined
      }
    }
  }

  return undefined
}

// A non-integer value is dropped so the query engine falls back to its default instead of carrying NaN into meta.
function parseInteger (raw: string | null): number | undefined {
  const value = raw === null ? Number.NaN : Number(raw)

  return Number.isInteger(value) ? value : undefined
}

function parseListQuery<T extends IIdentifiable> (url: URL, fields: IEntityFieldDeclaration<T>): IListQuery<T> {
  const query: IListQuery<T> = {}

  const search = url.searchParams.get('search')

  if (search !== null && search !== '') {
    query.search = search
  }

  const sort = url.searchParams.get('sort')

  if (sort !== null && (fields.sortableFields ?? []).some(field => String(field) === sort)) {
    query.sort = sort as keyof T
  }

  const order = url.searchParams.get('order')

  if (order === 'asc' || order === 'desc') {
    query.order = order satisfies TSortOrder
  }

  const page = parseInteger(url.searchParams.get('page'))

  if (page !== undefined) {
    query.page = page
  }

  const perPage = parseInteger(url.searchParams.get('perPage'))

  if (perPage !== undefined) {
    query.perPage = Math.min(perPage, MAX_PER_PAGE)
  }

  const equals = parseEquals(url, fields.equalityFilters ?? [])

  if (Object.keys(equals).length > 0) {
    query.equals = equals
  }

  const range = parseRange(url, fields.rangeFilters ?? [])

  if (Object.keys(range).length > 0) {
    query.range = range
  }

  const overlap = parseOverlap(url, fields.overlapFilters ?? [])

  if (overlap !== undefined) {
    query.overlap = overlap
  }

  return query
}

// `crypto.randomUUID` isn't available in every runtime, so fall back to a UUID-shaped counter.
let generatedIdCounter = 0

function generateId (): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  generatedIdCounter += 1

  return `00000000-0000-4000-8000-${String(generatedIdCounter).padStart(12, '0')}`
}

// The server owns identity and timestamps, so whatever a client sends for them is dropped before validation.
async function readWritablePayload<T> (request: Request): Promise<Partial<T>> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...writable } = await readJsonBody(request)

  return writable as Partial<T>
}

export function createEntityHandlers<T extends IIdentifiable> (options: IEntityHandlerOptions<T>): HttpHandler[] {
  const { path, collection, fields = {}, validate, createRecord, buildUpdatePatch, conflictCheck } = options
  const { authorize, csv } = options
  const itemPath = `${path}/:id`

  function authorizeWrite (request: Request): Response | undefined {
    return authorize?.(request)
  }

  function findOrNotFound (id: string): T | Response {
    const record = collection.get(id)

    return record ?? HttpResponse.json(errorBody('NOT_FOUND', NOT_FOUND_MESSAGE), { status: HTTP_STATUS.notFound })
  }

  const list = http.get(path, ({ request }) => withChaos(path, () => {
    const url = new URL(request.url)
    const query = parseListQuery(url, fields)

    if (csv !== undefined && url.searchParams.get('format') === 'csv') {
      // Export the full filtered+sorted result, not just the current page.
      const all = collection.list({ ...query, page: 1, perPage: Number.MAX_SAFE_INTEGER })
      const body = serialiseCsv(all.data, csv.columns)

      return new HttpResponse(body, {
        status: HTTP_STATUS.ok,
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': csvContentDisposition(csv.entity)
        }
      })
    }

    const result = collection.list(query)

    return HttpResponse.json({ data: result.data, meta: result.meta }, { status: HTTP_STATUS.ok })
  }))

  const create = http.post(path, ({ request }) => withChaos(path, async () => {
    const denied = authorizeWrite(request)

    if (denied !== undefined) {
      return denied
    }

    const input = await readWritablePayload<T>(request)
    const validationErrors = validate?.(input, { action: 'create' })

    if (validationErrors !== undefined && Object.keys(validationErrors).length > 0) {
      return HttpResponse.json(
        errorBody('VALIDATION_ERROR', VALIDATION_MESSAGE, validationErrors),
        { status: HTTP_STATUS.badRequest }
      )
    }

    const conflict = conflictCheck?.(input as T, 'create')

    if (conflict !== undefined) {
      return HttpResponse.json(conflictBody(conflict), { status: HTTP_STATUS.conflict })
    }

    const now = new Date().toISOString()
    const stamped: T = { ...input as T, id: generateId(), createdAt: now, updatedAt: now }
    const inserted = collection.insert(createRecord ? createRecord(stamped) : stamped)

    return HttpResponse.json(inserted, { status: HTTP_STATUS.created })
  }))

  const read = http.get(itemPath, ({ params }) => withChaos(itemPath, () => {
    const found = findOrNotFound(String(params.id))

    return found instanceof Response ? found : HttpResponse.json(found, { status: HTTP_STATUS.ok })
  }))

  const update = http.patch(itemPath, ({ request, params }) => withChaos(itemPath, async () => {
    const denied = authorizeWrite(request)

    if (denied !== undefined) {
      return denied
    }

    const id = String(params.id)
    const existing = findOrNotFound(id)

    if (existing instanceof Response) {
      return existing
    }

    const input = await readWritablePayload<T>(request)
    const validationErrors = validate?.(input, { action: 'update', existing })

    if (validationErrors !== undefined && Object.keys(validationErrors).length > 0) {
      return HttpResponse.json(
        errorBody('VALIDATION_ERROR', VALIDATION_MESSAGE, validationErrors),
        { status: HTTP_STATUS.badRequest }
      )
    }

    // Check the merged record so e.g. a uniqueness check sees the patched `name`.
    const conflict = conflictCheck?.({ ...existing, ...input }, 'update')

    if (conflict !== undefined) {
      return HttpResponse.json(conflictBody(conflict), { status: HTTP_STATUS.conflict })
    }

    const stamped = { ...input, updatedAt: new Date().toISOString() }
    const updated = collection.update(id, buildUpdatePatch ? buildUpdatePatch(stamped) : stamped)

    return updated === undefined
      ? HttpResponse.json(errorBody('NOT_FOUND', NOT_FOUND_MESSAGE), { status: HTTP_STATUS.notFound })
      : HttpResponse.json(updated, { status: HTTP_STATUS.ok })
  }))

  const remove = http.delete(itemPath, ({ request, params }) => withChaos(itemPath, () => {
    const denied = authorizeWrite(request)

    if (denied !== undefined) {
      return denied
    }

    const id = String(params.id)
    const existing = findOrNotFound(id)

    if (existing instanceof Response) {
      return existing
    }

    const conflict = conflictCheck?.(existing, 'delete')

    if (conflict !== undefined) {
      return HttpResponse.json(conflictBody(conflict), { status: HTTP_STATUS.conflict })
    }

    collection.remove(id)

    return new HttpResponse(null, { status: HTTP_STATUS.noContent })
  }))

  return [list, create, read, update, remove]
}

const BULK_VALIDATION_MESSAGE = 'A bulk request needs a non-empty `ids` array and a supported `operation`.'

// Mirrors `maxItems` on `BulkRequest.ids` in openapi.yaml, which the generated types don't enforce at runtime.
const BULK_MAX_IDS = 100

const BULK_TOO_MANY_IDS_MESSAGE =
  `A bulk request may target at most ${BULK_MAX_IDS} identifiers per call.`

type TBulkParseResult =
  | { ok: true; ids: string[]; apply: TBulkApplier } |
  { ok: false; message: string }

function parseBulkRequest (
  body: Partial<Record<string, unknown>>,
  appliers: Partial<Record<TBulkOperation, TBulkApplier>>
): TBulkParseResult {
  const { ids, operation } = body

  const idsValid = Array.isArray(ids) && ids.length > 0 && ids.every(id => typeof id === 'string')
  const apply = typeof operation === 'string' ? appliers[operation as TBulkOperation] : undefined

  if (!idsValid || apply === undefined) {
    return { ok: false, message: BULK_VALIDATION_MESSAGE }
  }

  if (ids.length > BULK_MAX_IDS) {
    return { ok: false, message: BULK_TOO_MANY_IDS_MESSAGE }
  }

  return { ok: true, ids: ids, apply }
}

// Partial success returns 200 with both arrays; a dependency conflict is a per-id failure, never a top-level 409.
export function createBulkHandler (options: IBulkHandlerOptions): HttpHandler {
  const { path, appliers, authorize } = options

  return http.post(path, ({ request }) => withChaos(path, async () => {
    const denied = authorize?.(request)

    if (denied !== undefined) {
      return denied
    }

    const body = await readJsonBody(request)
    const parsed = parseBulkRequest(body, appliers)

    if (!parsed.ok) {
      return HttpResponse.json(
        errorBody('VALIDATION_ERROR', parsed.message),
        { status: HTTP_STATUS.badRequest }
      )
    }

    const succeeded: string[] = []
    const failed: TBulkFailure[] = []

    for (const id of parsed.ids) {
      const failure = parsed.apply(id)

      if (failure === undefined) {
        succeeded.push(id)
      } else {
        failed.push(
          failure.count === undefined
            ? { id, code: failure.code, reason: failure.reason }
            : { id, code: failure.code, reason: failure.reason, count: failure.count }
        )
      }
    }

    return HttpResponse.json({ succeeded, failed } satisfies TBulkResult, { status: HTTP_STATUS.ok })
  }))
}
