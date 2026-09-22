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

## What to build

**The strongest signal of care in an admin interface is not the palette — it is the
states nobody demos.** An empty list, a failed load, a filtered result with no matches, a
not-found page. These are what a reviewer looks for when they want to know whether the
work was finished or abandoned at the happy path, and they are cheap to do well once the
tokens exist.

Each gets a designed treatment: a simple line illustration built from the token palette
so it themes automatically, a sentence explaining what would be here, and the action that
resolves it.

The three empty variants must be visually distinct. Conflating "nothing exists yet" with
"nothing matched your filters" is what makes an administrator believe their data was
deleted.

Skeletons mirror the shape of what they replace, including column widths, so the layout
does not shift when real content arrives.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Token-built line illustrations that theme automatically in both modes — no raster assets, no colour literals
- [ ] Three visually distinct empty variants: nothing exists (offers create), nothing matched (offers clear filters), load failed (offers retry)
- [ ] Error states read as a condition with a way forward, not as a crash
- [ ] Skeletons mirror content shape including column widths; no layout shift on content arrival
- [ ] Designed not-found page consistent with the rest of the portal
- [ ] Login screen given a considered treatment — it is the first impression
- [ ] Notifications styled through the tokens rather than library defaults
- [ ] Every state readable at 375px
- [ ] Component tests for each of the three empty variants and the error variant
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
