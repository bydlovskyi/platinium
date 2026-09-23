# Testing Strategy

The reference for what to test, where a test belongs, and how the test kit works. See
[`PRD-008`](docs/prd/PRD-008-testing-strategy-and-quality-gates.md) for the reasoning
behind these decisions.

## Runner

[Vitest](https://vitest.dev) in a jsdom environment, configured in
[`vitest.config.ts`](vitest.config.ts) as two named projects sharing the app's own
[`vite.config.ts`](vite.config.ts) — same plugins, same `@` alias, same auto-imports, so
a test file behaves exactly like a source file.

| Project | Location | What it's for |
|---|---|---|
| `unit` | beside the file under test, `*.spec.ts` or `*.test.ts` | deep modules tested exhaustively: composables, stores, services, utilities, presentational components in isolation |
| `integration` | `tests/integration/`, organised by journey | complete user journeys against a real router, a real Pinia instance and MSW answering the network |

A file's **location** is its classification — there is no tag or naming convention to
remember beyond where it lives.

## Commands

```sh
npm run test              # both projects
npm run test:unit         # unit only
npm run test:integration  # integration only
npm run test:watch        # watch mode; pass a path or -t <name> to target one file/test
npm run test:coverage     # coverage report (text + html under coverage/), no threshold gate
```

Coverage is reported for visibility, not enforced by a number — testing what the code's
shape calls for matters more than hitting a percentage.

## What belongs where

- **Deep modules** — the mock query engine, list query composable, currency input,
  CSV serialiser, capability checks — get exhaustive unit tests, including edge cases.
- **User journeys** — login, a full CRUD flow, search/filter/sort/pagination, validation,
  API failure handling, permissions — get integration tests through the UI.
- **Presentational components with no logic** are not tested directly; the journeys that
  render them cover them.

Assert on what the administrator sees — roles, labels, visible text — never on component
internals or store state. A test asserting `wrapper.vm.items.length` passes while the
screen is blank.

## Writing an error-path test

Once the mock handlers land (PRD-001's slices), force a failure through the same chaos
controls the browser debug surface uses, then assert the administrator sees a message
rather than a blank screen:

```ts
import { HttpResponse, http } from 'msw'

import { server } from '@/mocks/server'

import { mountWithRouterAndPinia } from 'tests/support'

it('shows an error message when the request fails', async () => {
  server.use(http.get('/api/tickets', () => HttpResponse.json({ message: 'Server error' }, { status: 500 })))

  const { wrapper } = await mountWithRouterAndPinia(TicketsList)

  await vi.waitFor(() => expect(wrapper.text()).toContain('Server error'))
})
```

An unhandled request fails the test rather than falling through silently — that's what
catches an endpoint a service calls but the mock never implemented.

## Test kit

[`tests/support/`](tests/support) — import from `tests/support` (or a specific file
inside it); it is test-only tooling and sits outside the app's auto-import surface.

- `mountWithRouterAndPinia(component, options?)` — mounts a component or view behind a
  real memory-history router seeded with the app's route table, and a fresh Pinia
  instance. `options.initialRoute` sets the starting path; everything else is forwarded
  to `@vue/test-utils`' `mount`.
- `setViewportToBreakpoint('mobile' | 'tablet' | 'desktop')` — resizes the jsdom window
  for responsive assertions.
- `resetDatabase()` — resets the shared mock database to its deterministic seed (or a
  given dataset override).
- `seedSession(role)` — logs in as the seeded user with the given role through the real
  `POST /auth/login` handler and persists the resulting token to `localStorage`, so a
  test can start already authenticated without driving the login form. Returns
  `{ token, user }`. Currently only the seeded `'admin'` role exists.

## Fake timers

Vitest's built-in fake timers cover date-dependent assertions — no extra dependency:

```ts
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('formats the date relative to now', () => {
  vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  // ...
})
```

## Quality gates

- **Pre-commit** — lints staged files with autofix (`lint-staged`). Fast, so it doesn't
  invite `--no-verify`.
- **Pre-push** — type-checks, then runs the full suite. Slower, but it runs once per push
  and keeps the shared branches green.
- **CI** (`.github/workflows/ci.yml`) — on every push and pull request: install from the
  lockfile, lint, type-check, test with coverage, build. Same commands as local, so a
  passing hook means a passing CI run.

### Bypassing a hook

Reserved for a genuine emergency (a hotfix that can't wait for a flaky, unrelated test to
be fixed) — not a way to skip a hook you disagree with:

```sh
git commit --no-verify
git push --no-verify
```

CI still runs the same checks on the resulting push or pull request, so a bypassed hook
is never the last line of defence.
