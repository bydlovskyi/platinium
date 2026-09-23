# Issue #38 — Dashboard screen

| | |
|---|---|
| **GitHub issue** | [#38](https://github.com/bydlovskyi/platinum/issues/38) |
| **Parent PRD** | [#7](https://github.com/bydlovskyi/platinum/issues/7) · [`PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) |
| **Type** | AFK |
| **Slice** | 28 of 41 |
| **Branch** | `feat/38-dashboard` |

```
Parent: #7
Parent branch: feat/37-permissions
Branch: feat/38-dashboard
Blocked by: #37
```

## Parent PRD

#7 — [`docs/prd/PRD-007-dashboard-statistics-and-bulk-operations.md`](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The screen an administrator lands on after signing in, answering the Monday-morning
question: what is the state of things?

Headline figures, status breakdowns, the next events starting and the tickets nearly out
of stock — every figure linking into the relevant filtered list, which works because
PRD-003 put list state in the URL. Figures are `el-statistic` tiles (count-up via VueUse
`useTransition` feeding `:value`, off under reduced motion) laid out with `el-row` /
`el-col` breakpoint spans; each is wrapped in an `el-link` / `router-link`. Breakdowns are
one `el-progress` per status (`:color` from tokens, `:format` for the count). The two
lists are compact `el-table size="small"` or `el-timeline`. `el-card shadow="never"` only
where a card is meaningful.

All computation lives in the mock handler, where a real backend would do it. The view
holds presentation only. **Per-currency values are grouped into one clearly labelled
`el-descriptions` (or `el-statistic` group) block; nothing sums across currencies.** A
reviewer scanning for a single "total revenue" figure and not finding one will either
notice the care or ask about it, and the answer is the same either way.

Visual design of this screen is refined in the PRD-010 polish pass; this slice delivers
the data, the structure and the links. Loading is an `el-skeleton` whose `#template` of
`el-skeleton-item`s mirrors the final grid; a failed load is an `el-result` with a retry
`el-button` in `#extra`.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Single request to the aggregate endpoint; no client-side reduction of list data
- [ ] Headline figures as `el-statistic`: total events, currently running events, draft events, total tickets, total available quantity
- [ ] Count-up via VueUse `useTransition` feeding `el-statistic :value`; disabled under `prefers-reduced-motion`
- [ ] Gross inventory value shown per currency in one clearly labelled `el-descriptions` (or grouped `el-statistic`) block; no cross-currency total anywhere
- [ ] Ticket status breakdown and event status breakdown, one `el-progress` per status with a text count (never colour alone)
- [ ] Next events starting, and tickets nearly sold out, as compact `el-table size="small"` or `el-timeline`
- [ ] Every figure and list item links to the matching filtered list through `el-link` / `router-link`
- [ ] `el-skeleton` loading state whose template matches the final layout — no jump on load
- [ ] Failed load renders `el-result` with a retry `el-button`, without a page reload
- [ ] Readable and usable at 375px (`el-row` / `el-col` breakpoint spans collapse to one column)
- [ ] Built from `el-statistic`, `el-row`/`el-col`, `el-progress`, `el-descriptions`, `el-table`/`el-timeline`, `el-link`, `el-skeleton`, `el-result`, `el-button`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] Every newly adopted Element Plus component's `theme-chalk` stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Route is the post-login landing destination
- [ ] Integration test: every `el-statistic` figure renders from MSW and each link navigates to the correctly filtered list
- [ ] Tests mount real Element Plus components (no stubs); teleported poppers queried in `document.body`
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #37 — *Role-based permissions — capability composable, guard, UI gating, 403 handling*

This slice's branch is created off `feat/37-permissions` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/38-dashboard`

## User stories addressed

Referenced by number from the parent PRD:

- 1-15 (the dashboard, its figures, links and states)
