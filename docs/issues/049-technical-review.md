# Issue #49 — TECHNICAL_REVIEW.md

| | |
|---|---|
| **GitHub issue** | [#49](https://github.com/bydlovskyi/platinum/issues/49) |
| **Parent PRD** | [#9](https://github.com/bydlovskyi/platinum/issues/9) · [`PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md) |
| **Type** | HITL |
| **Slice** | 39 of 41 |
| **Branch** | `feat/49-technical-review` |

```
Parent: #9
Parent branch: feat/48-readme
Branch: feat/49-technical-review
Blocked by: #48
```

## Parent PRD

#9 — [`docs/prd/PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md)

## What to build

The document the assessment is judged on. It asks for judgement, not description.

Each required section answered from the reasoning already recorded in PRD-001 through
PRD-010 rather than reconstructed at the end — the decisions were made as decisions, and
each PRD records why.

**The first-refactors section is written last**, after the code exists and can be looked
at critically. Written from the plan it is worthless.

**The scaling section is the substantial one** and needs to be concrete: where offset
pagination breaks and what cursor pagination changes for the UI, virtualised rendering for
large tables, server-side aggregation, a caching and invalidation strategy, optimistic
concurrency for simultaneous edits and what the conflict UI looks like. A list of
technologies is not an answer.

HITL: this is the author's own engineering judgement and cannot be delegated.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Architectural decisions: local OpenAPI contract, in-browser MSW with server-side semantics, URL-driven list state, integer minor units, enforced layer direction, one configurable table — each with the alternative that was rejected
- [ ] Architectural decisions include Element Plus first: shared components (`AppDataTable`, `ListToolbar`, `StatusTag`, `CurrencyInput`, `RemoteSelect`, `useConfirm`) wrap `el-table`, `el-form`, `el-select`, `el-pagination`, `ElMessageBox` rather than hand-building controls; theming through `--el-*` variables; the rejected alternatives (bespoke components, a headless library) and what the choice costs (bundle weight, `.el-*` coupling, upgrade risk); links [`ELEMENT-PLUS.md`](../prd/ELEMENT-PLUS.md)
- [ ] Two more days: a ranked list with the reasoning for the ranking, drawn from what each PRD deferred
- [ ] Accepted debt, each item stating what was accepted, why it was reasonable here, what it would cost in production, and the condition that would change the answer
- [ ] Debt covers at minimum: token in `localStorage`, no optimistic updates, no Playwright layer, free status transitions, timezone-naive dates, no cross-currency aggregation, page-scoped selection, no request caching layer
- [ ] First refactors identified from the implementation as built, written after the code exists — including any hand-built control or `.el-*` override the Element Plus audit left in place
- [ ] Scaling: where offset pagination breaks and what cursor pagination changes for the UI
- [ ] Scaling: virtualised rendering (`el-table-v2` versus the current `el-table`, and what `AppDataTable` would need to change), server-side aggregation, caching and invalidation strategy, bundle splitting
- [ ] Scaling: optimistic concurrency for concurrent administrators, including what the conflict UI looks like
- [ ] Team standards: conventional commits, PR templates and review checklists, ESLint rules encoding this project's layering, dependency and security scanning, definition of done, architecture decision records
- [ ] AI in the daily workflow, including the boundary of what should not be delegated; cross-references the AI workflow document rather than duplicating it
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #48 — *README*

This slice's branch is created off `feat/48-readme` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/49-technical-review`

## User stories addressed

Referenced by number from the parent PRD:

- 21-31 (every required section of the technical review)
