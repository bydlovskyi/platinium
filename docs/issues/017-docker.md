# Issue #17 — Docker — multi-stage build, nginx SPA config, compose

| | |
|---|---|
| **GitHub issue** | [#17](https://github.com/bydlovskyi/platinum/issues/17) |
| **Parent PRD** | [#1](https://github.com/bydlovskyi/platinum/issues/1) · [`PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md) |
| **Type** | AFK |
| **Slice** | 7 of 41 |
| **Branch** | `feat/17-docker` |

```
Parent: #1
Parent branch: feat/16-error-handling
Branch: feat/17-docker
Blocked by: #16
```

## Parent PRD

#1 — [`docs/prd/PRD-001-platform-foundation.md`](../prd/PRD-001-platform-foundation.md)

## What to build

Make the portal runnable by someone who has not installed the toolchain.

Two stages. A build stage installs from the lockfile, type-checks and builds. A runtime
stage copies only the built assets into nginx, configured to fall back to `index.html`
for unknown paths so client-side routing survives a refresh on a deep link.

Because the mock API runs inside the browser, the production image needs no second
service and no network egress at runtime — which is also why the offline type generation
from the previous contract slice was a prerequisite rather than a preference.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Multi-stage Dockerfile: build stage installs from the lockfile, type-checks and builds; runtime stage contains only static assets and nginx
- [ ] nginx config falls back to `index.html` for unknown paths
- [ ] Refreshing on a nested route serves the application rather than a 404
- [ ] `docker compose up` produces a working portal with seeded data on a documented port
- [ ] Build succeeds with no network access beyond the dependency install
- [ ] `.dockerignore` excludes `node_modules`, local env files and the git directory
- [ ] Image contains no source, no dev dependencies and no build toolchain
- [ ] Build verified against a pruned Docker environment so a warm cache cannot hide a failure
- [ ] Static assets served with appropriate cache headers; `index.html` is not cached
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #16 — *Error handling — response interceptor and notification service*

This slice's branch is created off `feat/16-error-handling` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/17-docker`

## User stories addressed

Referenced by number from the parent PRD:

- 2 (offline generation enables the build)
- 21-23 (one-command run, deep links, minimal runtime surface)
