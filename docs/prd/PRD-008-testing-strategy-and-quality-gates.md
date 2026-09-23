# PRD-008 — Testing Strategy & Quality Gates

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001 (harness), PRD-002 … PRD-007 (suites) |
| **Blocks** | PRD-009 (documented commands must be real) |

## Problem Statement

This repository has no test runner. Not an empty suite — no Vitest, no
`@vue/test-utils`, no configuration, no command. Yet every PRD from 001 to 007 declares
a testing boundary and lists tests as acceptance criteria, and the assessment names unit
tests and integration tests as separate deliverables.

The harness therefore has a scheduling problem that must be stated plainly: **the
configuration half of this PRD blocks PRD-001, while the suite half depends on every
feature PRD being complete.** Written as a single unit of work scheduled at the end, it
guarantees that seven PRDs are implemented with no way to run their own acceptance
criteria, and the tests get retrofitted against code that was never shaped to be
testable. The split is not a formality — it determines whether the tests are written
with the features or after them.

There is also a quality-gate gap. Husky hooks exist, but nothing in the repository
documents what they run or what a contributor must satisfy before opening a pull
request. ESLint is configured; type-checking is a separate command; neither is
demonstrably enforced. A reviewer assessing engineering practice will look for the gates
as much as for the tests.

Finally, "an appropriate testing strategy" is a judgement, not a coverage number. A
portal of this shape rewards testing a few deep modules exhaustively and a few user
journeys end to end, and rewards testing presentational components barely at all. That
judgement needs to be written down, because an undocumented strategy decays into
whatever each contributor felt like writing.

## Solution

**One runner, two projects.** Vitest in a jsdom environment, configured with two named
projects sharing one transform pipeline: `unit` and `integration`. One dependency set,
one command to run everything, and the ability to run either half alone. A second runner
for integration tests would double the configuration and the CI time for no gain.

**Integration tests use the real everything.** A real router, a real Pinia instance,
real services, real components — including the real Element Plus components they are
built from — and MSW answering the network, using the exact handlers that serve the
browser during development. Nothing between the component and the wire is mocked, and no
Element Plus component is stubbed. That is what makes these integration tests rather than component tests with a
stubbed service, and it is the reason PRD-001 invested in handlers that run in Node.

**A test kit that removes the boilerplate.** Mounting a view with a configured router,
seeding a session, resetting the mock database, and waiting for a settled list are each
needed by most integration tests. Written inline they are copied twelve times and drift.
Extracted into a small kit, the tests read as user journeys.

**A strategy that is written down and shaped like the code.** Deep modules —
the mock query engine, the list query composable, the currency input, the CSV
serialiser, the capability check — are tested exhaustively at their boundary, including
edge cases. User journeys are tested end to end through the UI. Presentational
components with no logic are not tested directly; they are covered by the journeys that
render them. Element Plus itself is not re-tested either — tests assert the portal's
behaviour through the Element Plus components it configures, not the library's. Coverage is reported and reviewed, but no numeric threshold gates the
build, because a threshold pushes contributors toward testing what is easy rather than
what matters.

**Gates that run before a review, not after.** A pre-commit hook lints and formats the
staged changes; a pre-push hook runs type-checking and the full suite. A CI workflow
runs lint, type-check, the suite with coverage, and the production build on every push
and pull request. The same commands in all three places, so nothing passes locally and
fails in CI.

## User Stories

1. As a developer, I want a single command that runs every test, so that I can verify my
   work before pushing.
2. As a developer, I want to run only the unit tests, so that I get fast feedback while
   working on a module.
3. As a developer, I want to run only the integration tests, so that I can check user
   journeys without waiting for everything.
4. As a developer, I want a watch mode, so that tests re-run as I edit.
5. As a developer, I want to run a single file or a single test by name, so that I can
   focus on one failure.
6. As a developer, I want a coverage report, so that I can see what is untested.
7. As a developer, I want a readable failure message pointing at the assertion, so that I
   can diagnose without adding logging.
8. As a developer, I want tests to run in parallel, so that the suite stays fast as it
   grows.
9. As a developer, I want the suite to finish in under a minute, so that I actually run
   it.
10. As a developer, I want MSW to serve tests with the same handlers the browser uses, so
    that a passing test means the real integration works.
11. As a developer, I want the mock database reset between tests, so that one test cannot
    affect another.
12. As a developer, I want to seed a specific dataset for a test, so that I can assert on
    known values.
13. As a developer, I want to force an API failure in a test, so that I can verify error
    handling without editing handlers.
14. As a developer, I want a helper that mounts a view with a router and a session, so
    that my tests start at the interesting part.
15. As a developer, I want a helper that waits for a list to settle, so that I do not
    write arbitrary timeouts.
16. As a developer, I want to sign in as either role in a test, so that I can verify
    permissions.
17. As a developer, I want auto-imported globals available in tests, so that test files
    look like source files.
18. As a developer, I want a deterministic clock available, so that date-dependent
    assertions do not fail overnight.
19. As a developer, I want tests to fail on an unhandled network request, so that a
    missing handler is caught rather than silently returning nothing.
20. As a developer, I want the mock query engine tested exhaustively, so that every
    entity's filtering inherits proven behaviour.
21. As a developer, I want the list query composable tested exhaustively, so that URL
    state cannot regress across three screens at once.
22. As a developer, I want the currency conversion tested exhaustively, so that money is
    never wrong.
23. As a developer, I want the CSV serialiser tested against awkward input, so that a
    venue containing a comma does not corrupt an export.
24. As a developer, I want every store and every composable covered, so that the state
    layer is trustworthy.
25. As a developer, I want the complete login journey tested, so that access cannot break
    unnoticed.
26. As a developer, I want a full CRUD journey tested for each entity, so that a
    regression in any one is caught.
27. As a developer, I want search, filter, sort and pagination tested through the UI, so
    that the dashboard requirements are verifiably met.
28. As a developer, I want validation failures tested end to end, so that field errors
    reaching the right input is proven rather than assumed.
29. As a developer, I want API failure handling tested end to end, so that an
    administrator always sees a message rather than a blank screen.
30. As a developer, I want the permission model tested from both roles, so that
    enforcement is real.
31. As a developer, I want responsive presentation tested at each breakpoint, so that the
    mobile experience cannot silently regress.
32. As a contributor, I want a pre-commit hook that lints my staged changes, so that I do
    not commit a style violation.
33. As a contributor, I want a pre-push hook that type-checks and tests, so that I do not
    push a broken branch.
34. As a contributor, I want to bypass a hook in a documented emergency, so that a
    genuine hotfix is not blocked.
35. As a reviewer, I want CI to run the same gates on every pull request, so that a
    bypassed hook is still caught.
36. As a reviewer, I want CI to run the production build, so that a build-only failure is
    caught before merge.
37. As a reviewer, I want the coverage report visible on a pull request, so that I can see
    what the change left untested.
38. As a contributor, I want the testing strategy documented, so that I know what to write
    and what not to.
39. As a contributor, I want a documented convention for naming and locating tests, so
    that the suite stays navigable.

## Implementation Decisions

### Component library

Every screen under test is built from Element Plus, governed by
[`ELEMENT-PLUS.md`](./ELEMENT-PLUS.md); shared components wrap Element Plus rather than
replace it. This PRD owns how those components are tested — see *Testing Element Plus
components* below — and the runner configuration that makes Element Plus behave in jsdom.

### Scheduling — the two halves

**Harness (blocks PRD-001).** Runner configuration, the MSW Node server, the test kit,
the setup files, the scripts, the hooks and the CI workflow. Everything a contributor
needs to write a test. This must exist before any feature PRD begins; otherwise those
PRDs cannot meet their own acceptance criteria.

**Suites (per feature PRD).** The tests listed in each PRD's testing boundary are
written **within that PRD's own slices**, not collected here. A slice is not complete
without its tests.

**This PRD's closing work.** A gap review once the features are done: a pass over every
declared testing boundary confirming it is met, closing anything missed, and verifying
the suite runs clean from a cold clone.

This structure is the reason the PRD is numbered 008 but its first half executes first.
PRD-009's issue graph reflects that ordering explicitly.

### Runner configuration

Vitest with jsdom, sharing the Vite configuration so path aliases, the Vue plugin and
auto-imports behave identically in tests and in the application. Auto-imported globals
must resolve in test files — without that, every test file needs manual imports the
source files do not have, and the two drift.

Two projects distinguished by file location. Unit tests sit beside their subject;
integration tests live in a top-level directory organised by journey. The location is
the classification — no tag conventions to remember.

Globals enabled so test files stay terse. Deterministic time available through fake
timers where a test depends on the current date.

`element-plus` is inlined through the Vite transform pipeline (`server.deps.inline`)
rather than pre-bundled. Without it, `el-form`'s CJS `async-validator` dependency hits a
default-export interop mismatch under Vitest and every `el-form-item` rule silently
passes — a validation test would go green against a form that validates nothing.

### MSW in Node

A Node server built from the same handler modules the browser worker uses. Started once
for the suite, with handlers reset and the mock database re-seeded between tests.

Unhandled requests **fail the test**. A silent fallthrough means a test passes against a
request nobody implemented, which is worse than no test.

The chaos controls from PRD-001 are exposed to tests programmatically, so error-path
tests force a failure through the same mechanism the browser debug surface uses.

### Test kit

- Mount a component or a view with a configured router at a given route, a fresh Pinia
  and the global plugins, with Element Plus components resolved as in the app (real,
  never stubbed).
- Seed an authenticated session for a chosen role without driving the login form.
- Reset and seed the mock database with a specified dataset.
- Wait for a list to settle — loading finished, rows rendered — without arbitrary
  delays.
- Set the viewport to a named breakpoint for responsive assertions.

### Assertion style

Queries by accessible role and label, with test identifiers used only where no
accessible query exists. Assertions are on what the administrator sees, never on
component internals or store state. A test asserting `wrapper.vm.items.length` passes
while the screen is blank.

### Testing Element Plus components

The portal is built from Element Plus per [`ELEMENT-PLUS.md`](./ELEMENT-PLUS.md): shared
components (`AppDataTable`, `ListToolbar`, `StatusTag`, `CurrencyInput`, `RemoteSelect`,
…) wrap and configure Element Plus rather than replace it. The tests follow from that.

- **Mount the real components, never stubs.** Sorting, selection, validation and
  pagination behaviour *is* `el-table`, `el-form`, `el-pagination`; a stub (or
  `shallowMount`) tests nothing. No `global.stubs` entry for an `El*` component.
- **Drive through the DOM Element Plus renders.** Click the `el-table` header cell to
  sort and assert `aria-sort` on it; toggle the selection checkbox's real `<input>`; click
  an `el-option` to choose; type into the `<input>` inside `el-input` /
  `el-input-number`; page through `el-pagination`'s buttons. Prefer roles and labels
  where Element Plus exposes them; fall back to its stable `el-*` class names only when it
  does not.
- **Poppers are teleported.** `el-select`, `el-dropdown`, `el-date-picker`,
  `el-tooltip`, `ElMessageBox`, `ElNotification` and `ElMessage` render into
  `document.body`, not the wrapper. Query `document.body`, or pass `:teleported="false"` in
  a unit mount where the component allows it. Clean the body between tests so a leftover
  popper cannot satisfy the next test's query.
- **Confirmations are asserted through `ElMessageBox`.** The confirm journey is: the
  message box appears in `document.body`, the confirm `el-button` shows its loading state
  while the request is in flight (`beforeClose` + `confirmButtonLoading`), and the box
  closes on success.
- **Validation through `el-form`.** Client rules are exercised by submitting the form and
  asserting the `el-form-item__error` text next to the field; server 400/409 errors by
  asserting the same slot fed by `el-form-item :error`.
- **Accessibility on the native control.** Attributes set on a wrapper do not always
  reach the element Element Plus renders (the `el-checkbox` / `aria-describedby` lesson
  in `.claude/skills/worker-team-agent/lessons-learned.md`) — assert on the real
  `<input>` or `<button>`.
- **Transitions and async rendering.** Element Plus opens and closes poppers, drawers
  and dialogs through transitions; await `nextTick` / `flushPromises` (or the kit's
  settle helper) instead of arbitrary timeouts.
- **Stylesheet registration is a review check, not a test.** jsdom does not render CSS,
  so an unregistered `theme-chalk` stylesheet passes every test. Each slice that adopts
  a component confirms its import in
  `src/assets/styles/element-reset/components/index.css`.

### Quality gates

Pre-commit: lint with autofix on staged files only. Fast enough not to be bypassed.

Pre-push: type-check and the full suite. Slower, but it runs once per push and it is
what keeps the shared branch green.

CI on every push and pull request: install from the lockfile, lint, type-check, run the
suite with coverage, build. Same commands as local, so the results agree.

Coverage is reported, not enforced by a threshold. The rationale is recorded: a
threshold is a proxy that rewards testing trivial code, and this PRD's whole argument is
that the strategy should follow the shape of the code rather than a number.

### Documentation

A testing guide covering the strategy, the layers and what belongs in each, the kit's
helpers, naming and location conventions, how to write an error-path test, and how to
test Element Plus components (real mounts, teleported poppers, `ElMessageBox` confirms,
`el-form` validation). It is the reference PRD-009 links to rather than duplicates.

## API Contract Plan

None. This PRD introduces no endpoint, parameter or schema component. It consumes the
handlers and chaos controls introduced by PRD-001.

## Out of Scope

- End-to-end browser testing with Playwright. Considered and declined: the mock API runs
  in the browser, so a Playwright run would exercise the same handlers the integration
  suite already exercises, at several times the cost in setup, runtime and CI
  complexity. The trade-off and the point at which it would change — a real backend — is
  documented in `TECHNICAL_REVIEW.md`. The existing Playwright skill remains available
  for exploratory checks.
- Visual regression and screenshot testing.
- Accessibility auditing as an automated gate. Accessible queries are used throughout
  the suite, which exerts steady pressure in the right direction, but no axe run gates
  the build.
- Performance budgets, bundle-size limits and load testing.
- Mutation testing.
- Contract testing against a real backend.
- A coverage threshold gate, by explicit decision.
- Deployment pipelines. CI verifies; it does not deploy.

## Further Notes

The split between harness and suites is the most important decision in this PRD and the
easiest to quietly ignore. Every feature PRD lists tests in its acceptance criteria; if
the harness is not ready when those PRDs start, the tests are deferred, and deferred
tests are written against code that was not shaped for them. The harness slice being the
second issue in the whole project — immediately after the API contract — is not
sequencing pedantry, it is what makes the rest of the plan executable.

Declining Playwright deserves a clear defence because its absence is conspicuous in an
assessment that asks for integration tests. The argument is specific rather than
general: with the mock inside the browser, a Playwright test and an integration test hit
the same handlers, so the browser adds cost without adding coverage. Against a real
backend the calculation reverses, and that is exactly what `TECHNICAL_REVIEW.md` should
say.

Failing on unhandled requests will be irritating during development and should not be
relaxed. It is the mechanism that catches an endpoint added to a service but never added
to the mock — a failure mode that otherwise surfaces as a confusing empty screen rather
than a test failure.
