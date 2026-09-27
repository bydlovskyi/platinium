# Technical Review

This document explains the decisions behind the portal, the debt I accepted on purpose, what
I would do next, and how the design holds up at a much larger scale. Most of the reasoning
was first written down in the [PRDs](docs/prd/) before any code existed. This document
consolidates it and checks it against the code as built.

File references are to the repository as of this review.

## Contents

1. [Main architectural decisions](#1-main-architectural-decisions)
2. [What I would improve with two more days](#2-what-i-would-improve-with-two-more-days)
3. [Technical debt I accepted on purpose](#3-technical-debt-i-accepted-on-purpose)
4. [What I would refactor first](#4-what-i-would-refactor-first)
5. [Scaling to hundreds of thousands of tickets and many administrators](#5-scaling-to-hundreds-of-thousands-of-tickets-and-many-administrators)
6. [Coding standards and quality checks for the team](#6-coding-standards-and-quality-checks-for-the-team)
7. [AI in the daily workflow](#7-ai-in-the-daily-workflow)

---

## 1. Main architectural decisions

### A local OpenAPI contract is the single source of truth

[`src/mocks/openapi.yaml`](src/mocks/openapi.yaml) describes every endpoint. `npm install`
generates [`schema.ts`](src/features/platform/api/schema.ts) from it. The axios client is
augmented so that `apiClient.get('/events/{id}', …)` is typed by the path literal: params,
body and response ([`dts/axios.d.ts`](src/features/platform/api/dts/axios.d.ts)). The mock
handlers are typed against the same file.

- **Rejected:** the project template downloaded a third-party schema on `postinstall` and
  generated types from it. That schema described the wrong domain. It also let a third party
  change our types silently, and it needed network access, so a Docker build could not
  reproduce it.
- **Why:** generation is offline, deterministic and reviewable in a pull request. When the
  contract changes, the type checker lists every call site that has to follow.
- **Cost:** the contract is one shared file. Parallel branches that both touch it conflict
  inside generated code, which is unreadable. I made it a process rule: only a dedicated
  contract slice may edit the spec.

### The mock backend behaves like a backend

[MSW](https://mswjs.io) intercepts requests below axios, as a service worker in the browser
and in Node for tests. The handlers in [`src/mocks/handlers/`](src/mocks/handlers/) run over
an in-memory database in [`src/mocks/db/`](src/mocks/db/). All of these happen on the
"server":

- search, filters, sorting and pagination;
- uniqueness checks and referential integrity (`409`);
- bulk operations and CSV generation;
- dashboard aggregation;
- role checks.

The UI never receives a full dataset.

- **Rejected:** a separate mock-server container (json-server). Also rejected: shipping the
  whole dataset and filtering it in the browser.
- **Why:** application code is exactly what it would be against a real API. There is no
  branching, no injected fakes and nothing to delete later. The same handlers serve the
  browser and the integration tests, so the tests exercise the real service layer. Keeping
  the semantics on the server forces the client into the shape it needs against a large
  dataset. That is what makes [section 5](#5-scaling-to-hundreds-of-thousands-of-tickets-and-many-administrators)
  honest rather than aspirational.
- **Cost:** no request crosses a real network boundary, so CORS, cookies and real latency
  are never exercised. The mock is also more lenient than a real server would be: list and
  read endpoints do not check the token (`factory.ts`, `auth.ts`).

### List state lives in the URL

[`useListQuery`](src/composables/useListQuery.ts) treats the route query as the source of
truth for search, filters, sort, page and page size. It implements the following once, for
every list:

- a 300 ms debounce on search;
- a reset to page 1 when any filter changes;
- defaults left out of the URL;
- defensive parsing of bad input.

[`useListResource`](src/composables/useListResource.ts) fetches on every query change,
aborts the superseded request and ignores stale responses.

- **Rejected:** local `ref`s per screen. Built independently, three lists drift apart: one
  debounces at 300 ms and another at 500 ms, one resets the page and another does not.
- **Why:** a view can be shared, reloaded and restored with the back button. Returning from
  an edit screen restores the exact list. The deep links from the dashboard to a filtered
  ticket list work by construction.
- **Cost:** more code than local state. Parsing, defaults and history semantics all have to
  be right. I treat these as product properties, not developer conveniences.

### Money is stored in integer minor units

Prices are integers in cents or pence, never floats. The currency is required, with no
default. [`CurrencyInput`](src/components/CurrencyInput.vue) wraps `el-input-number` and is
meant to be the one place where major and minor units are converted. The dashboard reports
value per currency and never adds euros to pounds.

- **Rejected:** floats. Rounding bugs from floats are invisible in a demo and expensive in
  production.
- **Cost:** every boundary has to convert. One conversion slipped past this rule: the price
  filter in `useTicketsList` converts at a fixed two decimals
  ([section 4](#4-what-i-would-refactor-first)).

### Dependencies point in one direction

`component → composable → store → service → apiClient`. Services know nothing about stores
or composables. A store exists only when state is genuinely shared; `auth` is the only one,
because the guard, the shell and the permission checks all read it. Entity lists are not
stores, because nothing else reads them.

- **Rejected:** a store per entity by habit. It adds a second cache of server data with its
  own staleness problems.
- **Cost:** the rule is enforced by convention, review and an AI hook, not by the linter.
  Auto-imports make it hard to lint, because there are no `import` statements to inspect.
  [Section 6](#6-coding-standards-and-quality-checks-for-the-team) explains how I would close
  that gap.

### One configurable table instead of three

[`AppDataTable`](src/components/data-table/AppDataTable.vue) is driven by column descriptors:
key, label, sortable, alignment, responsive priority and cell slot. It emits intent (sort,
select, row action) and holds no fetching logic. Every list therefore shares one
implementation of sorting, selection, skeleton, empty, error and retry states. Below tablet
width the same descriptors render as `el-card` rows that show only high-priority columns,
so the mobile layout is switched in one place instead of being a media query on each table.

- **Rejected:** a table per entity. Each one would be defensible on its own, and together
  they would be incoherent.
- **Cost:** the descriptor API has to stay general. When an entity screen needs a `v-if`
  inside the table, the abstraction has started to leak.

### Element Plus first

Shared components wrap Element Plus rather than replace it. The mapping is:

| Shared component | Element Plus underneath |
|---|---|
| `AppDataTable` | `el-table` |
| `ListToolbar` | `el-form`, `el-select`, `el-date-picker` |
| `StatusTag` | `el-tag` |
| `CurrencyInput` | `el-input-number` |
| `RemoteSelect` | `el-select` with remote search and infinite scroll |
| `useConfirm` | `ElMessageBox` |
| Pagination | `el-pagination` |

Theming goes through `--el-*` CSS variables mapped onto the design tokens. `.el-*` class
overrides are a last resort and each carries a comment. The policy and the full component
map are in [`ELEMENT-PLUS.md`](docs/prd/ELEMENT-PLUS.md). The audit found no raw `<button>`,
`<input>`, `<select>` or `<table>` left in the codebase.

- **Rejected:** a bespoke component set, which is months of accessibility and behaviour
  work that Element Plus already ships and tests. Also rejected: a headless library such as
  Radix Vue, which gives accessible primitives but leaves all the styling to us; for an
  internal admin tool that is the wrong place to spend effort.
- **Cost:** bundle weight, which per-component auto-import and per-component CSS imports
  partly mitigate. Tests couple to `.el-*` class names where Element Plus exposes no role. A
  major version upgrade becomes a real task. There is also one trap: a forgotten theme-chalk
  stylesheet import passes every test, because jsdom renders no CSS.

### Smaller decisions worth naming

- **Refuse, never cascade.** Deleting an event or category that tickets still reference
  returns `409` with the blocking count. Deleting an unknown number of tickets silently
  behind one confirmation is the wrong default.
- **No client-side uniqueness pre-check.** Check-then-write is a race, and the server has to
  enforce uniqueness anyway.
- **Bulk endpoints with per-row results.** A client loop of N requests has no transactional
  meaning and cannot report partial failure coherently. Partial success is treated as the
  normal case.
- **One aggregate dashboard endpoint.** The alternative is six list requests reduced in the
  browser, which would not survive a real dataset.
- **CSV export is a `format=csv` parameter on the list endpoint.** Export and list share one
  implementation of filtering and sorting, so the file always matches what the admin sees.
- **Permissions are enforced in three layers.** The UI removes controls (`v-if`, not
  `disabled`), the router guard redirects to a 403 page, and the server rejects the write.
  Only the third is a real control; the first two are usability. One composable,
  [`useCapability`](src/composables/useCapability.ts), answers every permission question, so
  nothing compares roles on its own.
- **Modal or route?** A form with more than three fields, a cross-field rule or a complex
  control gets its own route. Categories use an `el-dialog`; events and tickets use routes.

---

## 2. What I would improve with two more days

The list is ranked. Correctness comes before structure, structure before features, and a
cheap fix that prevents a whole class of bug comes before an expensive one that prevents a
single bug.

1. **Fix the two defects this review found, and the tests that missed them** (half a day).
   - **Events CSV export returns an empty file unless a country filter is set.**
     `Events.vue` sends `country: ''` because `?? undefined` does not replace an empty
     string. The mock then matches nothing. `csv-export.spec.ts` checks the file name and
     MIME type but not the rows, so the test passes.
   - **Dates show one day early for anyone west of UTC.** `formatDate` parses `2026-09-27`
     as UTC midnight, which is the evening of the 26th in New York.

   Both are small fixes. The lesson is to assert on the content, not the envelope.
2. **Build and smoke-test the Docker image in CI** (half a day). The production image did
   not build for five days, and when it did, the bundle shipped without its mock API. The
   first problem only surfaced when I ran `docker compose up` by hand. CI builds with Vite
   but never builds the image or opens it in a browser. The fix is `docker build` plus one
   Playwright journey against the running container: sign in, open each list, create a
   ticket. It costs little and guards the path every reviewer takes first.
3. **Extract the list-page and form composables** (one day). About 120–150 lines of each
   list page are the same wiring: bulk delete and archive, single delete with page
   step-back, CSV export, row actions filtered by capability, and selection. The three forms
   also re-implement dirty tracking, server field errors, loading with a stale-id guard, and
   submit. A fourth entity would copy all of it again. See
   [section 4](#4-what-i-would-refactor-first).
4. **Optimistic concurrency on updates.** Today two administrators who edit the same ticket
   get last-write-wins with no warning. The brief names concurrent administrators, and the
   fix touches the contract, the mock and the form. It ranks below the refactor because it
   is much easier to add once, in a shared form composable, than three times. See
   [section 5.5](#55-concurrent-administrators).
5. **Lint rules for the layering.** This stops the architecture from eroding as the team
   grows. It ranks here because nothing violates the rules today.
6. **A query cache.** See [section 5.3](#53-caching-and-invalidation). It becomes worth doing
   only once real latency and multiple administrators exist.

---

## 3. Technical debt I accepted on purpose

Each item states what I accepted, why it is reasonable here, what it would cost in
production, and what would change my answer.

### Session token in `localStorage`

- **What:** the bearer token from `POST /auth/login` is stored in `localStorage` under
  `platinum:auth-token`. The request interceptor reads it back and attaches
  `Authorization: Bearer <token>`.
- **Why it is fine here:** an httpOnly cookie needs a server to send `Set-Cookie` and read
  it back. The only "server" is an MSW worker in the same page. The mock still rejects
  writes without a valid token, so the `401` path is exercised as it would be against a
  cookie session.
- **Production cost:** any script that runs in the page can read and exfiltrate the token.
  That could be an XSS bug, a compromised dependency or a third-party script.
- **What changes the answer:** a real backend. The session then becomes an httpOnly,
  `SameSite=Lax` cookie with a short lifetime and a refresh flow, and the client stops
  touching the token at all.

### No optimistic updates

- **What:** every mutation waits for the server before the UI changes.
- **Why it is fine here:** against a mock with 400 ms latency, the visible benefit is nil.
  The cost is real: rollback on every mutation, plus reconciliation logic that cannot be
  tested honestly without artificial latency.
- **Production cost:** the UI feels slow on real networks, especially for bulk actions.
- **What changes the answer:** real latency. I would start with bulk status changes, where
  the wait is long enough to notice, and prove the rollback with the existing chaos
  controls.

### No end-to-end (Playwright) suite

- **What:** tests run in Vitest and jsdom. Integration tests mount the real app with a real
  router, real Pinia and MSW, but no real browser is involved.
- **Why it is fine here:** the backend is a mock that runs in the page. A browser suite would
  exercise the same handlers the integration suite already covers, at several times the
  setup, runtime and CI cost.
- **Production cost:** jsdom does not render CSS or evaluate media queries, so layout
  regressions, missing stylesheets and service-worker problems go unnoticed. The Docker
  defect in [section 2](#2-what-i-would-improve-with-two-more-days) is exactly this kind.
- **What changes the answer:** a real backend. At that point a thin smoke layer against the
  built artifact pays for itself. I would add that layer before item 2 above, not after it.

### Status transitions are free

- **What:** any status can move to any other, for example a cancelled event back to
  published, or an archived ticket back on sale.
- **Why it is fine here:** the brief gives no lifecycle rules. Inventing them would be
  guesswork presented as a feature.
- **Production cost:** records can reach invalid lifecycle states, such as tickets on sale
  for a cancelled event.
- **What changes the answer:** real sales, or an approval workflow. The transition graph
  would then live on the server, and the form would disable the transitions the server
  rejects.

### Dates are whole days and timezone-naive

- **What:** event dates are `YYYY-MM-DD` strings and are compared as strings.
- **Why it is fine here:** an event occupies whole days, so a time component would raise
  timezone questions the domain does not need.
- **Production cost:** the display bug in
  [section 2](#2-what-i-would-improve-with-two-more-days). The dashboard's "today" is also
  UTC, so "currently running" can be wrong for a few hours around midnight.
- **What changes the answer:** start times, doors-open times, or venues in several
  timezones. Dates would then be stored as UTC instants alongside the venue's IANA
  timezone, and shown in the venue's local time.

### No cross-currency aggregation

- **What:** the dashboard shows gross value separately for each currency.
- **Why it is fine here:** this is correctness rather than debt. A single total that mixes
  euros and pounds is not a number.
- **Production cost:** there is no single "total inventory value" figure.
- **What changes the answer:** a source of exchange rates and a reporting currency. The
  total would carry the date of the rate it used.

### Selection is scoped to one page

- **What:** "select all" means this page only. The selection clears whenever the query
  changes, and a bulk request is capped at 100 ids.
- **Why it is fine here:** the most dangerous bug this feature could have is acting on rows
  that have left the current filter.
- **Production cost:** an admin cannot archive all 3,000 tickets that match a filter.
- **What changes the answer:** that need. The fix is a server-side "apply to query"
  operation that stores a snapshot of the filter and asks for an explicit count
  confirmation ("Archive 3,124 tickets?").

### No request cache

- **What:** every mount and every query change refetches. The only deduplication is
  aborting the superseded request.
- **Why it is fine here:** one administrator and a local mock have no staleness problem to
  solve, and a cache adds invalidation bugs.
- **Production cost:** redundant requests, a skeleton flash on back navigation, and no shared
  freshness policy.
- **What changes the answer:** real latency or multiple administrators. See
  [section 5.3](#53-caching-and-invalidation).

### Also accepted

- **Offset pagination.** It is correct at this size. See [section 5.1](#51-pagination).
- **Mock data persistence is discarded when its schema version changes**, with no
  migration. It is demo data, and it reseeds deterministically.
- **No coverage threshold.** Coverage is reported in CI but does not gate the build. A
  threshold rewards tests of trivial code; I would rather review which paths are tested.
- **Delete conflicts are not linked.** A `409` tells the admin how many tickets block the
  delete. The PRD asked for a link to that filtered ticket list, and it was not built.

---

## 4. What I would refactor first

I identified these from the code as it exists now, not from the plan.

1. **Extract `useEntityListPage` from the three list views.** `Tickets.vue` has 501 lines,
   `Events.vue` 378 and `Categories.vue` 241. The following blocks are near-verbatim copies:
   - `dataTableSort`, `rowKey` and the capability-filtered `rowActions`;
   - bulk delete with "step back a page if everything visible was deleted";
   - bulk archive;
   - single delete: confirm, then the leave animation, then page-back or refetch;
   - CSV export;
   - the selection handlers;
   - the bulk action bar;
   - `BulkResultDialog`.

   The dependency-conflict toast appears three times. The CSV handler also rebuilds the
   filter-to-request mapping that the list composable already computes, which is how the
   empty-export bug got in. After the refactor, each view declares its columns, filters and
   service, and nothing else.
2. **Extract `useEntityForm` from `EventForm`, `TicketForm` and `CategoryModal`.** The shared
   logic is:
   - the clone and baseline model with a dirty check;
   - the unsaved-changes guard;
   - server field errors (`fieldError`, `clearServerError`);
   - loading a record with a stale-id guard;
   - submit (validate, create or update, toast, mark clean, navigate, map `400` field errors).

   Optimistic concurrency ([section 5.5](#55-concurrent-administrators)) then goes in once.
3. **Make error handling consistent.** Four gaps:
   - The two routed forms catch only validation errors, so any other `409` fails silently.
   - A `400` without field errors shows nothing.
   - A bulk `5xx` shows two toasts, one from the interceptor and one from
     `useBulkOperations`.
   - A stale `categoryId` deep link on Tickets toasts a `404`, while the equivalent event
     chip suppresses it.

   One policy should decide which layer owns the message.
4. **Restore the single money boundary.** The ticket price filter converts at a fixed two
   decimals in `useTicketsList.ts`. It should use the same currency-aware conversion as
   `CurrencyInput`, extracted into a utility that both call.
5. **Deduplicate the mock layer.** `withChaos` and `errorBody` are each defined three times
   (the handler factory, `auth.ts` and `dashboard.ts`). Searchable fields are declared in
   both the database and the handler, and one of the two copies is ignored.
6. **Remove the template leftovers:**
   - `Compute.vue` and `general.service.ts`, both unused;
   - the unused rules in `useFormConfig.ts`;
   - the `exampleEventName` key;
   - the deprecated `formatCurrency`;
   - the host components duplicated inside two spec files, which cause all five lint
     warnings; one shared `withSetup` test helper replaces them.
7. **The one Element Plus override without a comment:** `PageHeader.vue` styles
   `[&>.el-button]` with a Tailwind variant but does not say why no `--el-*` variable could
   do it.

---

## 5. Scaling to hundreds of thousands of tickets and many administrators

The client is already shaped for this. The server filters, sorts and paginates; the
dashboard is one aggregate call; `RemoteSelect` pages and searches instead of loading every
event. What follows is what breaks first and what replaces it.

### 5.1 Pagination

Offset pagination (`?page=57&perPage=20`) breaks in two ways at scale:

- **Cost.** `OFFSET 1120` makes the database walk and discard 1,120 rows, and the total
  count needs a separate `COUNT(*)` over the whole filtered set on every request. Deep pages
  and broad filters on a large tickets table become the slowest queries in the system.
- **Correctness under concurrent writes.** When another administrator creates or deletes a
  ticket while you page, rows shift between pages. You see a row twice, or never.

**Cursor (keyset) pagination** replaces the offset with the sort key of the last row seen,
for example `?after=<price, id>`. The database seeks through an index instead of scanning.
The mock already sorts with a deterministic tiebreaker on `id`, which is the prerequisite.
The UI changes in visible ways:

- **No page numbers.** `el-pagination` becomes "Previous / Next", or "Load more" with
  infinite scroll. You cannot jump to page 57, and for an admin looking for something, a
  better filter is the right answer anyway.
- **An approximate total.** "10,000+ tickets", or an estimate from the query planner,
  instead of an exact count.
- **A cursor in the URL instead of a page.** `useListQuery` already resets position on any
  filter or sort change. A cursor is valid only for the sort it was issued under, so that
  rule carries over unchanged. Shared links drop the cursor and open at the start.
- **Keep offset pagination where it is cheap.** Categories are a short list.

### 5.2 Rendering

At 20–100 rows per page, `el-table` is fine, and paging is what keeps the DOM small. Once the
list becomes infinite scroll, rows accumulate and the table needs virtualisation:

- **`el-table-v2`** renders only the visible rows. Its API is different: an array of columns
  with `cellRenderer` functions instead of `<el-table-column>` children with slots, fixed
  row heights, and selection that we implement ourselves.
- **`AppDataTable` is the seam that makes the switch affordable.** Screens pass descriptors,
  not table markup, so the change is contained in one component. The descriptors map to
  `el-table-v2` columns, and `cellSlot` becomes a `cellRenderer` that renders the named
  slot. The mobile card view needs the same treatment with a virtual list. Rows currently
  wrap long names over several lines, so row height has to be fixed, or measured, which
  costs more.

### 5.3 Caching and invalidation

With real latency and several administrators, refetching everything on every navigation is
both slow and inconsistent. I would introduce **TanStack Query** (`@tanstack/vue-query`)
behind the existing composables:

- **Query keys.** The key is the entity plus the normalised query object `useListQuery`
  already builds, for example `['tickets', 'list', { status: 'on_sale', page: 2 }]`. The
  back button then renders instantly from cache, and the previous page stays on screen while
  the next one loads, so the skeleton stops flashing.
- **Invalidation by prefix after mutations.** Updating a ticket invalidates
  `['tickets', 'detail', id]`, `['tickets', 'list']` and `['dashboard']`. Deleting an event
  also invalidates `['tickets']`, because ticket rows show event names. These relationships
  should be written down once, next to the services, not scattered through components.
- **Freshness across administrators.** A short `staleTime` and refetch on window focus cover
  most of it. For live collaboration, the server pushes `ticket.updated` events over SSE or
  a WebSocket, and the client invalidates the matching keys. Pushing events and letting the
  client refetch is simpler and safer than patching cached rows from the event payload.
- **Deduplication.** Two components that ask for the same event share one request.

`useListResource` keeps its public API and delegates to the query cache, so the views do not
change.

### 5.4 Server-side work

- **Dashboard.** Aggregation is already on the server. At scale, the counters should come
  from pre-computed tables or a materialised view that is updated on write or every minute,
  and the dashboard shows "updated 1 min ago" instead of pretending to be live.
- **Search.** Substring matching becomes a trigram index or a search engine such as
  OpenSearch, with a minimum query length. The 300 ms debounce stays.
- **CSV export.** It is synchronous today. For 300,000 rows it becomes a job: request the
  export, get a job id, get a notification when it is ready, then download from a signed
  URL. The rows are streamed, never built in memory.
- **Bulk actions on a whole query.** These become server-side jobs with a filter snapshot
  and a count confirmation (see [section 3](#selection-is-scoped-to-one-page)).
- **What moves to the server when the mock goes.** The contract does not change, so the
  client does not either. What moves:
  - authentication, as httpOnly cookies with refresh;
  - authoritative validation;
  - permission checks, which the mock already models on the server side;
  - aggregates and export jobs.

  I would keep MSW for tests, and add contract tests that verify the real backend against
  `openapi.yaml`.

### 5.5 Concurrent administrators

**Optimistic concurrency control** stops one administrator from silently overwriting
another. Every record carries a `version`, or an ETag derived from `updatedAt`, which the
mock already bumps but never checks. The flow:

1. The form keeps the version it loaded.
2. `PATCH` and `DELETE` send `If-Match: <version>`.
3. If the record has changed since, the server returns `412` with the current record.

**The conflict UI.** The form does not throw the admin's work away:

- A banner reads "This ticket was changed by Anna at 14:02 while you were editing."
- Each field the other admin changed shows both values: "Price: yours €45.00 · theirs
  €49.00".
- Fields that only one side changed merge automatically.
- The admin chooses one of two actions:
  - **Keep mine** re-submits their values against the new version. It is a deliberate
    overwrite.
  - **Take theirs** discards their edits for the conflicting fields.

The unsaved-changes guard and the server-field-error mapping already exist, so this is an
extension of the form, not a new mechanism. It belongs in the `useEntityForm` extraction.

Related pieces:

- **Deletes** use the same check. Deleting a record that has already been deleted returns
  `404` and shows "already deleted".
- **Bulk actions** report version conflicts per row in the existing result dialog.
- **Records store `updatedBy`.** Without it, the banner cannot say who made the change.
- **Presence**, such as "Anna is editing this ticket", is a nice addition on top of the
  push channel from 5.3, but it does not replace the version check.

### 5.6 Bundle

- **Every route is already lazy-loaded** (`() => import(...)`).
- **Element Plus components and their CSS are imported per component**, not as the whole
  library.
- **The MSW worker is a separate dynamic chunk** that is never loaded when mocks are off.

Next, I would add a size budget in CI (`size-limit`), so a stray full-library import fails
the build rather than a Lighthouse report weeks later. I would also prefetch the likely next
route, from list to form, when the user hovers over "Create".

---

## 6. Coding standards and quality checks for the team

**What exists today:**

| Where | What runs |
|---|---|
| `pre-commit` | ESLint on staged files |
| `pre-push` | Type-check and the full test suite |
| CI | Lint, type-check, both suites with a coverage report, and a production build |
| Written conventions | [`architecture.md`](architecture.md), [`TESTING.md`](TESTING.md), [`ELEMENT-PLUS.md`](docs/prd/ELEMENT-PLUS.md) and the [design system](docs/design-system.md) |

For a team, I would add the following, in this order:

1. **CI must not autofix.** `npm run lint` runs `eslint --fix`, so CI can pass on code that
   was never committed in the shape that passed. CI should run `eslint . --max-warnings 0`
   without `--fix`.
2. **Build the Docker image in CI and run a smoke test against it**, as described in
   [section 2](#2-what-i-would-improve-with-two-more-days).
3. **Enforce the layering mechanically.** Auto-imports hide dependencies from
   `no-restricted-imports`. There are two options:
   - Turn off auto-imports for stores and services, so dependencies are visible again.
   - Write a small custom ESLint rule that flags identifiers by file type, for example a
     `use*Store` identifier inside a `*.service.ts` file.

   Either way the rules in `architecture.md` become errors instead of review comments.
4. **Contract governance.** Lint `openapi.yaml` with Spectral, check for breaking changes
   with `oasdiff` whenever the spec changes, and have CI regenerate `schema.ts` and fail if
   the result differs from the committed file.
5. **Conventional commits, enforced.** The history already follows them informally.
   `commitlint` in a `commit-msg` hook makes them mandatory, and a tool such as
   release-please then generates the changelog.
6. **A pull request template and CODEOWNERS.** The template asks for:
   - what changed and why;
   - screenshots in light, dark and mobile;
   - the tests added;
   - whether the contract changed;
   - whether every new Element Plus component has its stylesheet imported, a check no test
     can make.

   CODEOWNERS covers `openapi.yaml` and `src/features/platform/`.
7. **Dependency and security scanning.** Renovate for updates, the OSV scanner or
   `npm audit` in CI, and CodeQL. The CSV export already guards against formula injection,
   and that kind of issue should be found by a tool, not by luck.
8. **Accessibility checks.** Run `axe` in the integration tests of the main screens.
9. **A definition of done:**
   - The acceptance criteria are met.
   - Tests are written at the level the spec names: unit or integration.
   - Lint and type-check are clean.
   - The feature is checked in a browser in both themes and at mobile width.
   - Error, empty and loading states are designed.
   - Documentation is updated.
10. **Architecture decision records.** The "Implementation Decisions" sections of the PRDs
    already serve as ADRs. For a team, I would move them to `docs/adr/` as numbered records
    that are superseded rather than edited.

---

## 7. AI in the daily workflow

This project was built with AI end to end, deliberately and with explicit controls. The full
account, including where the AI was wrong and how that was caught, is in
[`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md). In short:

- **Specifications come before code.** The brief became ten PRDs through structured
  interviews. The PRDs became 41 vertical-slice issues with an explicit dependency order.
  The AI implements against a written spec, never against a chat message.
- **Conventions are loaded, not remembered.** Project skills such as `code-conventions`, and
  a hook that reminds the agent of the path-specific rules whenever it writes a file, carry
  the architecture into every session.
- **Gates, not trust.** Every slice had to pass lint, type-check, the tests at the level the
  PRD named, a multi-agent review pass and a browser check. A human merged every pull
  request.

**What I did not delegate:**

- the decisions recorded in the PRDs;
- design choices: palette, typography, density, motion;
- merging;
- this review.

The AI is good at applying a decision consistently across forty files. It is not the one who
should make the decision.

**Day to day on this project, I would:**

- write the spec, or refine it with the AI, before starting a feature;
- let the agent implement a slice on a branch;
- run a separate AI review pass with a different brief (security, architecture, tests)
  before I review it myself;
- use the AI for the tedious, verifiable work: tests for error paths, contract
  propagation, migrations such as the list- and form-composable extractions in
  [section 4](#4-what-i-would-refactor-first).

Anything that needs taste or accountability stays with a person: product decisions,
security trade-offs, and the final review before merge.
