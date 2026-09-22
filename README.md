# Ticket Management Admin Portal

An administration portal for managing **Events**, **Ticket Categories** and **Tickets**,
built with Vue 3 + TypeScript.

> **Status: scaffold.** This commit contains the application skeleton, architecture
> conventions and tooling only. Feature work is tracked as PRDs and issues in
> [`docs/`](docs/). This README grows with the implementation.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Vue 3.5 (`<script setup>`, Composition API) |
| Language | TypeScript (strict) |
| Build | Vite 7 |
| State | Pinia |
| Routing | Vue Router 4 (named routes, auto-generated registry) |
| UI kit | Element Plus |
| Styling | Tailwind CSS v4 |
| Utilities | VueUse |
| HTTP | axios, typed end-to-end from an OpenAPI spec |

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (see [`.nvmrc`](.nvmrc))
- npm

## Installation

```sh
nvm use
npm install
cp .env.example .env
```

## Development commands

```sh
npm run dev              # start the dev server with HMR
npm run lint             # ESLint, autofix
npm run type-check       # vue-tsc
npm run test             # unit + integration suites
npm run test:unit        # unit suite only
npm run test:integration # integration suite only
npm run test:watch       # watch mode; pass a path or -t <name> to target one file/test
npm run test:coverage    # coverage report, no threshold gate
```

Testing strategy, the kit's helpers and naming/location conventions: [`TESTING.md`](TESTING.md).

## Build commands

```sh
npm run build         # type-check + production build
npm run preview       # serve the production build locally
```

## Project structure

```
.config/        Vite plugin + ESLint rule configuration
  auto-imports/           unplugin-auto-import & unplugin-vue-components
  eslint-rules/           base / stylistic / typescript / vue rule sets
  icon-names-generator/   generates the TIcons union from SVG files
  modals-generator/       auto-registers *Modal.vue files
  route-names-generator/  generates routeNames from routeNames.xxx usage
dts/            Global TypeScript declarations (generated + manual)
src/
  assets/styles/  Global CSS, theme, Element Plus resets
  components/     Global components
  composables/    Global composables
  features/       Reusable, route-agnostic modules (one responsibility each)
  layouts/        Layout components
  plugins/        Vue plugins
  router/         Routes, guards, generated route names
  services/       Global services
  store/          Global Pinia stores
  types/          Application-owned type definitions
  utils/          Global utilities (filters, helpers, event emitter)
  views/          Route-bound pages
tests/
  integration/    Integration tests, organised by journey
  support/        Test kit — mounting helpers, viewport, session/database seams
  setup.ts        Global Vitest setup (MSW server lifecycle)
```

## Architecture overview

Business logic flows in one direction only:

```
composable → store → service → apiClient
component  → (composable | store | service)
```

- **Service** — pure API/domain logic. Knows nothing about stores or composables.
- **Store** — may use services and utility composables. Created only when state is
  genuinely shared across areas.
- **Composable** — the orchestrator. May use stores and services.

**Views** are route-bound pages; **features** are reusable and route-agnostic.
Features never import from other features — views, composables and a typed event
emitter orchestrate between them.

Full rules, naming conventions and examples: [`architecture.md`](architecture.md).

## Conventions worth knowing

- **Auto-imports.** Composables, services, stores, utils, components and the
  Vue/Router/Pinia/VueUse APIs are auto-imported. Do not write manual imports for them.
- **Named routes only.** `routeNames` is generated from usage; navigation never uses
  path strings.
- **Generated files** (`src/router/route-names-registry.ts`,
  `src/features/platform/api/schema.ts`, `**/icons.d.ts`, `dts/auto-imports/`) are
  never hand-edited.
- **Library first.** Check VueUse before writing a composable and Element Plus before
  building a UI primitive.

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) with the
[Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
extension (disable Vetur). Workspace recommendations are in
[`.vscode/extensions.json`](.vscode/extensions.json).

TypeScript cannot type `.vue` imports on its own, so `vue-tsc` replaces `tsc` for
type checking.

## AI-assisted workflow

This repository documents its own AI workflow. [`.claude/`](.claude/) contains the
skills, conventions and hooks used while building it:

- `skills/write-a-prd` — turns a requirement into a PRD
- `skills/prd-to-issues` — splits a PRD into vertical-slice issues
- `skills/code-conventions` — the enforceable rules derived from `architecture.md`
- `skills/review`, `skills/grill-me`, `skills/find-magic-numbers` — review gates
- `hooks/path-rules-reminder.sh` — surfaces path-specific rules as files are written

PRDs and issue specs live in [`docs/`](docs/).
