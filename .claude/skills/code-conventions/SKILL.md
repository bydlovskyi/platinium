---
name: code-conventions
description: Use when writing or reviewing any code in this repo (views, features, stores, services, composables, mock API, tests) — enforces the architecture and style rules this project is built on. Apply automatically; no need for user to ask.
disable-model-invocation: true
---

# Code Conventions — Ticket Management Admin Portal

Repo-specific rules. Apply on every edit. Verify before claiming done.

`architecture.md` in the repo root is the canonical description of the structure.
This skill is the enforceable checklist derived from it.

## Layering

One-way dependency direction, no exceptions:

```
composable → store → service → apiClient
component  → (composable | store | service)
```

### Service layer

A service is a class with a single exported singleton instance. It knows nothing
about stores or composables — it maps domain operations onto `apiClient` calls.

**Bad** (service reaching into state, and notifying):
```ts
class TicketService {
  getTickets () {
    const filters = useFiltersStore().filters   // ✗ service knows about a store
    return apiClient.get('/tickets', { params: filters })
      .catch(e => { ElNotification.error(e.message) })  // ✗ per-call-site notification
  }
}
```

**Good** (parameters in, data out):
```ts
class TicketService {
  getTickets (params: TTicketListQuery) {
    return apiClient.get('/tickets', { params })
  }

  createTicket (body: TTicketPayload) {
    return apiClient.post('/tickets', body)
  }
}

export const ticketService = new TicketService()
```

Global API error notifications belong in
`src/features/platform/api/interceptors/response.interceptor.ts`. If one call must
stay silent, pass a config flag (`showNotification: false`) — do not add a `catch`
that notifies.

### Store layer

`defineStore` with the setup syntax. May use services and utility composables
(VueUse). NEVER a project orchestrating composable.

**Create a store only when state is shared across multiple areas.** State scoped to
one view belongs in a composable inside that view. A store per view is a smell.

### Composable layer

The orchestrator. May use stores and services. Named export, `use` prefix,
auto-imported from `src/composables/`, `src/views/**/composables/`,
`src/features/**/composables/`.

Check VueUse before writing one from scratch.

## Views vs Features

| | Views | Features |
|---|---|---|
| Purpose | Route-bound pages | Reusable isolated modules |
| Routes | Owns them | Route-agnostic |
| Location | `src/views/<view>/` | `src/features/<feature>/` |

A view directory is:

```
src/views/<view>/
├── View.vue            # name matches the route
├── view.routes.ts
├── view.service.ts
├── view.store.ts       # optional — only when state is shared
├── composables/
└── components/
```

### Features never import from other features

A feature has ONE single responsibility. Cross-feature communication goes through a
view, a composable, or `helpers.eventEmitter`:

```ts
// publisher
helpers.eventEmitter.publish('ticketCreated', ticket)

// listener — always clean up
const subscription = helpers.eventEmitter.listen('ticketCreated', onTicketCreated)
onUnmounted(() => subscription.remove())
```

Add the payload type to `IEventMap` in `src/utils/helpers.ts` — never publish an
untyped event.

## Routing

- Routes MUST use `name: routeNames.xxx` (camelCase). Never a string literal —
  `route-names-registry.ts` is generated from `routeNames.xxx` usage.
- Never hand-edit `src/router/route-names-registry.ts`.
- Navigate by name, never by path string:

```ts
router.push({ name: routeNames.ticketEdit, params: { id } })   // ✓
router.push(`/tickets/${id}/edit`)                              // ✗
```

- Every admin route sits behind the auth guard. The guard reads store state; a
  component-level `if (!isAuthenticated)` is not a guard.

## List state lives in the URL

Search, filters, sort and page are query params, not local refs. A filtered list must
survive a reload and be shareable. Use one shared composable for this rather than
re-deriving the logic per entity.

```ts
// ✓ one source of truth, reload-safe
const { query, setPage, setSort } = useListQuery<TTicketListQuery>()
```

Server-side semantics: the request carries the params and the mock API does the
filtering. Never fetch everything and filter in a computed.

## Mock API

- `src/mocks/openapi.yaml` is the contract. `npm run openapi-generate` produces
  `src/features/platform/api/schema.ts` **from the local file** — never hand-edit
  the generated schema, and never point the generator at a remote URL (it breaks
  offline and Docker builds).
- Every endpoint in the spec has a matching MSW handler.
- Handlers own search / filter / sort / pagination.
- Handlers return realistic errors: `400` with per-field messages, `401`, `404`, `500`.
- The rest of the app imports domain aliases from
  `src/features/platform/api/dts/index.d.ts` (`TTicket`, `TEvent`, …), never raw
  `schema.ts` path types.

## Types

- Interfaces `IPrefix`, type aliases `TPrefix`, enums `EPrefix`.
- Domain types come from the generated schema. Do not re-declare a shape by hand
  that the contract already defines.
- Constrained values are enums or literal unions, never bare `string`.
- Don't export a type used only in its own file. Verify:

```bash
grep -rn "ITicketFormState" --include="*.ts" --include="*.vue" src
```

1 hit = unexport. ≥2 files = move it to the right shared location.

## Components

- Check Element Plus before building a UI primitive from scratch.
- Tailwind utilities in the template. No `@apply`. No class strings assembled in JS.
- Component CSS stays in the `.vue` file; only global styles in `src/assets/styles/`.
- Components clashing with an HTML tag get an `App` prefix (`AppTable`, `AppButton`).
- Modals are `*Modal.vue`, auto-registered, opened via `useModals()`.
- Icons: `<Icon name="car" />`, type-safe through the generated `TIcons` union.

## Hard rules

- NEVER `export default` — always named exports.
- NEVER `as any` to silence TypeScript — fix the real type.
- NEVER let a service know about a store.
- NEVER let a store use a project orchestrating composable.
- NEVER let a feature depend on another feature.
- NEVER write a manual import for something that is auto-imported.

## Tests

- Unit: utilities, stores, composables, presentational components in isolation.
- Integration: complete flows against the real router, real Pinia and MSW.
- Assert on user-visible behaviour (roles, labels, text), not internal state.
- Never mock the service layer in an integration test — let MSW answer.
- Reset the in-memory DB between tests.
- No sleeps. Wait on assertions.

## Verification before done

```bash
npm run lint
npm run type-check
npm run test
```

CLI output is authoritative. IDE diagnostics lag.

## Checklist

- [ ] Layer direction respected (composable → store → service).
- [ ] No service imports a store; no store imports an orchestrating composable.
- [ ] No feature imports another feature.
- [ ] Store created only because state is genuinely shared.
- [ ] Routes use `routeNames.xxx`; all navigation is named.
- [ ] Admin routes covered by the auth guard.
- [ ] List state driven by URL query; filtering done server-side in MSW.
- [ ] Generated files (`schema.ts`, `route-names-registry.ts`, `icons.d.ts`, `dts/auto-imports/`) untouched by hand.
- [ ] Error notifications only in the response interceptor.
- [ ] No `export default`, no `as any`, no redundant manual imports.
- [ ] `IPrefix` / `TPrefix` / `EPrefix` naming; nothing exported that nobody imports.
- [ ] `npm run lint` clean (0 errors).
- [ ] `npm run type-check` clean.
- [ ] `npm run test` green.
