# Issue #47 — Repository final pass and screenshots

| | |
|---|---|
| **GitHub issue** | [#47](https://github.com/bydlovskyi/platinum/issues/47) |
| **Parent PRD** | [#9](https://github.com/bydlovskyi/platinum/issues/9) · [`PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md) |
| **Type** | AFK |
| **Slice** | 37 of 41 |
| **Branch** | `feat/47-repo-final-pass` |

## Parent PRD

#9 — [`docs/prd/PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md)

## What to build

Get the repository into the state a reviewer should find it in.

The inherited `architecture.md` is reconciled with what was actually built — every rule it
states must be true of the code, and every pattern the code relies on must appear in it. A
document that describes an intention rather than the result is worse than no document,
because it misleads.

Template placeholder code from the original skeleton is removed, along with dead code,
unused dependencies and stale comments. `.env.example` is verified against what the
application actually reads.

Screenshots are captured from a seeded build at desktop and mobile widths in both themes,
because a reviewer forms an impression before reading anything.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `architecture.md` reconciled: every rule it states is true of the code, every pattern the code relies on appears in it
- [ ] All template placeholder code from the original skeleton removed
- [ ] Dead code, unused dependencies and stale comments removed
- [ ] `.env.example` verified against what the application actually reads
- [ ] No TODO or FIXME left without an owner or an issue reference
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Screenshots captured from a seeded build: dashboard, a list and a form, at desktop and mobile widths, in both themes
- [ ] Screenshots committed and sized reasonably
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #46 — *Test gap review*

This slice's branch is created off `feat/46-test-gap-review` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/47-repo-final-pass`

## User stories addressed

Referenced by number from the parent PRD:

- 35-37 (no placeholders or dead code, architecture matches, scope documented)
- 3 (screenshots in both themes and at mobile width)
