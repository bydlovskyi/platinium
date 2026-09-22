# Issue #19 — Session and login — auth store, bootstrap, route guard, login screen

| | |
|---|---|
| **GitHub issue** | [#19](https://github.com/bydlovskyi/platinum/issues/19) |
| **Parent PRD** | [#2](https://github.com/bydlovskyi/platinum/issues/2) · [`PRD-002-authentication-and-admin-shell.md`](../prd/PRD-002-authentication-and-admin-shell.md) |
| **Type** | AFK |
| **Slice** | 9 of 41 |
| **Branch** | `feat/19-session-and-login` |

```
Parent: #2
Parent branch: feat/18-auth-contract
Branch: feat/19-session-and-login
Blocked by: #18
```

## Parent PRD

#2 — [`docs/prd/PRD-002-authentication-and-admin-shell.md`](../prd/PRD-002-authentication-and-admin-shell.md)

## What to build

A working sign-in, and the session machinery every protected screen depends on.

The login screen is mocked authentication with real form mechanics: validation with
inline messages, a disabled-and-spinning submit while the request is in flight, and a
clear error when credentials are rejected. The point is not the authentication — it is
establishing the validation and loading patterns every other form in the portal follows.

The guard is declarative. Routes carry metadata describing what they require and one
guard enforces it; no component performs its own access check. Session bootstrap runs
before the first navigation resolves — not merely before mount — because otherwise the
guard races the restore and a reload on a deep admin route bounces to login. That
ordering is the most likely source of a subtle defect in this slice.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Auth store owns token, current user and derived authenticated flag; exposes sign-in, sign-out and restore
- [ ] Session bootstrap completes before the first guard evaluation, not merely before mount
- [ ] A reload on a deep admin route restores the session and stays on that route
- [ ] Guard reads route metadata for requires-auth and requires-anonymous and redirects accordingly
- [ ] An anonymous visitor hitting an admin route is redirected to login with the intended destination preserved
- [ ] After signing in, the administrator lands on the preserved destination, or the dashboard when there is none
- [ ] An authenticated administrator hitting the login page is redirected to the dashboard
- [ ] Login form: email format and required validation, messages on blur rather than on every keystroke
- [ ] Submit shows progress and is disabled while in flight; Enter submits
- [ ] Password visibility can be toggled
- [ ] Credential rejection shows a clear, non-blaming message
- [ ] Sign-out clears token, user and cached entity state
- [ ] Token stored in `localStorage`; the choice and its XSS exposure recorded for TECHNICAL_REVIEW
- [ ] Unit tests: store sign-in success and failure, sign-out clearing state, restore from present and absent tokens
- [ ] Unit tests: guard against every metadata combination, asserting redirect target and preserved destination
- [ ] Integration test: validation failure, credential rejection, successful sign-in and redirect, and redirect back to a preserved destination
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #18 — *Auth contract — login, logout, session endpoints*

This slice's branch is created off `feat/18-auth-contract` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/19-session-and-login`

## User stories addressed

Referenced by number from the parent PRD:

- 1-17 (the full login and session journey)
