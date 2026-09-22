# Issue #42 — Motion and micro-interactions

| | |
|---|---|
| **GitHub issue** | [#42](https://github.com/bydlovskyi/platinum/issues/42) |
| **Parent PRD** | [#10](https://github.com/bydlovskyi/platinum/issues/10) · [`PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md) |
| **Type** | AFK |
| **Slice** | 32 of 41 |
| **Branch** | `feat/42-motion` |

```
Parent: #10
Parent branch: feat/41-designed-states
Branch: feat/42-motion
Blocked by: #41
```

## Parent PRD

#10 — [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](../prd/PRD-010-visual-design-system-and-interface-polish.md)

## What to build

What makes the interface feel alive. Motion carries meaning here: a row leaving a
list on delete, a panel sliding rather than appearing, a skeleton fading into content, a
number counting into place.

All short, none blocking an interaction, none lasting longer than the interaction it
accompanies. Unmotivated motion is what makes an interface feel cheap, so the list of
animated moments is fixed rather than open.

**The reduced-motion rule is non-negotiable.** Motion is the main lever this PRD has for
making the portal feel alive, which makes it exactly the place where an accessibility
preference is most likely to be forgotten. Unconditional motion is a defect, not a
refinement.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Route transitions between pages
- [ ] List item enter and leave transitions; a deleted row animates out so the administrator sees which record went
- [ ] Dialogs and drawers slide from their origin rather than appearing
- [ ] Skeleton-to-content crossfade — loading does not end in a flash
- [ ] Notification entry and exit transitions
- [ ] Dashboard headline figures count into place on first load
- [ ] Buttons respond immediately on press, independent of request latency
- [ ] Interactive rows and controls have hover and focus transitions
- [ ] Only the defined moments animate; no decorative or ambient motion
- [ ] All motion uses the two duration and two easing tokens from the design foundation
- [ ] Every animation suppressed when the reduced-motion preference is set
- [ ] No animation blocks input or exceeds the interaction it accompanies
- [ ] Component test asserts animations are suppressed under the reduced-motion preference
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #41 — *Designed empty, loading and error states*

This slice's branch is created off `feat/41-designed-states` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/42-motion`

## User stories addressed

Referenced by number from the parent PRD:

- 16-22 (transitions, row removal, dialogs, page transitions, skeletons, reduced motion, button response)
- 31 (dashboard figures animate in)
