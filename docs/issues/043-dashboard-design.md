# Issue #43 — Dashboard visual design

| | |
|---|---|
| **GitHub issue** | [#43](https://github.com/bydlovskyi/platinum/issues/43) |
| **Parent PRD** | [#10](https://github.com/bydlovskyi/platinum/issues/10) · [`PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md) |
| **Type** | AFK |
| **Slice** | 33 of 41 |
| **Branch** | `feat/43-dashboard-design` |

```
Parent: #10
Parent branch: feat/42-motion
Branch: feat/43-dashboard-design
Blocked by: #42
```

## Parent PRD

#10 — [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The first screen after login, carrying the impression of the whole portal.

Headline figures are `el-statistic` at the largest type step with muted `title`s, in an
`el-row` / `el-col` grid with breakpoint spans, dominating the layout so the summary
arrives before any reading happens. Per-status breakdowns are `el-progress` bars
(`:percentage`, `:color` from status tokens, `:format` for the count); a single stacked
proportional distribution bar is the one hand-built exception, built from tokens with an
accessible text equivalent. No charting dependency is added unless a genuine chart earns
its place, and if one is added it must theme correctly in both modes.

Per-currency values grouped into one clearly labelled block (`el-descriptions`, or a group
of `el-statistic` under one heading) so two currencies can never be misread as one total.

Hierarchy comes from density and weight, not from wrapping everything in a bordered card.
Administrative interfaces fail when every section is a box.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Headline figures are `el-statistic` at the largest type step with muted `title`s; they dominate the layout
- [ ] Supporting secondary figures (`#suffix` or a secondary `el-statistic`) where they add meaning
- [ ] Status breakdowns rendered proportionally with `el-progress` per status so the distribution reads in one glance; any stacked bar is token-built with a text equivalent
- [ ] Per-currency values grouped into one clearly labelled `el-descriptions` / `el-statistic` block, never summed
- [ ] `el-card shadow="never"` used only where a card is meaningful — not as a default container for every section
- [ ] Hierarchy built from spacing, type weight and colour rather than borders
- [ ] Numeric figures (`el-statistic` values, compact `el-table` columns) use tabular figures
- [ ] Any charting dependency is justified by clarity and themes correctly in both modes
- [ ] Layout holds at tablet and mobile widths (`el-col` breakpoint spans) without becoming a single undifferentiated stack
- [ ] Contrast verified in both themes
- [ ] Built from `el-statistic`, `el-row`/`el-col`, `el-progress`, `el-descriptions`, `el-card`, `el-skeleton` and `el-result`; no raw `<button>`/`<input>`/`<table>`/`<select>` in this slice
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #42 — *Motion and micro-interactions*

This slice's branch is created off `feat/42-motion` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/43-dashboard-design`

## User stories addressed

Referenced by number from the parent PRD:

- 28-31 (headline dominance, proportional breakdowns, grouped currencies, figures animating in)
- 12 (dense but calm)
