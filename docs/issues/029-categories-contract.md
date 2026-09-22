# Issue #29 — Categories contract — endpoints and name uniqueness

| | |
|---|---|
| **GitHub issue** | [#29](https://github.com/bydlovskyi/platinum/issues/29) |
| **Parent PRD** | [#5](https://github.com/bydlovskyi/platinum/issues/5) · [`PRD-005-ticket-categories-management.md`](../prd/PRD-005-ticket-categories-management.md) |
| **Type** | AFK |
| **Slice** | 19 of 41 |
| **Branch** | `feat/29-categories-contract` |

```
Parent: #5
Parent branch: feat/28-events-deletion
Branch: feat/29-categories-contract
Blocked by: #28
```

## Parent PRD

#5 — [`docs/prd/PRD-005-ticket-categories-management.md`](../prd/PRD-005-ticket-categories-management.md)

## What to build

The categories API surface. Small, and deliberately so.

Name uniqueness is case-insensitive and whitespace-trimmed, enforced in the handler.
Comparing raw strings would let "VIP " and "vip" coexist, which defeats the purpose of
having a controlled vocabulary at all.

The uniqueness conflict uses a distinct error code from `DependencyConflict` so the
client can tell a duplicate-name violation from a referential one and render each on the
right surface.

**Only this slice may edit `openapi.yaml` or regenerate `schema.ts` within PRD-005.**

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `GET /categories` with `search` (name, description), `sort` (name, createdAt), `order`, `page`, `perPage`
- [ ] `POST /categories` creates; 400 with field errors; 409 on a duplicate name
- [ ] `GET /categories/{id}` reads; 404 when unknown
- [ ] `PATCH /categories/{id}` partially updates; 400, 404, and 409 on a duplicate name
- [ ] `DELETE /categories/{id}` deletes; 404 when unknown; 409 with the dependent ticket count
- [ ] Schema components: `Category`, `CategoryPayload`, `CategoryListResponse`
- [ ] `DependencyConflict` referenced from the PRD-004 contract, not redefined
- [ ] Uniqueness conflict carries a distinct error code from the dependency conflict
- [ ] Uniqueness is case-insensitive and whitespace-trimmed
- [ ] Handlers built through the handler factory
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #28 — *Events deletion — confirmation and dependency-conflict handling*

This slice's branch is created off `feat/28-events-deletion` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/29-categories-contract`

## User stories addressed

Referenced by number from the parent PRD:

- 14 (duplicate name rejected)
- 29-30 (deletion blocked with a count)
