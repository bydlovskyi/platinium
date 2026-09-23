# Issue #45 — Design system documentation

| | |
|---|---|
| **GitHub issue** | [#45](https://github.com/bydlovskyi/platinum/issues/45) |
| **Parent PRD** | [#10](https://github.com/bydlovskyi/platinum/issues/10) · [`PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md) |
| **Type** | AFK |
| **Slice** | 35 of 41 |
| **Branch** | `feat/45-design-system-docs` |

```
Parent: #10
Parent branch: feat/44-polish-pass
Branch: feat/45-design-system-docs
Blocked by: #44
```

## Parent PRD

#10 — [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md). The reference documents its rules and links to it rather than duplicating it.

## What to build

What keeps the system intact after PRD-010 closes.

A short reference covering the tokens and what each means, the token → `--el-*`
mapping that themes Element Plus in both themes, the type scale, the spacing rhythm, the
motion rules, the status colour → `el-tag` mapping, the Element Plus-first rule, and the
rules for adding a new screen. Without it, the next contributor reaches for a hex value and the system starts
eroding at the first screen nobody reviewed.

PRD-009 links to this rather than duplicating it.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Every semantic token documented with its meaning and when to use it
- [ ] Token → `--el-*` mapping documented for both themes (where it lives in `element-reset/theme.css`, and that `.el-*` selector overrides are a commented last resort)
- [ ] Type scale documented with weights and line heights per step
- [ ] Spacing rhythm and the three radii and three elevations documented
- [ ] Motion rules documented, including the fixed list of animated moments, which ones are Element Plus's built-in transitions driven by `--el-transition-duration*`, the `el-table` `row-class-name` row-leave pattern, and the reduced-motion requirement
- [ ] Status colour mapping documented for every event and ticket status as `el-tag` `type` + `effect` via `StatusTag`
- [ ] Element Plus-first rule documented: build from the component map, shared components wrap Element Plus, no raw interactive HTML, icons through Element Plus slots, the standing exceptions, one root `el-config-provider` — linking to `docs/prd/ELEMENT-PLUS.md`
- [ ] Rules for adding a new screen so it is consistent by default rather than by review, including registering each newly adopted component's theme-chalk stylesheet in `element-reset/components/index.css`
- [ ] Contrast verification results recorded
- [ ] Lives in `docs/` and is linked from the README
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #44 — *Iconography, density and responsive refinement*

This slice's branch is created off `feat/44-polish-pass` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/45-design-system-docs`

## User stories addressed

Referenced by number from the parent PRD:

- 39 (documented tokens and usage rules)
