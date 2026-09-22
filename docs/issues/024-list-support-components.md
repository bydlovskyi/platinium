# Issue #24 — List toolbar, pagination, confirmation, status tag, formatters

| | |
|---|---|
| **GitHub issue** | [#24](https://github.com/bydlovskyi/platinum/issues/24) |
| **Parent PRD** | [#3](https://github.com/bydlovskyi/platinum/issues/3) · [`PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md) |
| **Type** | AFK |
| **Slice** | 14 of 41 |
| **Branch** | `feat/24-list-support-components` |

## Parent PRD

#3 — [`docs/prd/PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md)

## What to build

The supporting pieces that complete the list experience, each shared so that
behaviour cannot diverge between entities.

The toolbar holds search, filter controls, active-filter chips and a slot for page
actions, collapsing into a drawer below the tablet breakpoint. Pagination renders the
shared envelope directly.

The confirmation composable is one call used by every delete in the portal: it names the
specific record, handles the confirm button's in-flight state, and returns a resolved
intent. A generic "are you sure?" is how an administrator deletes the wrong row.

The status tag maps a status enum to a consistent colour and label portal-wide, using the
mapping defined in the design foundation — a draft event and a draft ticket must look the
same. Formatters extend the existing filters module with locale-aware dates and money
that takes minor units and a currency code, matching the integer-minor-units decision.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Toolbar: search input with a clear action, filter controls, active-filter chips that are individually removable, clear-all action, slot for page actions
- [ ] Toolbar collapses into a drawer below the tablet breakpoint
- [ ] Pagination renders the shared `PaginationMeta` envelope with total count visible and a page-size selector
- [ ] Confirmation composable names the record, disables and shows progress on the confirm button while in flight, and resolves to a clear intent
- [ ] Status tag maps every event and ticket status to the colour and label defined in the design foundation; identical statuses look identical across entities
- [ ] Status tag is distinguishable in greyscale — never colour alone
- [ ] Date formatter is locale-aware; a date range renders as one readable string
- [ ] Money formatter takes minor units plus a currency code and renders with the correct symbol and grouping
- [ ] Unit tests for formatters including zero, a large value and each supported currency
- [ ] Unit tests for the confirmation composable covering confirm and cancel paths
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #23 — *Data table — descriptor-driven, responsive, async states*

This slice's branch is created off `feat/23-data-table` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/24-list-support-components`

## User stories addressed

Referenced by number from the parent PRD:

- 3, 7-8 (clear search, filter chips, clear all)
- 13-15 (pagination, page size, persistence)
- 27-28 (named confirmation, in-flight confirm button)
- 30 (mobile filter drawer)
- 36-37 from PRD-004 (status badge, readable dates)
