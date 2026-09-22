# Issue #23 — Data table — descriptor-driven, responsive, async states

| | |
|---|---|
| **GitHub issue** | [#23](https://github.com/bydlovskyi/platinum/issues/23) |
| **Parent PRD** | [#3](https://github.com/bydlovskyi/platinum/issues/3) · [`PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md) |
| **Type** | AFK |
| **Slice** | 13 of 41 |
| **Branch** | `feat/23-data-table` |

## Parent PRD

#3 — [`docs/prd/PRD-003-data-table-and-list-experience.md`](../prd/PRD-003-data-table-and-list-experience.md)

## What to build

One table component for the whole portal, configured by column descriptors rather
than written three times.

A descriptor carries a field key, a label, a sortable flag, an optional cell renderer, an
alignment and a responsive priority. The component owns both presentations, the sorting
affordances and their accessible state, row selection, the actions column, and the
loading, empty and error states. It emits intent — sort requested, page requested, row
action invoked, selection changed — and holds no fetching logic and no knowledge of any
entity.

The responsive answer is a presentation switch, not a media query on a table. Above the
tablet breakpoint the descriptors render as a table; below it, the same descriptors
render as stacked cards showing only high-priority columns. Because this lives in one
component, every entity screen is responsive the moment it is written.

Selection is page-scoped, and the UI must say so — a select-all that blurs page and
dataset is how an administrator bulk-deletes far more than they intended once PRD-007
lands.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Rendering driven entirely by column descriptors; no entity knowledge in the component
- [ ] Sort cycles through ascending, descending and unsorted on repeated header activation
- [ ] Sorted column marked with its direction; sortable headers announce their sort state to assistive technology
- [ ] Table presentation above the tablet breakpoint; stacked card presentation below, using the same descriptors and showing only high-priority columns
- [ ] Loading state is a skeleton matching the table shape including column widths — no layout shift when content arrives
- [ ] Three distinct empty states: nothing exists yet (offers create), nothing matched the filters (offers clear), and load failed (offers retry)
- [ ] Row actions available per row; grouped into a menu on small screens
- [ ] Row selection with a select-all that visibly indicates it applies to the current page only
- [ ] Every toolbar and table control reachable by keyboard in a sensible order
- [ ] Interactive rows have hover feedback and a visible focus ring
- [ ] Component tests: descriptor-driven rendering, three-state sort cycling, each async state, selection behaviour, and the presentation switch at the tablet breakpoint
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #22 — *List resource composable — fetching, abort, error recovery*

This slice's branch is created off `feat/22-list-resource-composable` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/23-data-table`

## User stories addressed

Referenced by number from the parent PRD:

- 9-12 (sorting, cycling, marking, stability)
- 20-26 (async states, row actions)
- 29-34 (mobile cards, selection semantics, keyboard, screen reader)
