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

## What to build

The first screen after login, carrying the impression of the whole portal.

Headline figures at the largest type step with muted labels, dominating the layout so the
summary arrives before any reading happens. Breakdowns rendered as proportional bars built
from tokens — no charting dependency is added unless a genuine chart earns its place, and
if one is added it must theme correctly in both modes.

Per-currency values grouped into one clearly labelled block so two currencies can never be
misread as one total.

Hierarchy comes from density and weight, not from wrapping everything in a bordered card.
Administrative interfaces fail when every section is a box.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Headline figures at the largest type step with muted labels; they dominate the layout
- [ ] Supporting secondary figures where they add meaning
- [ ] Status breakdowns rendered proportionally so the distribution reads in one glance
- [ ] Per-currency values grouped into one clearly labelled block
- [ ] Cards used only where a card is meaningful — not as a default container for every section
- [ ] Hierarchy built from spacing, type weight and colour rather than borders
- [ ] Numeric figures use tabular figures
- [ ] Any charting dependency is justified by clarity and themes correctly in both modes
- [ ] Layout holds at tablet and mobile widths without becoming a single undifferentiated stack
- [ ] Contrast verified in both themes
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
