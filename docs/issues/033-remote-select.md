# Issue #33 — Remote select — paginated, searchable, preselected-value resolution

| | |
|---|---|
| **GitHub issue** | [#33](https://github.com/bydlovskyi/platinum/issues/33) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 23 of 41 |
| **Branch** | `feat/33-remote-select` |

```
Parent: #6
Parent branch: feat/32-currency-input
Branch: feat/33-remote-select
Blocked by: #32
```

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

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

`RemoteSelect` **wraps `el-select`** in remote mode — `filterable remote
:remote-method :loading` — with `el-option` for each result. Keyboard navigation,
clearing, the dropdown and its positioning are `el-select`'s; the wrapper adds
debouncing, paging, the scroll trigger and preselected-value resolution.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Built from `el-select` (`filterable`, `remote`, `:remote-method`, `:loading`) and `el-option`; no raw `<input>`/`<select>`/`<button>` in this slice
- [ ] Generic over a fetch function, an option renderer and a value resolver
- [ ] Debounced search against the remote endpoint, driven by `:remote-method`
- [ ] Incremental loading of further results on scroll: a scroll listener on the dropdown's `el-scrollbar` wrap, located via a `popper-class`, using VueUse `useInfiniteScroll`
- [ ] A "loading more" row rendered in the `el-select` `#footer` slot while the next page is in flight
- [ ] A preselected value absent from the loaded page is fetched by identifier and merged into `options`, so `el-select` resolves its label
- [ ] The field never renders a bare identifier or an empty box for a valid selection
- [ ] Loading and empty states within the dropdown through the `#loading` and `#empty` slots
- [ ] Option renderer fills the `el-option` default slot and supports secondary detail — the event picker shows country and dates alongside the name
- [ ] Keyboard navigable (native `el-select`); `clearable` clears to empty for an optional field
- [ ] Component tests mount the real `el-select` (no stub) and query the teleported dropdown in `document.body` (or mount with `:teleported="false"`): debounced search, incremental load by scrolling the dropdown `el-scrollbar`, resolution of a preselected value absent from the first page, loading and empty states
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet (`el-select`, `el-option`, `el-scrollbar`, `el-tag` as needed) imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
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
