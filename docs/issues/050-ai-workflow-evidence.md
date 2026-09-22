# Issue #50 — AI workflow evidence

| | |
|---|---|
| **GitHub issue** | [#50](https://github.com/bydlovskyi/platinum/issues/50) |
| **Parent PRD** | [#9](https://github.com/bydlovskyi/platinum/issues/9) · [`PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md) |
| **Type** | HITL |
| **Slice** | 40 of 41 |
| **Branch** | `feat/50-ai-workflow-evidence` |

## Parent PRD

#9 — [`docs/prd/PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md)

## What to build

The assessment asks for evidence of how AI was used: how context was provided, how
requirements were defined, how implementation was guided and how results were validated. A
repository that merely mentions AI was used answers none of that.

This one has the artefacts — ten PRDs, their issue breakdowns, project-specific skills,
adapted conventions, a path-rules hook. The remaining step is presenting them as a workflow
rather than leaving them as files in a directory.

**It must be honest about where AI output was wrong or had to be redirected.** An account
with no corrections in it reads as an account that was not examined.

HITL: this is the author's own account of their working method.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Walks the trail: brief to scoped questions, answers to PRDs, PRDs to vertical-slice issues with an explicit dependency order, issues to implementation under project-specific conventions, validation through review skills and the test suite
- [ ] Points at the real artefacts: `docs/prd/`, `docs/issues/`, `.claude/skills/`, `.claude/hooks/`
- [ ] Explains the specific adaptations made for this project — including replacing the inherited database-migration concept in the PRD skills with the OpenAPI contract, this project's equivalent shared bottleneck file
- [ ] Explains the path-rules hook and what it enforces
- [ ] Records where AI output was wrong, incomplete or had to be redirected, and how that was caught
- [ ] Describes what was deliberately not delegated and why
- [ ] Lives in `docs/` and is linked from the README and from TECHNICAL_REVIEW.md
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #49 — *TECHNICAL_REVIEW.md*

This slice's branch is created off `feat/49-technical-review` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/50-ai-workflow-evidence`

## User stories addressed

Referenced by number from the parent PRD:

- 31-34 (AI in the workflow, artefacts, requirements to specifications, validation)
