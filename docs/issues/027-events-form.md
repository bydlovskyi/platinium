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

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

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

Built as an `el-form` with `:rules`: `el-input maxlength show-word-limit` for name and
venue, `el-select filterable` for country, two `el-date-picker`s (the end one with
`:disabled-date`), an `el-radio-group` / `el-segmented` for status, an `el-alert` for the
cleared-end-date warning, `el-button :loading` to submit, `el-result` for a missing
record and `ElMessageBox.confirm` for the unsaved-changes prompt.

The unsaved-changes composable is built generically here because PRD-005 and PRD-006
reuse it unchanged. Nothing in the assessment demands it, and its absence is the single
most common way an administrator loses ten minutes of typing.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] One form component used by both the create and edit routes
- [ ] `el-form :model :rules label-position="top"` with an `el-form-item prop` per field: name, country, venue, start date, end date, status — required fields marked by `el-form-item`'s required asterisk before submission; validation runs through the form ref
- [ ] Country is an `el-select filterable` with an `el-option` per entry of a bundled ISO 3166-1 list; the code is the `:value`, the name the `:label`
- [ ] Start and end are `el-date-picker type="date" value-format="YYYY-MM-DD"`; the end-date picker's `:disabled-date` disables dates before the chosen start date
- [ ] Changing the start date past the existing end date clears it with a visible `el-alert type="warning" :closable="false"` under the end-date field
- [ ] Name length bounds enforced by `el-form` rules with a clear message; name and venue are `el-input` with `maxlength` + `show-word-limit`
- [ ] Status is an `el-radio-group` (or `el-segmented`) over the four `EventStatus` values
- [ ] Submit is `el-button type="primary" native-type="submit" :loading` — shows progress and blocks a second click while in flight; cancel is a plain `el-button`
- [ ] Server-side field errors attach to the inputs that caused them via `el-form-item :error`
- [ ] Success notification on save; returns to the list at the same filtered page
- [ ] Edit form pre-filled with current values; a 404 shows `el-result icon="warning"` with a back-to-list `el-button` rather than an empty form
- [ ] Unsaved-changes composable prompts through `ElMessageBox.confirm` on navigation away (and the browser prompt on page unload); saving clears the dirty state
- [ ] Single-column layout; usable at 375px
- [ ] Built from Element Plus components; no raw `<button>`/`<input>`/`<select>`/`<textarea>` in this slice
- [ ] Every newly adopted Element Plus component's `theme-chalk` stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Tests mount real Element Plus components (no stubs); teleported poppers and message boxes are queried in `document.body`
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
