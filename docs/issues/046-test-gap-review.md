# Issue #46 — Test gap review

| | |
|---|---|
| **GitHub issue** | [#46](https://github.com/bydlovskyi/platinum/issues/46) |
| **Parent PRD** | [#8](https://github.com/bydlovskyi/platinum/issues/8) · [`PRD-008-testing-strategy-and-quality-gates.md`](../prd/PRD-008-testing-strategy-and-quality-gates.md) |
| **Type** | AFK |
| **Slice** | 36 of 41 |
| **Branch** | `feat/46-test-gap-review` |

```
Parent: #8
Parent branch: feat/45-design-system-docs
Branch: feat/46-test-gap-review
Blocked by: #45
```

## Parent PRD

#8 — [`docs/prd/PRD-008-testing-strategy-and-quality-gates.md`](../prd/PRD-008-testing-strategy-and-quality-gates.md)

## What to build

The closing half of PRD-008. Every feature PRD declared a testing boundary and wrote
its tests inside its own slices; this is the pass that confirms each one was actually met.

A review against every declared boundary, closing anything missed, and verifying the suite
runs clean from a cold clone — not from the machine that has been building it all along.

This is also where the testing guide is finalised: the strategy, the layers and what
belongs in each, the kit's helpers, naming and location conventions, how to write an
error-path test, and how to test Element Plus components per
[`ELEMENT-PLUS.md`](../prd/ELEMENT-PLUS.md) — real mounts, teleported poppers,
`ElMessageBox` confirms, `el-form` validation.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Every testing boundary declared in PRD-001 through PRD-007 and PRD-010 is verified as met; gaps are closed
- [ ] Deep modules confirmed exhaustively tested: mock query engine, list query composable, currency input, CSV serialiser, capability composable, token completeness
- [ ] Every store and every composable is covered
- [ ] Integration coverage confirmed for: login journey, full CRUD per entity, search/filter/sort/pagination through the UI, validation failures end to end, API failure handling, permissions from both roles, responsive presentation at each breakpoint
- [ ] Unhandled-request failure is still enforced — no handler was quietly added to silence a test
- [ ] No test stubs or `shallowMount`s an Element Plus component; sort, selection, validation, select and confirm tests drive the real `el-table`, `el-form`, `el-select`, `ElMessageBox` DOM, querying teleported poppers in `document.body`
- [ ] `element-plus` still inlined in the Vitest config, and at least one test proves an `el-form` rule actually rejects invalid input
- [ ] Suite runs clean from a cold clone in a fresh directory
- [ ] Suite still completes in under 60 seconds
- [ ] Coverage report reviewed; notable gaps either closed or documented with a reason
- [ ] Testing guide written: strategy, layers, kit helpers, naming and location conventions, how to write an error-path test, and a section on testing Element Plus components
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #45 — *Design system documentation*

This slice's branch is created off `feat/45-design-system-docs` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/46-test-gap-review`

## User stories addressed

Referenced by number from the parent PRD:

- 20-31 (deep module and journey coverage)
- 38-39 (documented strategy and conventions)
