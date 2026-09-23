# Issue #12 — Design system foundation — tokens, typography, dark palette, motion

| | |
|---|---|
| **GitHub issue** | [#12](https://github.com/bydlovskyi/platinum/issues/12) |
| **Parent PRD** | [#10](https://github.com/bydlovskyi/platinum/issues/10) · [`PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md) |
| **Type** | AFK |
| **Slice** | 2 of 41 |
| **Branch** | `feat/12-design-system-foundation` |

```
Parent: #10
Parent branch: feat/11-test-harness
Branch: feat/12-design-system-foundation
Blocked by: #11
```

> **Design decisions:** The palette, typeface, density and motion tokens are decided and recorded in a comment on the GitHub issue. Implement exactly those values.

## Parent PRD

#10 — [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The token layer every screen in this project is built from. This is the foundation
half of PRD-010 and it must land before the first screen exists: retrofitting a type
scale means touching every component, and retrofitting a dark palette after hardcoded
colours have spread is an audit rather than a feature.

Semantic CSS custom properties — `surface`, `surface-raised`, `border-subtle`,
`text-primary`, `text-muted`, `accent`, `danger` and the rest — each with a light and a
dark value, over a literal palette that no component reaches past. Element Plus is
themed by mapping those same tokens onto its `--el-*` CSS variables
(`--el-color-primary`, `--el-bg-color`, `--el-text-color-*`, `--el-border-color-*`,
`--el-border-radius-base`, `--el-font-family`, `--el-transition-duration*`) in
`src/assets/styles/element-reset/theme.css` for both themes — not by overriding `.el-*`
selectors — and Tailwind consumes them, so a utility class and a library component
cannot disagree about what a surface is. One root `el-config-provider` in `App.vue` owns
size, z-index base, locale and `button.autoInsertSpace`.

HITL because the palette, the typeface and the density decisions are design judgements
that need a human eye before forty screens inherit them.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Semantic token layer defined with a light and a dark value for every token; a token missing its dark counterpart fails the test
- [ ] Literal palette exists beneath the semantic layer; no component references a literal or a hex value
- [ ] Element Plus themed by mapping semantic tokens onto `--el-*` variables in `element-reset/theme.css`, under both the light and the dark theme selector (layered on `element-plus/theme-chalk/dark/css-vars.css`); no selector-level `.el-*` override without a comment naming what the variable could not express
- [ ] Root `el-config-provider` in `App.vue` sets size, z-index base, locale and `button.autoInsertSpace`; no component sets these individually
- [ ] Theme-chalk base and every Element Plus component in use imported in `src/assets/styles/element-reset/components/index.css` (resolver runs with `importStyle: false`)
- [ ] Tailwind theme consumes the same token values
- [ ] Type scale fixed with defined weight and line height per step: screen heading, section heading, label, body, caption
- [ ] Typeface self-hosted and preloaded, and assigned to `--el-font-family`; type scale mapped onto `--el-font-size-*`; no flash of unstyled text, no runtime third-party request
- [ ] Tabular-figure variant available as a utility and applied to numeric `el-table-column`s (via descriptor `class-name`) and `el-statistic` values
- [ ] Spacing scale on a consistent rhythm; exactly three radii and three elevations, mapped onto `--el-border-radius-*` and `--el-box-shadow*`
- [ ] Body text and interactive elements meet WCAG AA contrast against their own surface in both themes, verified with a tool and the results recorded
- [ ] Dark mode is a designed palette: surfaces lighten with elevation, borders lower-contrast, shadows replaced by surface separation
- [ ] Focus-ring treatment defined once and visible on every focusable element in both themes, including the native controls Element Plus renders
- [ ] Motion primitives: two durations and two easing curves as tokens, mapped onto `--el-transition-duration` / `--el-transition-duration-fast`; all set to `0s` under `prefers-reduced-motion`
- [ ] Status colour mapping defined for all event and ticket statuses as `el-tag` `type` + `effect` pairs, distinguishable in greyscale
- [ ] Unit test asserts token completeness across both themes, including every mapped `--el-*` variable
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #11 — *Test harness & quality gates*

This slice's branch is created off `feat/11-test-harness` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/12-design-system-foundation`

## User stories addressed

Referenced by number from the parent PRD:

- 1-5 (visual identity, accent, typeface, scale, spacing)
- 6-11 (status colour, colour-blind safety, contrast, designed dark mode)
- 12 (density)
- 15 (focus ring)
- 21 (reduced motion)
- 37-38 (tokens as single source, Element Plus and Tailwind agreement)
