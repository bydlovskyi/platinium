# Issue #25 — Events contract — endpoints, filters, dependency conflict

| | |
|---|---|
| **GitHub issue** | [#25](https://github.com/bydlovskyi/platinum/issues/25) |
| **Parent PRD** | [#4](https://github.com/bydlovskyi/platinum/issues/4) · [`PRD-004-events-management.md`](../prd/PRD-004-events-management.md) |
| **Type** | AFK |
| **Slice** | 15 of 41 |
| **Branch** | `feat/25-events-contract` |

```
Parent: #4
Parent branch: feat/24-list-support-components
Branch: feat/25-events-contract
Blocked by: #24
```

## Parent PRD

#4 — [`docs/prd/PRD-004-events-management.md`](../prd/PRD-004-events-management.md)

## What to build

The events API surface, including the shape that makes referential integrity
actionable rather than merely refusing.

Five REST endpoints built through the handler factory, with the filter vocabulary the
events list needs: status, country and a date range that matches on overlap rather than
containment — a long-running event must not be hidden because it started before the
requested window.

`DependencyConflict` is introduced here and reused by PRD-005. It extends the shared
error envelope with the blocking entity type and count, which is what turns a refusal
into something an administrator can act on. Cascade deletion is explicitly rejected:
silently destroying an unknown number of tickets behind one confirmation is the wrong
default for an administrative tool.

**Only this slice may edit `openapi.yaml` or regenerate `schema.ts` within PRD-004.**

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `GET /events` with `search` (name, venue), `status`, `country`, `startDateFrom`, `startDateTo`, `sort` (name, startDate, endDate, status, createdAt), `order`, `page`, `perPage`
- [ ] Date filtering matches events whose range overlaps the requested window
- [ ] `POST /events` creates; 400 with field errors on invalid input
- [ ] `GET /events/{id}` reads; 404 when unknown
- [ ] `PATCH /events/{id}` partially updates; 400 and 404
- [ ] `DELETE /events/{id}` deletes; 404 when unknown; 409 carrying the dependent ticket count when tickets reference it
- [ ] Schema components: `Event`, `EventPayload`, `EventListResponse`, `DependencyConflict`
- [ ] `EventStatus` referenced from the PRD-001 contract, not redefined
- [ ] Dates are ISO-8601 date strings with no time component
- [ ] Country stored as an ISO 3166-1 alpha-2 code
- [ ] The mock rejects an end date preceding a start date with a field error — the constraint is enforced server-side, not client-only
- [ ] Handlers built through the handler factory, not hand-written
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #24 — *List toolbar, pagination, confirmation, status tag, formatters*

This slice's branch is created off `feat/24-list-support-components` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/25-events-contract`

## User stories addressed

Referenced by number from the parent PRD:

- 32-33 (deletion blocked with a count the administrator can act on)
