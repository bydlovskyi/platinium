# Issue #36 — PRD-007 contract — dashboard stats, bulk endpoints, CSV param, viewer role

| | |
|---|---|
| **GitHub issue** | [#36](https://github.com/bydlovskyi/platinum/issues/36) |
| **Parent PRD** | [#7](https://github.com/bydlovskyi/platinum/issues/7) · [`PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) |
| **Type** | AFK |
| **Slice** | 26 of 41 |
| **Branch** | `feat/36-prd007-contract` |

## Parent PRD

#7 — [`docs/prd/PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md)

## What to build

The consolidated contract change for the whole of PRD-007, declared once so the
four slices that follow never touch `openapi.yaml`.

The dashboard is a single aggregate endpoint, not six list requests reduced in the
browser. The alternative would not survive a realistic dataset, produces six independent
loading states, and would make the portal's scalability claims dishonest.

**Value totals are returned per currency. No cross-currency total is computed anywhere.**
A single figure mixing euros and pounds is not a number; it is a bug with a friendly
face.

Bulk operations are one request per operation returning a per-identifier result, because
a client loop would be N round trips with no transactional meaning and no coherent way to
report partial failure. CSV is a query parameter on the existing list endpoints rather
than a separate endpoint, so filter and sort semantics are shared by construction and
cannot drift.

**Only this slice may edit `openapi.yaml` or regenerate `schema.ts` within PRD-007.**

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `GET /dashboard/stats` returns the complete aggregate payload in one request
- [ ] Schema components: `DashboardStats`, `CurrencyTotal`, `StatusBreakdown`, `BulkRequest`, `BulkResult`
- [ ] Value totals returned as an array of per-currency totals; no cross-currency total exists in the contract
- [ ] `POST /events/bulk`, `POST /categories/bulk`, `POST /tickets/bulk` accept identifiers and an operation and return per-identifier results
- [ ] Bulk results distinguish succeeded identifiers from failed identifiers each carrying a reason
- [ ] Bulk delete respects the dependency rules from PRD-004 and PRD-005, reporting blocked records with their blocking count
- [ ] `GET /events`, `GET /categories`, `GET /tickets` accept a `format` parameter whose CSV value returns the full filtered result as `text/csv` with a content-disposition filename
- [ ] `UserRole` extended with the viewer role; a second seeded viewer account documented in the README
- [ ] Every write endpoint rejects a viewer's token with 403
- [ ] The nearly-sold-out threshold is a named constant with a documented rationale, not a literal in a handler
- [ ] Unit tests for dashboard aggregation against a known fixture set, including per-currency separation and the threshold
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #35 — *Tickets form — create and edit*

This slice's branch is created off `feat/35-tickets-form` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/36-prd007-contract`

## User stories addressed

Referenced by number from the parent PRD:

- 7 (per-currency totals)
- 25-26 (per-record bulk results)
- 29-30 (export respects filters, covers the whole result)
- 38 (viewer writes rejected by the API)
