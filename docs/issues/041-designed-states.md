# Issue #41 — Designed empty, loading and error states

| | |
|---|---|
| **GitHub issue** | [#41](https://github.com/bydlovskyi/platinum/issues/41) |
| **Parent PRD** | [#10](https://github.com/bydlovskyi/platinum/issues/10) · [`PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md) |
| **Type** | AFK |
| **Slice** | 31 of 41 |
| **Branch** | `feat/41-designed-states` |

```
Parent: #10
Parent branch: feat/40-csv-export
Branch: feat/41-designed-states
Blocked by: #40
```

## Parent PRD

#10 — [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

**The strongest signal of care in an admin interface is not the palette — it is the
states nobody demos.** An empty list, a failed load, a filtered result with no matches, a
not-found page. These are what a reviewer looks for when they want to know whether the
work was finished or abandoned at the happy path, and they are cheap to do well once the
tokens exist.

Each gets a designed treatment on an Element Plus component: `el-empty` for the empty
variants and `el-result` for errors, not-found and forbidden. A simple line illustration
built from the token palette, so it themes automatically, goes inside `el-empty`'s
`#image` / `el-result`'s `#icon` slot; the sentence is the `description` / `sub-title`; the
`el-button` that resolves it sits in the default / `#extra` slot. In lists, the variants
render through `el-table`'s `#empty` slot inside `AppDataTable`.

The three empty variants must be visually distinct. Conflating "nothing exists yet" with
"nothing matched your filters" is what makes an administrator believe their data was
deleted.

Skeletons are `el-skeleton` with a `#template` of `el-skeleton-item`s that mirror the
shape of what they replace, including column widths, so the layout does not shift when
real content arrives. A refetch with rows on screen uses `v-loading` on `el-table`.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Token-built line illustrations that theme automatically in both modes — no raster assets, no colour literals — placed inside `el-empty` `#image` / `el-result` `#icon` slots, never as a hand-built panel
- [ ] Three visually distinct empty variants: nothing exists (`el-empty`, create `el-button type="primary"`), nothing matched (`el-empty`, clear-filters `el-button`), load failed (`el-result` or `el-empty` variant, retry `el-button`)
- [ ] Error states built on `el-result` (`#icon`, `title`, `sub-title`, `#extra` action) read as a condition with a way forward, not as a crash
- [ ] `el-skeleton` / `el-skeleton-item` templates mirror content shape including column widths; no layout shift on content arrival
- [ ] Designed not-found (and forbidden) page on `el-result` with the illustration in `#icon` and the way back in `#extra`
- [ ] Login screen given a considered treatment — it is the first impression — within `el-card`, `el-form`, `el-input`, `el-button` and `el-alert`, themed through `--el-*` variables
- [ ] `ElNotification` / `ElMessage` styled through the `--el-*` variables mapped from tokens rather than library defaults or `.el-notification` overrides
- [ ] Every state readable at 375px
- [ ] Built from `el-empty`, `el-result`, `el-skeleton` and `el-button`; no raw `<button>`/`<input>`/`<table>`/`<select>` and no hand-built state panels in this slice
- [ ] Every newly adopted Element Plus component's theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Component tests for each of the three empty variants and the error variant, mounting real Element Plus components (no stubs)
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #40 — *CSV export*

This slice's branch is created off `feat/40-csv-export` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/41-designed-states`

## User stories addressed

Referenced by number from the parent PRD:

- 23-27 (illustrated empty states, filtered-empty distinction, error states, not-found, login screen)
- 36 (notification styling)
