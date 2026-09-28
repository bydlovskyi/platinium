---
name: playwright
description: Shared reference for browser checks on this portal — dev server, demo accounts, Element Plus selector quirks, chaos controls and the e2e smoke suite. Used by other skills and agents.
---

# Playwright reference

## Servers

| Target | URL | Start with |
|---|---|---|
| Vite dev server (HMR, mock API on) | `http://localhost:5173` | `npm run dev` |
| Built bundle with mocks (what `npm run test:e2e` uses) | `http://localhost:4173` | `npm run preview:mocks` |
| Docker image | `http://localhost:8080` | `docker compose up --build` |

The mock API is served by an MSW service worker inside the page; there is no separate backend process.
Its data lives in `localStorage` (`platinum:mock-db`), so **each new browser context starts from the
deterministic seed** (48 events, 6 categories, 400 tickets). Reload keeps changes; a fresh context does not.

## Demo accounts

Seeded in `src/mocks/handlers/auth.ts` and listed in the README; nothing to read from `.env`.

| Role | Email | Password |
|---|---|---|
| admin | `admin@platinium.test` | `admin123` |
| viewer (read-only) | `viewer@platinium.test` | `viewer123` |

The login form is pre-filled with the admin account **on the dev server only**.

## Selectors that work

- Buttons and links by role: `getByRole('button', { name: 'Create event' })`.
- Search: `getByRole('textbox', { name: 'Search' })`. Filters: `getByRole('combobox', { name: 'Filter by status' })`.
- **Element Plus selects render the placeholder over the input**, so a plain click on the combobox is
  intercepted. Click the wrapper: `page.locator('.el-select', { has: page.getByRole('combobox', { name }) })`,
  then `getByRole('option', { name })`.
- Form fields with no `aria-label`: find the `.el-form-item` whose `.el-form-item__label` matches, then its
  `input` / `.el-select` (see `tests/e2e/support.ts`).
- Table rows: `.el-table__body tr`; cards below 1024 px: `.el-card`. Row menu: `button[aria-label^="Actions for"]`.
- Row checkboxes are visually hidden inputs: click `.el-checkbox`, not the `checkbox` role.
- Confirm dialogs: `.el-message-box`. Toasts: `.el-notification`. Bulk result dialog: `.el-dialog`.

## Forcing failures

`window.__mockChaos` exists on the dev server and in the mock-enabled build:

```js
__mockChaos.failNextRequest({ path: '/events', status: 500 })
__mockChaos.failNextRequest({ path: '/events', status: 401 })   // expired session
__mockChaos.setLatency(3000)                                     // see the skeletons
__mockChaos.clearChaos()
```

Paths are MSW route patterns (`/tickets/:id`), not URLs, and the API is mounted at the root (no `/api`).

## The e2e smoke suite

`tests/e2e/smoke.spec.ts` runs with `npm run test:e2e` (builds and serves the bundle itself) or against a
running server with `E2E_BASE_URL=http://localhost:8080 npm run test:e2e`. CI runs it against the Docker
image. Keep it thin: journeys belong in `tests/integration`; e2e only guards what jsdom cannot see.

## Checklist for a browser pass

1. Sign in, open each list, one create, one edit, one delete.
2. Force a 500 on a list and on a save; check the message and Retry.
3. 375 px and 1440 px, light and dark.
4. Console clean apart from the expected 4xx/5xx resource logs.
