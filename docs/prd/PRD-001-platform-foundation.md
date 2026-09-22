# PRD-001 — Platform Foundation: Mock API, Typed Contract, Error Handling, Docker

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | — (foundation) |
| **Blocks** | PRD-002 … PRD-009 |

## Problem Statement

The repository is an empty application skeleton. There is no backend, and the one
piece of API wiring that exists points at a third-party demo service
(`fakerestapi.azurewebsites.net`): the `postinstall` script downloads an OpenAPI
document from the public internet and generates `schema.ts` from it.

That arrangement fails the project in three concrete ways:

1. **It cannot be containerised.** A Docker build has no guarantee of network
   access, and even with it, a remote third party silently controls our type
   definitions. The build is not reproducible.
2. **It describes the wrong domain.** The generated types are about Books, Authors
   and Activities. Nothing in them relates to Events, Ticket Categories or Tickets.
3. **There is nothing to develop against.** No data, no endpoints, no errors. Every
   feature team would invent its own ad-hoc stub, and those stubs would disagree.

Beyond the contract, the error and feedback path is a stub too. The response
interceptor returns `response.data` and rejects errors unchanged. Nothing turns a
failed request into something an administrator can understand, nothing distinguishes
a validation failure from an expired session, and there is no notification surface at
all. Every subsequent feature would have to solve this again, differently.

Finally, an administrator evaluating this application has to be able to run it. Today
that means installing the right Node version and hoping the remote schema service is
up.

## Solution

Build the platform layer that every feature in this project stands on.

**One contract, owned locally.** A hand-written OpenAPI 3.1 document in the
repository becomes the single source of truth for the entire API surface. Types are
generated from that local file, so generation is offline, deterministic and reviewable
in a pull request. When the contract changes, the diff shows exactly what changed.

**A mock backend that behaves like a backend.** Mock Service Worker intercepts
requests at the network layer and serves them from an in-memory database seeded with
realistic fixtures. Because the interception happens below axios, application code is
written exactly as it would be against a real API — no branching, no injected fakes,
nothing to remove later. The same handlers run in the browser during development and
in Node during integration tests, so tests exercise the real service layer.

Critically, the mock implements **server-side semantics**: search, filtering, sorting
and pagination are computed by the handler and returned as a page plus metadata. The
UI never receives a full dataset to filter itself. This forces the client code into
the shape it would need against a real, large backend, and makes the scalability story
in `TECHNICAL_REVIEW.md` honest rather than aspirational.

**Errors handled once, centrally.** The response interceptor becomes the single place
where an HTTP failure turns into a user-facing outcome: a toast for unexpected
failures, a session reset and redirect on `401`, and a structured field-error object
handed back to forms for `400`. Individual call sites opt out of the toast when they
intend to render the error themselves.

**A container anyone can run.** A multi-stage Dockerfile builds the app and serves the
static bundle behind nginx configured for SPA routing. `docker compose up` produces a
working portal with seeded data and no external dependencies.

## User Stories

1. As a developer, I want the API contract to live in this repository, so that I can
   review changes to it in a pull request instead of discovering them after a deploy.
2. As a developer, I want type generation to run offline from a local file, so that
   `npm install` and `docker build` never depend on a third-party service being up.
3. As a developer, I want domain types to be generated rather than hand-written, so
   that the contract and the code can never silently drift apart.
4. As a developer, I want to import short domain aliases like `TTicket`, so that I
   never write a raw generated path type in feature code.
5. As a developer, I want the mock API to intercept at the network layer, so that my
   service code is identical to what it would be against a real backend.
6. As a developer, I want the same mock handlers to run in tests, so that an
   integration test exercises the real service layer rather than a mock of it.
7. As a developer, I want the mock to paginate, filter and sort server-side, so that
   the client is written correctly for a dataset that does not fit in memory.
8. As a developer, I want to reset the mock database to a known state, so that my
   tests are independent and deterministic.
9. As a developer, I want seeded data that spans several pages, multiple statuses and
   multiple currencies, so that I can see pagination and filtering actually working.
10. As an administrator, I want my data to survive a page reload, so that a demo does
    not lose everything I just entered.
11. As an administrator, I want a way to reset the demo data to its seeded state, so
    that I can start a clean walkthrough.
12. As a developer, I want the mock to simulate realistic latency, so that I build and
    can see loading states rather than assuming instant responses.
13. As an administrator, I want a clear, human-readable message when a request fails,
    so that I know whether to retry or to fix my input.
14. As an administrator, I want a success confirmation after every action that changes
    data, so that I am never left guessing whether it worked.
15. As an administrator, I want to be returned to the login screen when my session has
    expired, so that I understand why my action did not complete.
16. As a developer, I want validation errors returned per field, so that I can attach
    each message to the input that caused it.
17. As a developer, I want a single place that turns an HTTP failure into a
    notification, so that I never write error-toast code in a component.
18. As a developer, I want to suppress the global notification for a specific request,
    so that a form can render the error inline instead of duplicating it.
19. As a developer, I want a way to force the mock into failure modes, so that I can
    test error handling without editing handler code.
20. As a developer, I want in-flight requests aborted when a component unmounts, so
    that a stale response cannot overwrite fresher state.
21. As an evaluator, I want to run `docker compose up` and get a working portal, so
    that I do not have to install a toolchain to assess the project.
22. As an evaluator, I want the container to serve deep links correctly, so that
    refreshing on a nested route does not produce a 404.
23. As a developer, I want a production image that contains only static assets, so
    that the runtime surface is minimal.

## Implementation Decisions

### Domain model

Three entities, shared by every subsequent PRD.

**Event** — identifier, name, country (ISO 3166-1 alpha-2), venue, start date, end
date, status, created and updated timestamps. Status is an enum:
`draft`, `published`, `cancelled`, `completed`.

**Category** — identifier, name, description, created and updated timestamps.

**Ticket** — identifier, name, price, currency, quantity, status, event reference,
category reference, created and updated timestamps. Status is an enum:
`draft`, `on_sale`, `sold_out`, `archived`. Currency is an enum restricted to a small
supported set rather than a free-form string.

**Money is stored in minor units as an integer.** Prices are never floats. Formatting
to a locale-aware string happens at the presentation boundary only. This eliminates an
entire class of rounding defects and is the decision a reviewer will look for.

Identifiers are opaque strings (UUID-shaped). Nothing in the client may assume they
are sequential or sortable.

### Contract conventions

All list endpoints share one query vocabulary: a free-text `search`, a `sort` field
with an `order` direction, `page` and `perPage`, plus entity-specific filters declared
by the owning PRD.

All list endpoints return the same envelope: a `data` array plus a `meta` object
carrying the current page, page size, total item count and total page count. A single
shared pagination component in the contract means one client-side type and one
pagination UI, reused by every entity.

Errors return a consistent envelope containing a machine-readable code, a human
message and, for validation failures, a map of field name to message. Handlers emit
`400` for validation, `401` for an absent or invalid session, `404` for an unknown
identifier, `409` for a conflict such as a referential-integrity violation, and `500`
for a forced failure.

Successful responses use `application/json`. The generated-type helpers currently
assume a versioned content key inherited from the third-party schema; they are
corrected as part of this work.

### Modules

**Mock database (deep module).** An in-memory store exposing a narrow collection
interface — list with query options, get by id, insert, update, remove — over typed
records. All query semantics live here: text search across a declared set of
searchable fields, equality and range filters, stable sorting with a deterministic
tiebreaker, and offset pagination. Every entity handler reuses it, so filtering
behaviour cannot diverge between entities. It is pure, synchronous and unit-testable
with no MSW, no Vue and no network involved. This is the single most valuable module
in the PRD to test in isolation.

**Persistence adapter.** Wraps the mock database to hydrate from and flush to
`localStorage` under a versioned key. A version mismatch discards the stored data and
re-seeds rather than attempting a migration. Disabled under test so suites start from
a deterministic seed.

**Seed fixtures.** Deterministic generators producing enough data to make pagination
and filtering meaningful: several dozen events across multiple countries and statuses,
a handful of categories, and several hundred tickets distributed across events,
categories, statuses and currencies. Generation is seeded so the dataset is identical
on every run.

**Handler factory.** Given a collection name and its searchable/filterable/sortable
field declarations, produces the standard five REST handlers. Entity PRDs supply the
declaration and any non-standard behaviour, not five hand-written handlers. This is
what keeps the mock API from becoming a pile of copy-pasted route code.

**Chaos controls.** A development-only mechanism to inject latency, force a specific
status code on the next request to a path, or make a path fail persistently. Exposed
to tests programmatically and to the browser through a small debug surface. Without
this, error-path stories in later PRDs cannot be demonstrated.

**Response interceptor.** Normalises a successful response to its payload, and maps a
failure onto: a session reset plus redirect for `401`; a rejection carrying the parsed
field-error map for `400`; and a toast plus rejection for everything else, including
network failures and timeouts. Honours a per-request flag that suppresses the toast.
Aborted requests are swallowed silently — a cancelled request is not an error.

**Notification service.** A thin wrapper over the Element Plus notification API,
exposing success, error, warning and info. Everything that notifies goes through it,
so the presentation can be changed in one place and so tests can assert on
notifications without reaching into a UI library.

### Docker

Two stages. A build stage installs dependencies from the lockfile, type-checks and
builds. A runtime stage copies only the built assets into an nginx image with a config
that falls back to `index.html` for unknown paths, so client-side routing survives a
refresh. A compose file exposes the portal on a documented port. A `.dockerignore`
keeps `node_modules`, local environment files and the git directory out of the build
context.

Because the mock API runs inside the browser, the production image needs no second
service and no network egress.

### Testing boundary

- Mock database query engine — unit tested directly, covering search, each filter
  type, sort stability and pagination boundaries.
- Seed fixtures — unit tested for determinism and referential integrity (every ticket
  points at a real event and a real category).
- Response interceptor — unit tested against each failure class.
- Handler factory — integration tested through the service layer for one
  representative entity, proving the query vocabulary is wired end to end.

## API Contract Plan

This PRD creates the contract document and owns the following consolidated change.

**New file:** the OpenAPI 3.1 document, together with the regenerated schema module
and the local generation script that replaces the remote `postinstall` fetch.

**Shared components introduced:**

- `PaginationMeta` — page, perPage, total, totalPages
- `ErrorResponse` — code, message, optional field-error map
- `ValidationError` — the field-error map shape
- Reusable query parameters: `search`, `sort`, `order`, `page`, `perPage`
- Reusable responses: `BadRequest` (400), `Unauthorized` (401), `NotFound` (404),
  `Conflict` (409), `InternalError` (500)
- Enum components: `EventStatus`, `TicketStatus`, `Currency`, `SortOrder`

**Endpoints introduced:**

- `GET /health` — a trivial endpoint proving the mock is installed and intercepting

Entity paths are declared by their owning PRDs (PRD-004 Events, PRD-005 Categories,
PRD-006 Tickets), and authentication paths by PRD-002. No other PRD may introduce the
shared components above; they extend them only through their own contract slice.

**Generated-type helper correction:** the response content key and the path/query
parameter helpers are adjusted to match this document rather than the third-party
schema they were written against.

## Out of Scope

- Any user-facing screen. This PRD delivers no route and no page.
- Authentication endpoints and session handling — PRD-002.
- Entity endpoints and their filters — PRD-004, PRD-005, PRD-006.
- The shared list/table experience that consumes the query vocabulary — PRD-003.
- A real persistent backend, a database, or server-side rendering.
- Test runner configuration and the test suite itself — PRD-008. This PRD defines the
  testing boundary; PRD-008 builds the harness.
- CI pipelines — PRD-008.
- README and technical review content — PRD-009.

## Further Notes

The decision to run the mock inside the browser rather than as a separate service was
deliberate. It keeps the container to one image, keeps development and test behaviour
identical, and removes an entire class of "works in dev, not in test" failures. The
trade-off — that no real HTTP traffic crosses a network boundary, so CORS, cookies and
real latency characteristics are not exercised — is accepted and must be recorded in
`TECHNICAL_REVIEW.md` as intentional debt.

The handler factory is the piece most likely to be under-built. If entity PRDs end up
hand-writing their handlers, the mock will drift entity by entity and the shared list
experience in PRD-003 will start special-casing. The factory must land complete in
this PRD, with the entity declarations being genuinely declarative.

Persisting to `localStorage` is a demo convenience with a sharp edge: a reviewer who
runs an older build and then a newer one must not see a corrupted state. The version
key and discard-on-mismatch behaviour is not optional.
