# Issue #35 — Tickets form — create and edit

| | |
|---|---|
| **GitHub issue** | [#35](https://github.com/bydlovskyi/platinum/issues/35) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 25 of 41 |
| **Branch** | `feat/35-tickets-form` |

```
Parent: #6
Parent branch: feat/34-tickets-list
Branch: feat/35-tickets-form
Blocked by: #34
```

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

## What to build

One form for create and edit, following the route rather than modal rule — seven
fields including two remote selectors is firmly route territory.

It composes the currency input and two configurations of the remote select, and reuses
the unsaved-changes composable from PRD-004 unchanged. The form itself owns the field
set, validation rules, dirty tracking and submission.

Status is not derived from quantity. A ticket with zero quantity is not automatically
sold out, because an administrator may be preparing stock — deriving it would remove
control they need. The two concepts are surfaced separately in the list instead. This
looks like an omission and is in fact a choice; it belongs in TECHNICAL_REVIEW.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] One form component used by both the create and edit routes
- [ ] Fields: name, price, currency, quantity, status, event, category
- [ ] Price uses the currency input; no conversion logic in the form
- [ ] Currency is required with no default
- [ ] Quantity restricted to whole non-negative numbers; zero is accepted and saves successfully
- [ ] Event and category use the remote select; both required
- [ ] Editing pre-fills all values including the resolved event and category, even when they are not on the first page
- [ ] Server-side field errors attach to the inputs that caused them, including unknown references
- [ ] Submit shows progress and is disabled while in flight
- [ ] Success notification on save; returns to the list at the same filtered page
- [ ] A 404 on edit shows a clear message rather than an empty form
- [ ] Unsaved-changes prompt on navigation away
- [ ] Status is not derived from quantity
- [ ] Unit tests: required fields, price and quantity bounds, integer-only quantity, required currency
- [ ] Integration tests: create with a validation failure then a success; edit including changing the event and verifying the change persists
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #34 — *Tickets list — cross-entity filters, deep-link entry, deletion*

This slice's branch is created off `feat/34-tickets-list` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/35-tickets-form`

## User stories addressed

Referenced by number from the parent PRD:

- 16-38 (create and edit, validation, pickers, references, unsaved changes)
