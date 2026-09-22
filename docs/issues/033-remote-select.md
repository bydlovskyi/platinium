# Issue #33 — Remote select — paginated, searchable, preselected-value resolution

| | |
|---|---|
| **GitHub issue** | [#33](https://github.com/bydlovskyi/platinum/issues/33) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 23 of 41 |
| **Branch** | `feat/33-remote-select` |

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

## What to build

The second deep module of PRD-006. One generic component parameterised by a fetch
function, an option renderer and a value resolver — event and category pickers are two
configurations of it, not two components.

With several dozen events a plain select is acceptable; with thousands it is not. The
mock already returns paginated, searchable lists, so there is no reason to write a
component that would have to be replaced.

**Preselected-value resolution is the behaviour that is routinely omitted and always
noticed.** Without it, editing a ticket whose event sits on page four shows an empty
selector, and saving silently drops the reference. It belongs in the acceptance criteria
explicitly rather than being left to the implementer's diligence.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Generic over a fetch function, an option renderer and a value resolver
- [ ] Debounced search against the remote endpoint
- [ ] Incremental loading of further results on scroll
- [ ] A preselected value absent from the loaded page is fetched by identifier and merged into the options
- [ ] The field never renders a bare identifier or an empty box for a valid selection
- [ ] Loading and empty states within the dropdown
- [ ] Option renderer supports secondary detail — the event picker shows country and dates alongside the name
- [ ] Keyboard navigable; clears to empty for an optional field
- [ ] Component tests: debounced search, incremental load, resolution of a preselected value absent from the first page, loading and empty states
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #32 — *Currency input — the single minor-unit boundary*

This slice's branch is created off `feat/32-currency-input` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/33-remote-select`

## User stories addressed

Referenced by number from the parent PRD:

- 25-29 (searchable pickers, incremental load, secondary detail, preselected resolution)
