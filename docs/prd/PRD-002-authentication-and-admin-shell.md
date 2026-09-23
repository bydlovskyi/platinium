# PRD-002 — Authentication & Admin Shell

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001 |
| **Blocks** | PRD-003 … PRD-007 |

## Problem Statement

The application has one route (`/`), one blank layout and a router guard that calls
`next()` unconditionally. There is no concept of a session, no login screen, and
nothing that distinguishes an authenticated administrator from an anonymous visitor.

There is also no shell. Every screen this project will build — events, categories,
tickets, dashboard — needs the same frame: navigation, a page header, a place for
page-level actions, and an account menu. Without a shell defined first, each feature
invents its own page chrome and the portal ends up looking like four applications
stapled together.

The assessment requires a good experience on desktop, tablet and mobile. Responsive
behaviour is a property of the shell, not of individual pages. If it is retrofitted
per screen, it will be inconsistent and expensive. It has to be designed into the
frame before the first feature screen exists.

## Solution

Deliver the authenticated frame of the portal.

**A login screen with real form mechanics.** Mocked credentials, but a real form:
an `el-card` holding an `el-form` whose `:rules` drive inline `el-form-item` messages, an
`el-button type="primary" :loading native-type="submit"` that disables and spins while the
request is in flight, and a clear, non-blaming `el-alert` when the credentials are wrong.
The point is not the authentication — it is demonstrating the Element Plus validation and
loading patterns every other form in the portal will follow.

**A session that behaves like a session.** Logging in stores a mocked token and the
current administrator. A reload restores the session without a round trip to the login
screen. Logging out clears everything, including cached entity state, so the next
administrator on the same machine sees nothing of the previous one. An expired session
— surfaced by the `401` path built in PRD-001 — drops the administrator back to login
with an explanation, and returns them to where they were once they sign in again.

**Guards that are declarative.** Routes carry metadata describing what they require,
and a single guard enforces it. An authenticated administrator hitting the login page
is sent to the dashboard; an anonymous visitor hitting any admin route is sent to
login with their intended destination preserved. No component performs its own access
check.

**A shell that adapts rather than collapses.** An `el-container` frame with `el-aside`,
`el-header` and `el-main`. On desktop, a persistent `el-menu` sidebar beside the content.
On tablet, the same `el-menu` with `:collapse` becomes an icon rail (the `el-aside :width`
narrows), recoverable by hover or an `el-button` toggle. On mobile, it moves into an
`el-drawer` behind an `el-button` hamburger, closing on navigation and trapping focus while
open. The content area (`el-main`) is the same component in all three cases — only the
navigation presentation changes.

**Dark mode as part of the frame.** A theme toggle in the shell header (an
`el-button circle` with an `el-tooltip`), driven by CSS custom properties mapped onto
Element Plus `--el-*` variables and the Element Plus dark class, defaulting to the operating system
preference and remembering an explicit choice. Because it is defined in the shell with
tokens, every screen built afterwards inherits it for free. Retrofitting it later would
mean auditing every component.

## User Stories

1. As an administrator, I want a login page, so that the portal is not open to anyone
   who knows the URL.
2. As an administrator, I want to see which credentials work in a demo build, so that
   I can get in without reading the source.
3. As an administrator, I want inline validation on the login form, so that I learn my
   email is malformed before I submit it.
4. As an administrator, I want validation to appear when I leave a field rather than
   on every keystroke, so that I am not scolded while I am still typing.
5. As an administrator, I want the submit button to show progress and prevent a second
   click, so that I do not submit twice.
6. As an administrator, I want a clear message when my credentials are rejected, so
   that I know to try again rather than assume the app is broken.
7. As an administrator, I want to submit the form with the Enter key, so that I do not
   have to reach for the mouse.
8. As an administrator, I want to reveal my password, so that I can check a typo.
9. As an administrator, I want to be taken to the dashboard after signing in, so that
   I land somewhere useful.
10. As an administrator, I want to be returned to the page I originally asked for after
    signing in, so that a bookmarked deep link still works.
11. As an administrator, I want my session to survive a reload, so that refreshing does
    not sign me out.
12. As an administrator, I want to be redirected to login if I open an admin URL while
    signed out, so that I am never shown an empty broken page.
13. As an administrator, I want to be sent to the dashboard if I open the login page
    while already signed in, so that I do not have to sign in twice.
14. As an administrator, I want to sign out from an account menu, so that I can hand
    the machine to someone else.
15. As an administrator, I want signing out to clear cached data, so that the next
    person cannot see what I was working on.
16. As an administrator, I want to be told when my session expired rather than silently
    bounced, so that I understand what happened.
17. As an administrator, I want my name and role visible in the header, so that I know
    which account I am using.
18. As an administrator, I want persistent navigation to every section, so that I can
    move between events, categories and tickets in one click.
19. As an administrator, I want the current section highlighted, so that I always know
    where I am.
20. As an administrator, I want a consistent page header with a title and a place for
    the primary action, so that every screen behaves the same way.
21. As an administrator, I want breadcrumbs on nested screens, so that I can step back
    up without using the browser button.
22. As an administrator using a tablet, I want the sidebar to collapse to icons, so
    that content gets the space it needs.
23. As an administrator using a phone, I want navigation behind a hamburger, so that
    the whole screen is usable.
24. As an administrator using a phone, I want the drawer to close when I pick a
    destination, so that I am not left tapping a backdrop.
25. As a keyboard user, I want focus trapped in the open mobile drawer and Escape to
    close it, so that I am not lost behind an overlay.
26. As an administrator, I want a dark theme, so that I can work at night without
    eye strain.
27. As an administrator, I want the theme to follow my system setting by default, so
    that it is right without configuration.
28. As an administrator, I want my explicit theme choice remembered, so that I set it
    once.
29. As an administrator, I want the theme applied before the first paint, so that I do
    not see a white flash on a dark setup.
30. As an administrator, I want a friendly page when I hit a URL that does not exist,
    so that I can navigate back instead of staring at a blank screen.
31. As an administrator, I want to keep seeing the shell while a page's data loads, so
    that navigation never feels like a full reload.

## Implementation Decisions

### Authentication model

A single seeded administrator account, documented in the README and defined in the
mock fixtures. The mock validates the credentials and returns an opaque token plus a
user record carrying an identifier, display name, email and role.

The role field exists from this PRD forward even though only one role is seeded. It is
what PRD-007 builds role-based permissions on, and adding it later would mean touching
the contract, the store, the guard and every fixture.

The token is attached to outgoing requests by the request interceptor, which currently
holds the commented-out example. Mock handlers reject requests without it, so the
`401` path built in PRD-001 is genuinely exercised rather than theoretical.

**Token storage is `localStorage`, and this is a deliberate compromise.** A real
deployment would use an httpOnly, SameSite cookie so that the token is unreachable
from JavaScript. There is no server here to set one. The choice, its XSS exposure and
the production alternative must be recorded in `TECHNICAL_REVIEW.md` — a reviewer will
look for whether this was a decision or an accident.

### Component library

Element Plus is the component library for everything this PRD renders, per the binding
policy in [`ELEMENT-PLUS.md`](./ELEMENT-PLUS.md). Shared components (`AppShell`,
`PageHeader`, the account menu) **wrap and configure** Element Plus components; they do not
replace them, and no raw `<button>`, `<input>` or `<select>` appears in this PRD's code.

- **Root** — one `el-config-provider` in `App.vue` owns size, z-index base, locale and
  `button.autoInsertSpace`.
- **Login** — `el-card`; `el-form` (`:rules`, `label-position="top"`, blur triggers),
  `el-form-item`, `el-input` (`show-password` on the password field); `el-button
  type="primary" :loading native-type="submit"`; `el-alert` for the credentials error.
- **Admin layout** — `el-container`, `el-aside`, `el-header`, `el-main`.
- **Sidebar** — `el-menu` + `el-menu-item` inside `el-scrollbar`; `:collapse` for the icon
  rail; `:default-active` bound to the current route **name**; navigation through
  `router.push({ name })` in `@select` — `el-menu`'s `router` mode is not used because it
  navigates by path.
- **Mobile navigation** — `el-drawer` holding the same `el-menu`.
- **Header controls** — hamburger and rail toggle as `el-button text` / `circle` with the
  `<Icon>` in `#icon` and an `aria-label`; theme toggle as `el-button circle` +
  `el-tooltip`.
- **Page header** — `PageHeader` wrapping `el-breadcrumb` / `el-breadcrumb-item
  :to="{ name }"`, an `<h1>` title and an `actions` slot of `el-button`s. `el-page-header`
  is not used here: it always renders a back control, which a list screen does not have.
- **Account menu** — `el-dropdown` triggered by an `el-button text`, showing `el-avatar`,
  the name and an `el-tag` for the role; sign-out as an `el-dropdown-item`.
- **Not-found** — `el-result` with the illustration in `#icon` and an `el-button` back to
  the dashboard in `#extra`.

Every Element Plus component adopted here has its `element-plus/theme-chalk/el-<name>.css`
imported in `src/assets/styles/element-reset/components/index.css` (the resolver runs with
`importStyle: false`).

### Modules

**Auth store (global).** Owns the token, the current administrator and the derived
authenticated flag. Exposes sign-in, sign-out and a session-restore action. This is
genuinely global state — the guard, the shell header and PRD-007's permission checks
all read it — so it is a store rather than a composable.

**Session bootstrap.** Runs before the first navigation resolves: reads any persisted
token, restores the user, and only then lets routing proceed. Without this, the guard
races the restore and a reload on an admin route bounces to login.

**Route guard.** Reads declarative route metadata — whether a route requires
authentication, or requires the visitor to be anonymous — and redirects accordingly,
preserving the intended destination as a query parameter. One guard, no per-route
logic, no component-level checks.

**Layouts.** An auth layout (a centred `el-card`, no navigation) and an admin layout
(the shell: `el-container` / `el-aside` / `el-header` / `el-main`). Layouts are selected by route metadata rather than imported by pages, so a page
never knows which frame it sits in.

**Navigation model.** The sidebar's `el-menu-item`s render from a declared list of
entries — label, icon, target route name and an optional permission requirement — rather
than hardcoded markup; the route name is the `el-menu-item` `index`. PRD-007 filters this list by role without touching the sidebar component. New
sections are added by extending the list.

**Page header (deep module).** A reusable header owning the `<h1>` title, optional
`el-breadcrumb` crumbs and an `actions` slot for `el-button` page actions (`el-page-header`
is reserved for screens with a real back action, since it always renders one). Every feature screen uses it, so heading
hierarchy, spacing and action placement are consistent by construction rather than by
review.

**Theme.** A design-token layer of CSS custom properties with light and dark values,
mapped onto Element Plus `--el-*` variables in the element reset and consumed by
Tailwind. A composable built on the VueUse
colour-mode primitive owns the current mode and persistence. An inline script in the
document head applies the stored or preferred class before hydration, preventing the
flash.

### Responsive strategy

Three breakpoints, defined once as shared tokens and used by both the shell and, later,
the data table in PRD-003: mobile below the tablet breakpoint, tablet between, desktop
above. The shell reads the current breakpoint through a single composable backed by a
VueUse media-query primitive, so breakpoint logic is never duplicated as ad-hoc window
listeners.

The drawer is an `el-drawer` rather than a hand-built overlay, inheriting focus trapping
and Escape handling instead of reimplementing accessibility. The tablet icon rail is
`el-menu :collapse` inside a narrowed `el-aside`, not a second hand-built sidebar.

### Testing boundary

- Auth store — unit tested: sign-in success and failure, sign-out clearing state,
  session restore from persisted and absent tokens.
- Route guard — unit tested against each metadata combination, asserting the redirect
  target and that the intended destination is preserved.
- Theme composable — unit tested for default-from-system, explicit override and
  persistence.
- Login screen — integration tested end to end against MSW: validation failure,
  credential rejection, successful sign-in and redirect, and redirect back to a
  preserved destination.
- Shell — component tested at each breakpoint for the correct navigation presentation
  (`el-menu` expanded, `el-menu :collapse`, `el-drawer`), and tested for
  drawer-closes-on-navigate.
- Component and integration tests mount the real Element Plus components, never stubs,
  and query teleported poppers (`el-dropdown` menu, `el-drawer`, `el-tooltip`) in
  `document.body`.

## API Contract Plan

This PRD owns the following consolidated contract change.

**Endpoints introduced:**

- `POST /auth/login` — accepts email and password; returns a token and the user
  record; returns `400` with field errors for malformed input and `401` for bad
  credentials
- `POST /auth/logout` — invalidates the current token
- `GET /auth/me` — returns the user record for the current token; returns `401` when
  the token is absent, unknown or expired

**Schema components introduced:**

- `User` — id, name, email, role
- `UserRole` — enum; seeded with the administrator role, extended by PRD-007
- `LoginRequest` — email, password
- `LoginResponse` — token, user

**Request interceptor change:** the bearer token is attached from the auth store's
persisted token when present. This is the only PRD that modifies the request
interceptor's authorisation behaviour.

## Out of Scope

- Registration, password reset, email verification, multi-factor authentication. The
  assessment states authentication may be fully mocked.
- Multiple user accounts and role-based permission enforcement — PRD-007. This PRD
  introduces the role field only.
- Token refresh and sliding expiry. The mocked token does not expire on a timer; the
  `401` path is exercised through the PRD-001 chaos controls.
- The dashboard screen's content — PRD-007. This PRD only needs a route to land on.
- Any entity list or form screen.
- Internationalisation. Copy is English; no translation layer.

## Further Notes

The dark-mode decision belongs in this PRD rather than in a later bonus PRD for a
structural reason: it is a token-layer concern. Introduced here, every subsequent
component inherits it. Introduced after four feature PRDs, it becomes an audit of
every hardcoded colour in the codebase. It is listed as a bonus in the assessment, but
it is cheapest to build as part of the shell.

The same argument applies to the page header. It looks trivial enough to skip, and
skipping it is precisely how four screens end up with four different heading
treatments. It must land here, before the first feature screen.

The session-bootstrap ordering is the most likely source of a subtle defect in this
PRD. The application already calls `router.isReady()` before mounting; the restore must
complete before the first guard evaluation, not merely before mount. A reload on a deep
admin route is the test that catches it.
