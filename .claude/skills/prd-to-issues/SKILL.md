# PRD to Issues

Break a PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD

Ask the user for the PRD GitHub issue number (or URL).

If the PRD is not already in your context window, fetch it with `gh issue view <number>` (with comments).

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (contract, mock handler, service, store/composable, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

#### API contract slice (mandatory if PRD has contract changes)

If the parent PRD's "API Contract Plan" section is non-empty, the FIRST slice MUST be
a dedicated "API contract" issue. It is the only slice allowed to modify
`src/mocks/openapi.yaml` or commit a regenerated
`src/features/platform/api/schema.ts`. It is AFK and has no blockers — it is the
foundation of the cascade-stack.

Every other slice that needs the new contract MUST list this slice (or a transitive
ancestor) in its `Blocked by` field — never edit the contract in parallel. Code-only
slices that consume the new types branch off the contract slice's branch.

This rule prevents unreadable conflicts in the generated `schema.ts` when sibling
feature branches each run `npm run openapi-generate` against a different spec.

If a slice discovers a missed endpoint mid-implementation, amend the contract slice
(or open a follow-up contract-only slice that all dependents are rebased onto) —
never edit `openapi.yaml` from a code slice.

Always create a final QA issue with a detailed manual QA plan for all items that require human verification. This QA issue should be the last item in the dependency graph, blocked by all other slices. It should be HITL.

### 3a. Branch strategy — hybrid (cascade-stack + parallel leaves)

PRDs use a **hybrid** branching model:

- **Sequential / dependent slices** form a single **linear cascade-stack**: `main → 150 → 153 → 155 → 157 → ...`. Each child branches off its parent. The chain is strictly linear — at most one direct child per parent.
- **Independent slices** that share NO code or schema with the chain branch off `main` directly and ship as parallel PRs after the foundation lands. Use this only for genuinely orthogonal work (e.g., a docs page, an unrelated cron job).
- **No siblings at the same level inside the chain.** If two slices both list `Blocked by: #X`, you have a Y-fork that produces parallel migrations and cross-merge conflicts. Either serialize them (one becomes `Blocked by` the other) or move one to an independent leaf if they truly share nothing.

**`Blocked by` semantics (cascade-stack):** `Blocked by: #X` means the dependent's working branch is created off `feat/<X>-<slug>` (the blocker's branch) and its PR targets that branch — producing a stacked PR. The executor picks blocked children up immediately, no waiting for the blocker to merge. Use `Blocked by` only for true code/schema dependencies, not for arbitrary ordering preferences.

**Cascade merge order (bottom-up):** when the entire chain is green and reviewed, merge tail-first: deepest child → its parent → ... → foundation → `main`. Each link merges only when its base equals `main` (after the previous link's PR landed and the child PR was retargeted to `main`).

### 3b. Discipline rules — what kills the cascade

These rules are **non-negotiable**. Violating any of them produces the "Christmas tree" of cross-merges and broken stacks.

1. **Never `git merge main` into a chain branch.** Only `git rebase parent` when the parent advances. Merging `main` into a mid-chain branch puts commits there that the foundation doesn't have, breaking the bottom-up cascade.
2. **Never merge sibling branches into each other.** If your branch fails to typecheck because a sibling changed shared types, that's a sign of an undeclared dependency — declare it via `Blocked by` (which serializes the chain) or refactor the shared piece into an earlier ancestor.
3. **Never create two branches with the same `Blocked by`.** No parallel siblings on the same chain level. If the PRD breakdown produces two such issues, refactor: serialize them, merge them into one slice, or split one off as an independent leaf.
4. **Only the foundation slice (or a dedicated API contract slice) commits `openapi.yaml` / `schema.ts`.** Code-only slices never run `npm run openapi-generate`. If a child needs a contract tweak it didn't know about, the contract slice is amended and all descendants rebase — no parallel contract edit is opened in a code slice.
5. **The foundation branch must `rebase main` before the cascade merge starts.** If the foundation has been pinned at an old `main` while the rest of the world advanced, the cascade will hit conflicts at the very last step. Update the foundation last, then cascade.
6. **PR base = direct parent only.** Never retarget a child PR to a grand-parent or to `main` mid-chain. Retargeting only happens when the parent PR merges into `main` — at which point GitHub auto-retargets the child to `main`.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Create the GitHub issues

For each approved slice, create a GitHub issue using `gh issue create`. Use the issue body template below.

Create issues in dependency order (blockers first) so you can reference real issue numbers in the "Blocked by" field.

<issue-template>
## Parent PRD

#<prd-issue-number>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number> (if any)

Or "None — independent leaf, branches off `main`" if this slice shares no code/schema with the chain.
Or "None — foundation slice, branches off `main`" if this is the first slice in the cascade.

When a `Blocked by` is set, the executor stacks this slice's branch on top of the blocker's `feat/<blocker-N>-<slug>` branch and opens a PR targeting that branch. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

Do NOT close or modify the parent PRD issue.
