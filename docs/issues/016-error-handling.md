# Issue #16 — Error handling — response interceptor and notification service

| | |
|---|---|
| **GitHub issue** | [#16](https://github.com/bydlovskyi/platinum/issues/16) |
| **Parent PRD** | [#1](https://github.com/bydlovskyi/platinum/issues/1) · [`PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md) |
| **Type** | AFK |
| **Slice** | 6 of 41 |
| **Branch** | `feat/16-error-handling` |

```
Parent: #1
Parent branch: feat/15-msw-mock-backend
Branch: feat/16-error-handling
Blocked by: #15
```

## Parent PRD

#1 — [`docs/prd/PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md)

## What to build

The single place where an HTTP failure becomes something an administrator can
understand. Built once here so that no component or service ever writes error-toast
code again.

The response interceptor maps each failure class onto a distinct outcome: a session
reset and redirect on 401, a rejection carrying the parsed field-error map on 400, and
a toast plus rejection for everything else including network failures and timeouts.
Aborted requests are swallowed silently — a cancelled request is not an error, and
treating it as one produces spurious toasts on every fast-typing administrator.

A per-request flag suppresses the global toast so a form can render the error inline
without duplicating it. The notification service is a thin wrapper over the Element Plus
API so the presentation can change in one place and tests can assert on notifications
without reaching into a UI library.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Successful responses normalised to their payload
- [ ] 401 resets the session and redirects to login with an explanation
- [ ] 400 rejects with a parsed field-error map that forms can attach to inputs
- [ ] 404, 409 and 500 reject and raise a toast with a human-readable message
- [ ] Network failure and timeout produce a distinct, intelligible message rather than a raw axios error
- [ ] Aborted requests are swallowed silently and raise no notification
- [ ] A per-request flag suppresses the global toast; the rejection still propagates
- [ ] Notification service exposes success, error, warning and info; everything that notifies goes through it
- [ ] Notifications are themed through the design tokens rather than library defaults
- [ ] Unit tests cover every failure class including abort and network failure
- [ ] Integration test proves a forced 500 via chaos controls produces exactly one toast
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #15 — *MSW mock backend — browser worker, node server, handler factory, chaos controls*

This slice's branch is created off `feat/15-msw-mock-backend` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/16-error-handling`

## User stories addressed

Referenced by number from the parent PRD:

- 13-14 (readable failure message, success confirmation)
- 16-18 (field errors, single notification point, per-request opt-out)
- 20 (aborted requests)
