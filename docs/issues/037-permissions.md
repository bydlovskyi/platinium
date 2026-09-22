# Issue #37 — Role-based permissions — capability composable, guard, UI gating, 403 handling

| | |
|---|---|
| **GitHub issue** | [#37](https://github.com/bydlovskyi/platinum/issues/37) |
| **Parent PRD** | [#7](https://github.com/bydlovskyi/platinum/issues/7) · [`PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) |
| **Type** | AFK |
| **Slice** | 27 of 41 |
| **Branch** | `feat/37-permissions` |

```
Parent: #7
Parent branch: feat/36-prd007-contract
Branch: feat/37-permissions
Blocked by: #36
```

## Parent PRD

#7 — [`docs/prd/PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md)

## What to build

Two roles, enforced in layers.

A capability composable is the single answer to "may the current user do this?",
expressed as entity-and-operation pairs. Navigation entries, page actions, row actions
and bulk operations all consult it; nothing performs its own role comparison. The sidebar
was built from a declared entry list in PRD-002 precisely so it could be filtered here
without touching the component.

**Enforcement is layered, and only one layer is a real control.** The UI hides what the
user cannot do; the router guard rejects direct navigation to a route requiring a
capability they lack; the mock rejects the write regardless. The first two are usability
— a reviewer who sends a direct write request will find out which was actually built.

The response interceptor gains a 403 branch that notifies without signing the user out: a
permission failure is not a session failure.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Capability composable answers entity-and-operation questions from the current user's role
- [ ] No component or guard performs its own role comparison
- [ ] Navigation entries filtered by their declared permission requirement
- [ ] Create, edit, delete and bulk actions hidden rather than shown-and-rejected for a viewer
- [ ] Route metadata carries an optional required capability; the guard enforces it
- [ ] A viewer navigating directly to an edit URL is turned away with an explanation
- [ ] The mock rejects a viewer's write with 403 regardless of the UI
- [ ] Response interceptor handles 403 with a notification and no session reset
- [ ] Role shown in the account menu
- [ ] Unit tests for every role-and-operation combination
- [ ] Integration tests: signed in as a viewer, write actions are absent, a direct edit URL is refused, and a forced write request is rejected
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #36 — *PRD-007 contract — dashboard stats, bulk endpoints, CSV param, viewer role*

This slice's branch is created off `feat/36-prd007-contract` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/37-permissions`

## User stories addressed

Referenced by number from the parent PRD:

- 35-40 (viewer browsing, hidden actions, URL refusal, API enforcement, role visible, documented credentials)
