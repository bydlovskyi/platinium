# Issue #44 — Iconography, density and responsive refinement

| | |
|---|---|
| **GitHub issue** | [#44](https://github.com/bydlovskyi/platinum/issues/44) |
| **Parent PRD** | [#10](https://github.com/bydlovskyi/platinum/issues/10) · [`PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md) |
| **Type** | AFK |
| **Slice** | 34 of 41 |
| **Branch** | `feat/44-polish-pass` |

```
Parent: #10
Parent branch: feat/43-dashboard-design
Branch: feat/44-polish-pass
Blocked by: #43
```

> **Design decisions:** Judged against the design decisions recorded on issue #12. A human reviews the result in the PR rather than gating the chain on it.

## Parent PRD

#10 — [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The pass across every finished screen that turns a consistent interface into a
designed one.

Tabular figures in numeric columns, a constrained content width, and choosing between
zebra striping and row hover rather than using both are each individually trivial.
Collectively they are most of the difference between a table that looks designed and one
that looks generated, which is why they are specified rather than left to taste.

The pass also audits the Element Plus-first rule across every screen: any remaining raw
interactive HTML or hand-built control is replaced by its Element Plus equivalent from
the component map, and any `.el-*` selector override is moved into an `--el-*` variable
where the variable can express it.

HITL because this is a judgement pass. It needs a human looking at real screens at real
widths and deciding what is still wrong.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] One icon set used throughout, via the type-safe icon component and its generated union, passed through Element Plus `#icon` / `#prefix` / `#suffix` slots or `el-icon`; no `@element-plus/icons-vue`
- [ ] Icons accompany text for important actions; icon-only `el-button circle` / `text` controls carry an `aria-label` and an `el-tooltip`
- [ ] Content area inside `el-main` uses a constrained maximum width with consistent gutters — no uncomfortable stretching on a wide monitor
- [ ] `el-table` row height chosen for scanning; `stripe` or row hover (`--el-table-row-hover-bg-color`), not both
- [ ] Numeric `el-table-column`s and `el-statistic` values use tabular figures throughout
- [ ] Forms are single-column `el-form label-position="top"` with `el-form-item` groups separated by `el-divider` or headings rather than a dense grid
- [ ] Type and spacing adapted at mobile width rather than merely reflowed (`el-dialog :fullscreen`, `el-pagination small`, `el-card` rows below tablet)
- [ ] Tap targets meet the minimum size on touch devices, especially for destructive actions
- [ ] Destructive actions visually distinct from safe ones on every screen — `el-button type="danger"`, `divided` danger `el-dropdown-item`, confirmed through `ElMessageBox.confirm` via `useConfirm`
- [ ] Focus ring visible on every interactive element across every screen in both themes, including native controls rendered by Element Plus
- [ ] Full visual review at desktop, tablet and mobile widths in both themes, with findings resolved
- [ ] No hardcoded colour, size or spacing value remains — all values come from tokens or the `--el-*` variables mapped from them
- [ ] Audit: no raw `<button>`/`<input>`/`<table>`/`<select>`/`<textarea>` in feature or shared code outside the standing exceptions in `ELEMENT-PLUS.md`; each remaining `.el-*` override carries a comment naming what the variable could not express
- [ ] Every Element Plus component used in `src/` has its theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Integration test (real Element Plus components, no stubs): toggling the theme updates the document, switches the `--el-*` variables, and persists; no screen renders a hardcoded colour
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #43 — *Dashboard visual design*

This slice's branch is created off `feat/43-dashboard-design` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/44-polish-pass`

## User stories addressed

Referenced by number from the parent PRD:

- 8 (destructive distinction)
- 12-15 (density, tables, hover, focus)
- 32-35 (iconography, icons with text, mobile type and spacing, tap targets)
