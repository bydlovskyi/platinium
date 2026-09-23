# Issue #20 — Admin shell — layouts, navigation, page header, responsive drawer, theme toggle

| | |
|---|---|
| **GitHub issue** | [#20](https://github.com/bydlovskyi/platinum/issues/20) |
| **Parent PRD** | [#2](https://github.com/bydlovskyi/platinum/issues/2) · [`PRD-002-authentication-and-admin-shell.md`](../prd/PRD-002-authentication-and-admin-shell.md) |
| **Type** | AFK |
| **Slice** | 10 of 41 |
| **Branch** | `feat/20-admin-shell` |

```
Parent: #2
Parent branch: feat/19-session-and-login
Branch: feat/20-admin-shell
Blocked by: #19
```

## Parent PRD

#2 — [`docs/prd/PRD-002-authentication-and-admin-shell.md`](../prd/PRD-002-authentication-and-admin-shell.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The frame every feature screen sits in. Built before the first feature screen
exists, because responsive behaviour and page chrome are properties of the shell —
retrofitted per screen they are inconsistent and expensive.

Two layouts selected by route metadata, so a page never knows which frame it sits in.
The admin layout is an `el-container` with `el-aside`, `el-header` and `el-main`. The
sidebar is an `el-menu` (inside `el-scrollbar`) whose `el-menu-item`s render from a
declared list of entries rather than hardcoded markup, which is what lets PRD-007 filter
it by role without touching the component. It navigates by route name through
`router.push({ name })` in `@select` — never `el-menu`'s `router` mode, which navigates by
path.

The shell adapts rather than collapses: a persistent `el-menu` on desktop, the same menu
with `:collapse` in a narrowed `el-aside` on tablet, an off-canvas `el-drawer` on mobile.
The content area (`el-main`) is the same component in all three — only the navigation
presentation changes. `el-drawer` is used rather than a hand-built overlay so focus
trapping and Escape handling are inherited rather than reimplemented. Header controls are
`el-button` icon buttons; the account menu is `el-dropdown` + `el-avatar` + `el-tag`; the
not-found page is `el-result`; one root `el-config-provider` in `App.vue` owns size,
z-index, locale and `button.autoInsertSpace`.

The page header wraps `el-breadcrumb` around an `<h1>` title and an actions slot (`el-page-header` always renders a back control, which list screens do not have). It is small enough to
look skippable, and skipping it is exactly how four
screens end up with four different heading treatments.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Shell built from `el-container`, `el-aside`, `el-header`, `el-main`, `el-menu`, `el-scrollbar`, `el-drawer`, `el-button`, `el-breadcrumb`, `el-dropdown`, `el-avatar`, `el-tag`, `el-tooltip`, `el-result`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] One root `el-config-provider` in `App.vue` owns size, z-index base, locale and `button.autoInsertSpace`
- [ ] Auth layout (centred `el-card`, no navigation) and admin layout (`el-container` / `el-aside` / `el-header` / `el-main`), selected by route metadata
- [ ] Sidebar is `el-menu` + `el-menu-item` inside `el-scrollbar`, rendered from a declared entry list: label, icon, target route name, optional permission requirement
- [ ] Current section highlighted via `el-menu :default-active` bound to the current route name; `@select` calls `router.push({ name })` — `el-menu`'s `router` mode is not used, navigation is never by path string
- [ ] Page header component: `<h1>` title, optional `el-breadcrumb` / `el-breadcrumb-item :to="{ name }"`, and an `actions` slot for `el-button`s — used by every feature screen
- [ ] Account menu is `el-dropdown` with an `el-button text` trigger showing `el-avatar`, the administrator's name and an `el-tag` role; sign-out is an `el-dropdown-item`
- [ ] Theme toggle in the header is an `el-button circle` with an `el-tooltip`; the mode persists and defaults to the system preference
- [ ] Hamburger and rail toggle are `el-button text` / `circle` with the `<Icon>` in `#icon` and an `aria-label` on every icon-only button
- [ ] Theme class applied before first paint via an inline head script — no flash on a dark setup
- [ ] Breakpoint composable backed by a VueUse media query; no ad-hoc window listeners anywhere
- [ ] Desktop: persistent `el-menu`. Tablet: `el-menu :collapse` icon rail in a narrowed `el-aside`, recoverable by toggle. Mobile: `el-drawer` behind a hamburger `el-button`
- [ ] Mobile `el-drawer` closes on navigation, traps focus while open and closes on Escape (inherited from `el-drawer`)
- [ ] Shell remains visible while a page's data loads — navigation never looks like a full reload
- [ ] Designed not-found page for unmatched routes built on `el-result` (illustration in `#icon`, back `el-button` in `#extra`), inside the shell when authenticated
- [ ] Component tests at each breakpoint assert the correct navigation presentation
- [ ] Component test asserts the drawer closes on navigate
- [ ] Component tests mount real Element Plus components (no stubs) and query teleported poppers in `document.body`
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #19 — *Session and login — auth store, bootstrap, route guard, login screen*

This slice's branch is created off `feat/19-session-and-login` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/20-admin-shell`

## User stories addressed

Referenced by number from the parent PRD:

- 17-25 (navigation, header, breadcrumbs, responsive presentation, focus handling)
- 26-31 (theme toggle, system default, persistence, no flash, not-found, shell persistence)
