# Issue #18 — Auth contract — login, logout, session endpoints

| | |
|---|---|
| **GitHub issue** | [#18](https://github.com/bydlovskyi/platinum/issues/18) |
| **Parent PRD** | [#2](https://github.com/bydlovskyi/platinum/issues/2) · [`PRD-002-authentication-and-admin-shell.md`](../prd/PRD-002-authentication-and-admin-shell.md) |
| **Type** | AFK |
| **Slice** | 8 of 41 |
| **Branch** | `feat/18-auth-contract` |

```
Parent: #2
Parent branch: feat/17-docker
Branch: feat/18-auth-contract
Blocked by: #17
```

## Parent PRD

#2 — [`docs/prd/PRD-002-authentication-and-admin-shell.md`](../prd/PRD-002-authentication-and-admin-shell.md)

## What to build

The authentication surface, declared in the contract and served by the mock.

Three endpoints and the user model. The role field is introduced here even though only
one role is seeded, because PRD-007 builds permissions on it and adding it later would
mean touching the contract, the store, the guard and every fixture.

The request interceptor gains bearer-token attachment — this is the only slice that
modifies its authorisation behaviour. Mock handlers reject requests without a valid
token, so the 401 path built in the error-handling slice is genuinely exercised rather
than theoretical.

No UI in this slice — the login screen's Element Plus form lands in #19.

**Only this slice may edit `openapi.yaml` or regenerate `schema.ts` within PRD-002.**

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `POST /auth/login` accepts email and password; returns a token and the user record
- [ ] Login returns 400 with field errors for malformed input and 401 for bad credentials
- [ ] `POST /auth/logout` invalidates the current token
- [ ] `GET /auth/me` returns the user record for the current token; 401 when absent, unknown or expired
- [ ] Schema components: `User` (id, name, email, role), `UserRole`, `LoginRequest`, `LoginResponse`
- [ ] One administrator account seeded with credentials documented in the README
- [ ] Request interceptor attaches the bearer token from the persisted token when present
- [ ] Mock handlers reject unauthenticated requests to protected paths with 401
- [ ] Integration test proves a request without a token receives 401 and triggers the interceptor's session-reset path
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #17 — *Docker — multi-stage build, nginx SPA config, compose*

This slice's branch is created off `feat/17-docker` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/18-auth-contract`

## User stories addressed

Referenced by number from the parent PRD:

- 1 (login exists)
- 2 (documented demo credentials)
- 16 (session expiry surfaced)
