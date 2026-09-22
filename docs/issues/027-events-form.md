# Issue #27 — Events form — create, edit, date-range validation, unsaved-changes guard

| | |
|---|---|
| **GitHub issue** | [#27](https://github.com/bydlovskyi/platinum/issues/27) |
| **Parent PRD** | [#4](https://github.com/bydlovskyi/platinum/issues/4) · [`PRD-004-events-management.md`](../prd/PRD-004-events-management.md) |
| **Type** | AFK |
| **Slice** | 17 of 41 |
| **Branch** | `feat/27-events-form` |

```
Parent: #4
Parent branch: feat/26-events-list
Branch: feat/27-events-form
Blocked by: #26
```

## Parent PRD

#4 — [`docs/prd/PRD-004-events-management.md`](../prd/PRD-004-events-management.md)

## What to build

One form component serving both create and edit, differing only in whether it
loads an existing record first. Separate create and edit components are how a validation
rule gets fixed in one and not the other.

A route rather than a modal: seven fields including two date pickers and a searchable
country select is more than a dialog should carry on a phone, and a route gives each
record a shareable URL.

The date constraint is enforced in three places for three different reasons — in the
picker so the administrator cannot express the mistake, in the form rules so a
programmatic change is still caught, and in the mock so the contract is honest about
what the server accepts.

The unsaved-changes composable is built generically here because PRD-005 and PRD-006
reuse it unchanged. Nothing in the assessment demands it, and its absence is the single
most common way an administrator loses ten minutes of typing.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] One form component used by both the create and edit routes
- [ ] Fields: name, country, venue, start date, end date, status — required fields marked before submission
- [ ] Country is a searchable select over a bundled ISO 3166-1 list; the code is stored, the name displayed
- [ ] End-date picker disables dates before the chosen start date
- [ ] Changing the start date past the existing end date clears it with a visible warning
- [ ] Name length bounds enforced with a clear message
- [ ] Submit shows progress and is disabled while in flight
- [ ] Server-side field errors attach to the inputs that caused them
- [ ] Success notification on save; returns to the list at the same filtered page
- [ ] Edit form pre-filled with current values; a 404 shows a clear message rather than an empty form
- [ ] Unsaved-changes composable prompts on navigation away and on page unload; saving clears the dirty state
- [ ] Single-column layout; usable at 375px
- [ ] Unit tests: required fields, name length bounds, date ordering in both directions, end-date clearing
- [ ] Unit tests for the unsaved-changes composable: clean navigates freely, dirty prompts, saved clears
- [ ] Integration tests: create with a validation failure then a success and verify the row appears; edit and verify the change
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #26 — *Events list — columns, filters, sorting, pagination*

This slice's branch is created off `feat/26-events-list` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/27-events-form`

## User stories addressed

Referenced by number from the parent PRD:

- 11-29 (create and edit, validation, date constraint, unsaved changes)
