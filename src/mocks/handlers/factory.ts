import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'
import { csvContentDisposition, serialiseCsv, type ICsvColumn } from './csv'
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

export interface IEntityFieldDeclaration<T> {
  searchableFields?: (keyof T)[]
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
  createRecord?: (input: Partial<T>) => T
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

function errorBody (code: string, message: string, errors?: Record<string, string>): TErrorResponse {
  return errors === undefined ? { code, message } : { code, message, errors }
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

const HTTP_STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  notFound: 404,
  conflict: 409
} as const

const NOT_FOUND_MESSAGE = 'No resource exists with the given identifier.'
const CHAOS_FAILURE_MESSAGE = 'The mock backend was forced to fail this request.'
const VALIDATION_MESSAGE = 'The request failed validation.'

async function withChaos (path: string, resolve: () => Response | Promise<Response>): Promise<Response> {
  const latencyMs = chaos.getLatency()

  if (latencyMs > 0) {
    await delay(latencyMs)
  }

  const forced = chaos.consumeForcedFailure(path)

  if (forced !== undefined) {
    return HttpResponse.json(errorBody('CHAOS_FORCED_FAILURE', CHAOS_FAILURE_MESSAGE), { status: forced.status })
  }

  return resolve()
}

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

  const page = url.searchParams.get('page')

  if (page !== null) {
    query.page = Number(page)
  }

  const perPage = url.searchParams.get('perPage')

  if (perPage !== null) {
    query.perPage = Number(perPage)
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

async function readJsonBody (request: Request): Promise<Partial<Record<string, unknown>>> {
  try {
    const body: unknown = await request.json()

    return typeof body === 'object' && body !== null ? body as Partial<Record<string, unknown>> : {}
  } catch {
    return {}
  }
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

// Without an id the record would be unreachable through the item routes.
function withGeneratedId<T extends IIdentifiable> (record: T): T {
  // Network payloads can lack `id` at runtime whatever the type says.
  const id = record.id as string | undefined

  return id === undefined || id === '' ? { ...record, id: generateId() } : record
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

    const input = await readJsonBody(request) as Partial<T>
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

    const record = createRecord ? createRecord(input) : (input as T)
    const inserted = collection.insert(withGeneratedId(record))

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

    const input = await readJsonBody(request) as Partial<T>
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

    const patch = buildUpdatePatch ? buildUpdatePatch(input) : input
    const updated = collection.update(id, patch)

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
  | { ok: true; request: TBulkRequest } |
  { ok: false; message: string }

function parseBulkRequest (
  body: Partial<Record<string, unknown>>,
  appliers: Partial<Record<TBulkOperation, TBulkApplier>>
): TBulkParseResult {
  const { ids, operation } = body

  const idsValid = Array.isArray(ids) && ids.length > 0 && ids.every(id => typeof id === 'string')
  const operationValid = typeof operation === 'string' && appliers[operation as TBulkOperation] !== undefined

  if (!idsValid || !operationValid) {
    return { ok: false, message: BULK_VALIDATION_MESSAGE }
  }

  if (ids.length > BULK_MAX_IDS) {
    return { ok: false, message: BULK_TOO_MANY_IDS_MESSAGE }
  }

  return { ok: true, request: { ids, operation: operation as TBulkOperation } }
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

    const apply = appliers[parsed.request.operation]

    if (apply === undefined) {
      return HttpResponse.json(
        errorBody('VALIDATION_ERROR', BULK_VALIDATION_MESSAGE),
        { status: HTTP_STATUS.badRequest }
      )
    }

    const succeeded: string[] = []
    const failed: TBulkFailure[] = []

    for (const id of parsed.request.ids) {
      const failure = apply(id)

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
