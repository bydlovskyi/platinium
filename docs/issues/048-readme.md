# Issue #48 — README

| | |
|---|---|
| **GitHub issue** | [#48](https://github.com/bydlovskyi/platinum/issues/48) |
| **Parent PRD** | [#9](https://github.com/bydlovskyi/platinum/issues/9) · [`PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md) |
| **Type** | AFK |
| **Slice** | 38 of 41 |
| **Branch** | `feat/48-readme` |

## Parent PRD

#9 — [`docs/prd/PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md)

## What to build

The document a reviewer reads first, and the one whose accuracy determines whether
they trust anything else.

Ordered for a reviewer's path rather than for a table of contents: what this is and what
it does, screenshots, the fastest path to a running application, credentials, then
commands, structure, architecture, and the decisions and trade-offs.

**Every command is executed from a clean clone before it is documented.** A documented
command that fails on a fresh checkout is the worst possible first impression, and it
costs more credibility than the thing it described was worth. The Docker section is
verified against a pruned Docker environment, because a cached layer will happily hide a
broken build.

Credentials for both roles are prominent. A reviewer who cannot sign in stops
evaluating.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Overview explaining what the application does, with screenshots near the top
- [ ] Docker quick start stated first as the fastest path to a running application
- [ ] Credentials for both the administrator and the viewer, prominently placed
- [ ] Local installation path documented, including the required Node version
- [ ] Every command listed with a description, grouped by purpose
- [ ] Unit and integration test commands documented separately
- [ ] Project structure explained with the purpose of each directory
- [ ] Architecture overview including the one-way dependency rules, linking to `architecture.md`
- [ ] Mock API explained: in-browser, where the contract lives, how to reset the demo data, how to force an API failure
- [ ] Technical decisions, assumptions and trade-offs sections
- [ ] Link to the design system reference and to the AI workflow document
- [ ] Every documented command executed from a clean clone and confirmed to work
- [ ] Every structure path verified to exist
- [ ] Docker instructions verified against a pruned Docker environment
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #47 — *Repository final pass and screenshots*

This slice's branch is created off `feat/47-repo-final-pass` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/48-readme`

## User stories addressed

Referenced by number from the parent PRD:

- 1-20 (the entire reviewer onboarding path)
