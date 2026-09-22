# Issue #34 — Tickets list — cross-entity filters, deep-link entry, deletion

| | |
|---|---|
| **GitHub issue** | [#34](https://github.com/bydlovskyi/platinum/issues/34) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 24 of 41 |
| **Branch** | `feat/34-tickets-list` |

```
Parent: #6
Parent branch: feat/33-remote-select
Branch: feat/34-tickets-list
Blocked by: #33
```

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

## What to build

The list that answers the question administrators actually ask: not "show me
tickets" but "show me the VIP tickets for the Berlin show that are still on sale".

That is a filter spanning two foreign keys and a status, computed server-side against a
dataset the client never fully holds. Event and category filters use the remote select
from the previous slice.

This is also where the deep links from PRD-004 and PRD-005 land. Arriving with an event
or category filter in the URL must apply it and show it as an active chip — which works
by construction because list state lives in the URL, and which should be verified rather
than assumed.

Zero-quantity tickets are surfaced distinctly so they do not look like a data-entry
mistake.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Columns: name, price with currency, quantity, status, event name, category name — with responsive priorities set
- [ ] Event and category shown by name, never by identifier
- [ ] Search by name, debounced, reflected in the URL
- [ ] Filters: event, category, status, currency and a price range — each reflected in the URL and shown as a removable chip
- [ ] Event and category filters use the remote select component
- [ ] Combined filters work together and are sent as a single request
- [ ] Sorting by name, price, quantity, status and creation date
- [ ] Prices formatted through the shared money formatter with correct symbol and grouping; numeric columns use tabular figures
- [ ] Zero-quantity tickets visually distinguished
- [ ] Arriving with an event or category filter in the URL applies it and shows it as an active chip
- [ ] Delete as a row action with a named confirmation; succeeds without a dependency check
- [ ] Mobile card presentation shows name, price and status
- [ ] Integration tests: combined event and category filtering asserts the request the mock receives and the rendered result; deep-link entry applies the filter and shows the chip
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #33 — *Remote select — paginated, searchable, preselected-value resolution*

This slice's branch is created off `feat/33-remote-select` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/34-tickets-list`

## User stories addressed

Referenced by number from the parent PRD:

- 1-15 (list, columns, search, all filters, sorting, pagination, deep-link entry)
- 39-45 (deletion, zero quantity, mobile cards, price formatting)
