# Issue #26 — Events list — columns, filters, sorting, pagination

| | |
|---|---|
| **GitHub issue** | [#26](https://github.com/bydlovskyi/platinum/issues/26) |
| **Parent PRD** | [#4](https://github.com/bydlovskyi/platinum/issues/4) · [`PRD-004-events-management.md`](../prd/PRD-004-events-management.md) |
| **Type** | AFK |
| **Slice** | 16 of 41 |
| **Branch** | `feat/26-events-list` |

## Parent PRD

#4 — [`docs/prd/PRD-004-events-management.md`](../prd/PRD-004-events-management.md)

## What to build

The first entity screen, and therefore the proof that the shared list machinery
actually holds.

This slice should be thin: column descriptors, a filter descriptor, and the list query
and list resource composables. **Any meaningful list logic appearing in this view is a
finding about PRD-003, not about events** — and the fix belongs in the shared component
rather than in a local variant, because the next two entities will copy whatever is done
here.

Search across name and venue; filter by status, country and an overlapping date range;
sort by name, start date, end date or status. All of it in the URL, all of it computed
by the mock.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Events list route renders through the shared data table with column descriptors only
- [ ] Columns: name, country, venue, date range, status — with responsive priorities set for the mobile card layout
- [ ] Country rendered as a name, not a code; dates rendered readably; status rendered through the shared status tag
- [ ] Search across name and venue, debounced, reflected in the URL
- [ ] Filters: status, country and a date range — each reflected in the URL and shown as a removable chip
- [ ] Sorting by name, start date, end date and status, reflected in the URL
- [ ] Pagination with total count
- [ ] All three async states render: nothing exists, nothing matched, load failed
- [ ] Page header with title and a create action
- [ ] Mobile card presentation readable at 375px
- [ ] No list-state logic in this view — it composes the PRD-003 composables
- [ ] Integration tests: search, each filter, sort toggling and pagination all reflected in the URL and in the request the mock receives
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #25 — *Events contract — endpoints, filters, dependency conflict*

This slice's branch is created off `feat/25-events-contract` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/26-events-list`

## User stories addressed

Referenced by number from the parent PRD:

- 1-10 (list, columns, search, filters, sorting, pagination)
- 35-37 (mobile cards, status badge, readable dates)
