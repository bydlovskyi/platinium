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

## What to build

The frame every feature screen sits in. Built before the first feature screen
exists, because responsive behaviour and page chrome are properties of the shell —
retrofitted per screen they are inconsistent and expensive.

Two layouts selected by route metadata, so a page never knows which frame it sits in.
The sidebar renders from a declared list of entries rather than hardcoded markup, which
is what lets PRD-007 filter it by role without touching the component.

The shell adapts rather than collapses: a persistent sidebar on desktop, icons on
tablet, an off-canvas drawer on mobile. The content area is the same component in all
three — only the navigation presentation changes. An Element Plus drawer is used rather
than a hand-built overlay so focus trapping and Escape handling are inherited rather
than reimplemented.

The page header is small enough to look skippable, and skipping it is exactly how four
screens end up with four different heading treatments.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Auth layout (centred card, no navigation) and admin layout (the shell), selected by route metadata
- [ ] Sidebar rendered from a declared entry list: label, icon, target route name, optional permission requirement
- [ ] Current section highlighted; navigation is by route name, never by path string
- [ ] Page header component: title, optional breadcrumbs, slot for page actions — used by every feature screen
- [ ] Account menu showing the administrator's name and role, with sign-out
- [ ] Theme toggle in the header; the mode persists and defaults to the system preference
- [ ] Theme class applied before first paint via an inline head script — no flash on a dark setup
- [ ] Breakpoint composable backed by a VueUse media query; no ad-hoc window listeners anywhere
- [ ] Desktop: persistent sidebar. Tablet: collapsed to icons, recoverable by toggle. Mobile: off-canvas drawer behind a hamburger
- [ ] Mobile drawer closes on navigation, traps focus while open and closes on Escape
- [ ] Shell remains visible while a page's data loads — navigation never looks like a full reload
- [ ] Designed not-found page for unmatched routes, inside the shell when authenticated
- [ ] Component tests at each breakpoint assert the correct navigation presentation
- [ ] Component test asserts the drawer closes on navigate
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
