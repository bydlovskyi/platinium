# Issue #30 — Categories — list, modal CRUD, uniqueness handling, deletion

| | |
|---|---|
| **GitHub issue** | [#30](https://github.com/bydlovskyi/platinum/issues/30) |
| **Parent PRD** | [#5](https://github.com/bydlovskyi/platinum/issues/5) · [`PRD-005-ticket-categories-management.md`](../prd/PRD-005-ticket-categories-management.md) |
| **Type** | AFK |
| **Slice** | 20 of 41 |
| **Branch** | `feat/30-categories-crud` |

```
Parent: #5
Parent branch: feat/29-categories-contract
Branch: feat/30-categories-crud
Blocked by: #29
```

## Parent PRD

#5 — [`docs/prd/PRD-005-ticket-categories-management.md`](../prd/PRD-005-ticket-categories-management.md)

## What to build

Complete category management as a thin composition of existing parts. **This slice
should be conspicuously small. If it is not, the shared machinery is shallower than
intended — and that is worth discovering now, with a two-field entity, rather than at the
fourth entity in a production platform.**

A modal form rather than a route, following the rule recorded in PRD-005: a form with
more than three fields, any cross-field constraint, or any complex control gets a route;
anything smaller gets a dialog. Two text inputs is firmly dialog territory, and an
administrator defining a set of categories is doing repetitive work where staying on the
list matters. It also exercises the project's modal infrastructure with a real feature
for the first time.

No client-side uniqueness pre-check. A check-then-write is a race even against a mock, it
doubles the request count, and the server enforces it regardless. The conflict response
is the mechanism; the client's job is to render it on the right field.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] List renders through the shared data table: name and description columns, search, sort by name and creation date, pagination
- [ ] No filters — none of the entity's attributes justify one
- [ ] Create and edit use one form component in an auto-registered `*Modal.vue` opened via the modals composable
- [ ] Name required with a maximum length; description optional with a maximum length and a live character counter
- [ ] Values are trimmed before submission
- [ ] A duplicate-name 409 attaches its message to the name field and leaves the dialog open
- [ ] First field focused on open; focus returns to the trigger on close
- [ ] Enter submits; Escape closes a clean form and prompts on a dirty one
- [ ] Submit shows progress and is disabled while in flight
- [ ] Success notification on save; the list refreshes preserving the current page and search
- [ ] Delete confirmed with the category name; a 409 states how many tickets block it and links to them
- [ ] Dialog is full-width on mobile; the list renders as cards at 375px
- [ ] No new shared module is introduced — any need for one is escalated as a finding against PRD-003 or PRD-004
- [ ] Unit tests: required name, length bounds on both fields, optional description, trimming
- [ ] Integration tests: full CRUD; duplicate name lands on the name field; deleting a referenced category surfaces the conflict
- [ ] Component tests: focus on open, focus restored on close, Escape behaviour on clean and dirty forms
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #29 — *Categories contract — endpoints and name uniqueness*

This slice's branch is created off `feat/29-categories-contract` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/30-categories-crud`

## User stories addressed

Referenced by number from the parent PRD:

- 1-32 (the entire PRD)
