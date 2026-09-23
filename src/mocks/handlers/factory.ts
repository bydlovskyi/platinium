import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { chaos } from '../chaos'
import type { IEntityCollection, IIdentifiable, IListQuery, IOverlapFilter, IRangeFilter, TSortOrder } from '../db'

/**
 * Given a collection (from `src/mocks/db`) and a declaration of its
 * searchable/filterable/sortable fields, produces the standard five REST
 * handlers — list, create, read, update, delete — over a single base path
 * (e.g. `/events`). Entity slices (#25 Events, #29 Categories, #31 Tickets)
 * call this with their own field declaration instead of hand-writing five
 * routes each, which is what keeps filtering/sorting/pagination behaviour
 * from diverging between entities.
 *
 * Handlers are pure wiring over the db collection: request parsing and
 * response shaping only, no view logic, no knowledge of Vue or Pinia.
 */

/** A field usable in an `equals` query filter, and the raw-string parser used to coerce it. */
interface IEqualityFilterField<T> {
  field: keyof T
  /** Parses the raw query-string value into the type stored on the record. Defaults to identity (string). */
  parse?: (raw: string) => unknown
}

/** A field usable in a `min`/`max` range query filter (e.g. `priceMin`/`priceMax`). */
interface IRangeFilterField<T> {
  field: keyof T
  /** Query-string parameter prefix, e.g. `price` for `priceMin`/`priceMax`. Defaults to the field name. */
  param?: string
  /** Parses a raw bound string into the comparable type. Defaults to `Number`. */
  parse?: (raw: string) => number | string
}

/**
 * A record date range usable in an overlap query filter (e.g.
 * `startDateFrom`/`startDateTo` matching any event whose own
 * `[startDate, endDate]` range overlaps the requested window). Distinct
 * from {@link IRangeFilterField}, which tests a single field for
 * containment within `[min, max]` rather than testing two fields for
 * overlap against a requested window.
 */
interface IOverlapFilterField<T> {
  /** The record field holding the start of its own range, e.g. `startDate`. */
  startField: keyof T
  /** The record field holding the end of its own range, e.g. `endDate`. */
  endField: keyof T
  /** Query-string parameter prefix, e.g. `startDate` for `startDateFrom`/`startDateTo`. */
  param: string
}

/** Declares which fields participate in search, filtering and sorting for one entity's handlers. */
export interface IEntityFieldDeclaration<T> {
  /** Fields matched by the free-text `search` query parameter. */
  searchableFields?: (keyof T)[]
  /** Fields sortable via `sort`/`order`. */
  sortableFields?: (keyof T)[]
  /** Fields filterable via an exact-match query parameter of the same name. */
  equalityFilters?: IEqualityFilterField<T>[]
  /** Fields filterable via `<param>Min`/`<param>Max` query parameters. */
  rangeFilters?: IRangeFilterField<T>[]
  /** Date ranges filterable via `<param>From`/`<param>To` query parameters, matched by overlap. */
  overlapFilters?: IOverlapFilterField<T>[]
}

/**
 * The structured form a {@link TConflictCheck} may return: enough for the
 * factory to build a `DependencyConflict`-shaped body (`code`, `message`,
 * `entity`, `count`) rather than the bare `{code, message}` a plain string
 * produces. `entity` is the blocking dependent entity's type (e.g.
 * `'ticket'`); `count` is how many dependents were found.
 */
export interface IStructuredConflict {
  message: string
  entity: string
  count: number
}

/**
 * A coded, non-dependency conflict a {@link TConflictCheck} may return —
 * e.g. a uniqueness violation. Distinct from {@link IStructuredConflict}:
 * it carries no `entity`/`count` (there is no blocking dependent record,
 * just a clash with another record of the same collection), but its `code`
 * overrides the plain string form's hardcoded `'CONFLICT'`, so a client can
 * tell a duplicate-name rejection apart from a referential-integrity one.
 */
export interface ICodedConflict {
  code: string
  message: string
}

/**
 * A hook a caller (an entity slice) can register to reject a mutation
 * before it reaches the collection — e.g. a uniqueness check before create,
 * or a referential-integrity check before delete. Returning a plain string
 * fails the request with `409 Conflict` and that message; returning an
 * {@link ICodedConflict} fails it with that distinct `code` instead;
 * returning an {@link IStructuredConflict} fails it with the richer
 * `DependencyConflict` body instead (message plus the blocking entity's type
 * and count); returning `undefined` lets the request proceed. On `create`,
 * `record` is the input payload cast to `T` — the record does not exist yet,
 * so only fields present on the payload should be inspected.
 */
export type TConflictCheck<T> = (
  record: T,
  action: 'create' | 'update' | 'delete'
) => string | ICodedConflict | IStructuredConflict | undefined

/** Context passed to a `validate` callback alongside the input payload. See {@link IEntityHandlerOptions.validate}. */
export interface IValidateContext<T> {
  action: 'create' | 'update'
  /** The record being patched, present only on update — absent on create, where there is nothing to merge against. */
  existing?: T
}

/** Options accepted by {@link createEntityHandlers}. */
export interface IEntityHandlerOptions<T extends IIdentifiable> {
  /** Base path the five handlers are registered under, e.g. `/events`. */
  path: string
  collection: IEntityCollection<T>
  fields?: IEntityFieldDeclaration<T>
  /**
   * Validates a create/update payload, returning a field→message map when
   * invalid. Omit for no validation. Receives `context.action` so
   * create-only requirements ("required" fields) are not enforced on a
   * partial update, and `context.existing` (present on update only) so
   * cross-field checks (e.g. end date not preceding start date) can be run
   * against the effective merged record rather than just the raw patch.
   */
  validate?: (input: Partial<T>, context: IValidateContext<T>) => Record<string, string> | undefined
  /**
   * Builds a new record's id and any server-assigned fields (e.g. timestamps)
   * from a validated create payload. Omit it and the payload is stored as-is
   * apart from its id, which is generated when the payload does not carry one
   * — `collection.insert()` stores whatever it is handed, so a record without
   * an id would be unreachable through `GET <path>/:id` afterwards.
   */
  createRecord?: (input: Partial<T>) => T
  /** Builds the patch applied on update from a validated update payload (e.g. bumping `updatedAt`). */
  buildUpdatePatch?: (input: Partial<T>) => Partial<T>
  /** Consulted before `update`/`delete` mutate a record. See {@link TConflictCheck}. */
  conflictCheck?: TConflictCheck<T>
}

function errorBody (code: string, message: string, errors?: Record<string, string>): TErrorResponse {
  return errors === undefined ? { code, message } : { code, message, errors }
}

/** Narrows a {@link TConflictCheck} result to the structured, `DependencyConflict`-shaped case. */
function isStructuredConflict (conflict: ICodedConflict | IStructuredConflict): conflict is IStructuredConflict {
  return 'entity' in conflict && 'count' in conflict
}

/** Builds the `409` response body for a {@link TConflictCheck} result — plain string, coded or structured alike. */
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

/**
 * Wraps a resolver with the shared chaos behaviour every handler in this
 * factory respects uniformly: simulated latency, then a forced status if
 * one is registered against `path` in `src/mocks/chaos.ts`.
 */
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

/** Parses the shared query vocabulary (`search`, `sort`, `order`, `page`, `perPage`) plus an entity's declared filters. */
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

/**
 * Mock-side identifier for a newly created record. Uses `crypto.randomUUID()`
 * where it exists and falls back to a UUID-shaped counter otherwise, so the
 * factory never depends on a runtime detail of the environment it is mocking
 * in (jsdom, Node and the browser all behave the same here).
 */
let generatedIdCounter = 0

function generateId (): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  generatedIdCounter += 1

  return `00000000-0000-4000-8000-${String(generatedIdCounter).padStart(12, '0')}`
}

/**
 * Guarantees the record handed to `collection.insert()` carries an id. A
 * caller's `createRecord` normally assigns one; without it the client payload
 * is stored verbatim, and a record with no id could never be read, updated or
 * deleted through the item routes.
 */
function withGeneratedId<T extends IIdentifiable> (record: T): T {
  // The payload arrives from the network, so its `id` can be absent at runtime
  // however the type declares it.
  const id = record.id as string | undefined

  return id === undefined || id === '' ? { ...record, id: generateId() } : record
}

/**
 * Produces the standard list/create/read/update/delete handlers for one
 * entity, wired to `options.collection` and respecting the shared chaos
 * controls uniformly on every route.
 */
export function createEntityHandlers<T extends IIdentifiable> (options: IEntityHandlerOptions<T>): HttpHandler[] {
  const { path, collection, fields = {}, validate, createRecord, buildUpdatePatch, conflictCheck } = options
  const itemPath = `${path}/:id`

  function findOrNotFound (id: string): T | Response {
    const record = collection.get(id)

    return record ?? HttpResponse.json(errorBody('NOT_FOUND', NOT_FOUND_MESSAGE), { status: HTTP_STATUS.notFound })
  }

  const list = http.get(path, ({ request }) => withChaos(path, () => {
    const url = new URL(request.url)
    const query = parseListQuery(url, fields)
    const result = collection.list(query)

    return HttpResponse.json({ data: result.data, meta: result.meta }, { status: HTTP_STATUS.ok })
  }))

  const create = http.post(path, ({ request }) => withChaos(path, async () => {
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

    // The *effective* post-patch record — existing fields overlaid with the
    // given patch — not the pre-patch `existing` alone, so a conflictCheck
    // that inspects a field the patch changes (e.g. a uniqueness check on
    // `name`) sees the value the update would actually produce.
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

  const remove = http.delete(itemPath, ({ params }) => withChaos(itemPath, () => {
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
