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

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

One form for create and edit, following the route rather than modal rule — seven
fields including two remote selectors is firmly route territory.

It is an `el-form` that composes `CurrencyInput` (`el-input-number`), an `el-select`
for currency, a quantity `el-input-number` and two configurations of `RemoteSelect`
(`el-select` remote), and reuses the unsaved-changes composable from PRD-004 unchanged.
The form itself owns the field set, `el-form` validation rules, dirty tracking and
submission.

Status is not derived from quantity. A ticket with zero quantity is not automatically
sold out, because an administrator may be preparing stock — deriving it would remove
control they need. The two concepts are surfaced separately in the list instead. This
looks like an omission and is in fact a choice; it belongs in TECHNICAL_REVIEW.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Built from `el-form`, `el-form-item`, `el-input`, `el-input-number`, `el-select` / `el-option`, `el-radio-group` (or `el-segmented`), `CurrencyInput`, `RemoteSelect`, `el-button`, `el-result` and `el-page-header` / `el-breadcrumb`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] One form component used by both the create and edit routes
- [ ] Fields: name, price, currency, quantity, status, event, category — each an `el-form-item` with a `prop`
- [ ] Name is an `el-input` with `maxlength` + `show-word-limit` as the live counter
- [ ] Price uses `CurrencyInput`; no conversion logic in the form
- [ ] Currency is an `el-select` over the `Currency` enum, required with no default
- [ ] Quantity is `el-input-number :min="0" :step="1" step-strictly :precision="0"`; zero is accepted and saves successfully
- [ ] Status chosen through `el-radio-group` / `el-segmented` (four options)
- [ ] Event and category use `RemoteSelect`; both required
- [ ] Client validation through `el-form :model :rules`, run via the form ref — no ad-hoc checks
- [ ] Editing pre-fills all values including the resolved event and category, even when they are not on the first page
- [ ] Server-side field errors attach to the inputs that caused them through `el-form-item :error`, including unknown references on `eventId` / `categoryId`
- [ ] Submit is `el-button type="primary" :loading native-type="submit"` and is disabled while in flight; cancel is a plain `el-button`
- [ ] Success notification on save; returns to the list at the same filtered page
- [ ] A 404 on edit shows `el-result icon="warning"` with a back-to-list `el-button` rather than an empty form
- [ ] Unsaved-changes prompt on navigation away via `ElMessageBox.confirm`
- [ ] Status is not derived from quantity
- [ ] Unit tests: required fields, price and quantity bounds, integer-only quantity, required currency — against the real `el-form` rules
- [ ] Integration tests mount real Element Plus components (no stubs) and query teleported poppers (`el-select` dropdowns, `ElMessageBox`) in `document.body`: create with a validation failure then a success; edit including changing the event and verifying the change persists
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
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
