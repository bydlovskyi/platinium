# Issue #28 — Events deletion — confirmation and dependency-conflict handling

| | |
|---|---|
| **GitHub issue** | [#28](https://github.com/bydlovskyi/platinum/issues/28) |
| **Parent PRD** | [#4](https://github.com/bydlovskyi/platinum/issues/4) · [`PRD-004-events-management.md`](../prd/PRD-004-events-management.md) |
| **Type** | AFK |
| **Slice** | 18 of 41 |
| **Branch** | `feat/28-events-deletion` |

```
Parent: #4
Parent branch: feat/27-events-form
Branch: feat/28-events-deletion
Blocked by: #27
```

## Parent PRD

#4 — [`docs/prd/PRD-004-events-management.md`](../prd/PRD-004-events-management.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

Deletion guarded by the data rather than by hope.

The mock refuses to delete an event that still has tickets and returns the blocking
count. The portal surfaces that as an actionable message telling the administrator how
many tickets block the delete and offering to open them — not a generic failure toast.
That link lands on the tickets list pre-filtered to the event, which works by
construction because PRD-003 put list state in the URL.

This is the behaviour that distinguishes an admin tool that protects its data from one
that quietly corrupts it, and it is the kind of choice an assessment reviewer looks for
explicitly.

The confirmation is `ElMessageBox.confirm` through `useConfirm`, whose `beforeClose` sets
`confirmButtonLoading` while the request runs; the row action is an `el-dropdown-item`
in `AppDataTable`'s row-action `el-dropdown`.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Delete available as a row action (`el-dropdown-item divided` in the row-action `el-dropdown`) and as an `el-button type="danger"` on the edit form
- [ ] Confirmation is `ElMessageBox.confirm` via `useConfirm` and names the specific event
- [ ] Confirm button shows progress and is disabled while in flight — `beforeClose` sets `instance.confirmButtonLoading = true`
- [ ] A 409 renders a specific message stating how many tickets block the deletion
- [ ] The conflict message (notification service, `ElNotification`) links to the tickets list pre-filtered to that event via an `el-link` / `router-link`
- [ ] A successful delete shows a success notification and refreshes the list at the current page
- [ ] Deleting the last row of a page navigates to the previous page rather than showing an empty one
- [ ] Built from Element Plus components; no raw `<button>` in this slice
- [ ] Every newly adopted Element Plus component's `theme-chalk` stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Tests mount real Element Plus components (no stubs); teleported poppers and message boxes are queried in `document.body`
- [ ] Integration test: delete with confirmation succeeds; attempting to delete a referenced event surfaces the conflict message with its count
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #27 — *Events form — create, edit, date-range validation, unsaved-changes guard*

This slice's branch is created off `feat/27-events-form` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/28-events-deletion`

## User stories addressed

Referenced by number from the parent PRD:

- 30-34 (delete, named confirmation, dependency block, count and link, return to place)
