---
name: worker-team-agent
description: End-to-end orchestrator that chains feature-team → debug-team + review-team in a loop until the task is complete, then verifies it with the project test suite and a browser pass. Use this skill for any feature work that requires multiple steps and iterations, given a GitHub issue number or a written plan. The orchestrator ensures a disciplined process - build from the spec, validate with both debugging and code review, loop back to building if issues are found, then verify via E2E tests. Always capture lessons learned at the end to improve future runs.
---

# Orchestrator — Build, Review, Test Loop

You are the **orchestrator**. You drive a feature from a **GitHub issue or existing plan** to a clean, reviewed implementation, then verify it with the project test suite and a browser pass.

**Announce at start:** "Using the orchestrator to build, review, and test this feature end-to-end."

**Prerequisite:** Either a GitHub issue number/URL **or** a written plan file (typically in `docs/plans/`) must be provided. The orchestrator does NOT write plans — if neither is available, stop and ask the user to provide one.

**Before anything else:** Read `lessons-learned.md` (in this skill's folder: `.claude/skills/worker-team-agent/lessons-learned.md`) for knowledge from past runs. Past lessons inform every phase — building avoids repeated mistakes, reviewing watches for recurring issues, and testing targets known-fragile paths.

## Important: How to Load Team Playbooks

All team playbooks are `.md` files **in this skill's folder** (`.claude/skills/worker-team-agent/`):

| Playbook | File |
|----------|------|
| Building | `feature-team.md` |
| Debugging | `debug-team.md` |
| Reviewing | `review-team.md` |
| Project context | `project-context.md` |
| Lessons learned | `lessons-learned.md` |

**To use a playbook:** Read the `.md` file from this skill's folder and follow its instructions. Do NOT invoke these as slash commands — they are local files, not commands.

Testing is not a playbook: Phase 3 writes Vitest specs directly and runs them. Browser checks use the caller-supplied playbook, or the `playwright` skill.

## Flow

```
┌─────────────────────────────────────────────────┐
│        USER TASK + EXISTING PLAN                 │
└──────────────────────┬──────────────────────────┘
                       ▼
              ┌─────────────────┐
              │ PHASE 1: BUILD  │◄──────────────┐
              │ feature-team.md │               │
              └────────┬────────┘               │
                       ▼                        │
           ┌───────────────────────┐            │
           │  PHASE 2: VALIDATE    │            │
           │ debug-team.md         │            │
           │ review-team.md        │            │
           │ (run in parallel)     │            │
           └───────────┬───────────┘            │
                       ▼                        │
              ┌─────────────────┐               │
              │ Issues found?   │── YES ────────┘
              └────────┬────────┘   (create fix tasks)
                       │ NO
                       ▼
              ┌──────────────────────┐
              │ PHASE 3: TEST        │
              │ add templates to     │
              │ vitest + browser pass │
              └──────────┬───────────┘
                         ▼
              ┌─────────────────┐
              │ Tests pass?     │── NO ─────────┐
              └────────┬────────┘               │
                       │ YES                    ▼
                       │              (create fix tasks,
                       │               loop to Phase 1)
                       ▼
              ┌─────────────────┐
              │    COMPLETE     │
              │ Report to user  │
              └─────────────────┘
```

## Phase 0: Locate the Spec

Determine the source of truth for this task — in priority order:

### Option A — GitHub issue (preferred)

1. If the user provides an issue number or URL, fetch it:
   ```bash
   gh issue view <number> --comments
   ```
2. Use the issue body as the spec. Extract:
   - **What to build / What's broken** — the core requirement
   - **Acceptance criteria** — the definition of done (drive Phase 2 and Phase 3 from these)
   - **Blocked by** — note any upstream dependencies
3. Summarize the spec in one short paragraph and confirm with the user before starting Phase 1.

### Option B — Plan file

1. If no issue is provided, ask the user for the plan file path (typically under `docs/plans/`).
2. Read the plan fully. If no plan exists either, STOP: "No spec found. Please provide a GitHub issue number or a plan file, then re-run this skill."
3. Confirm the plan path with the user before starting Phase 1.

> **Either way, the acceptance criteria from the spec become the checklist for Phase 2 (Validate) and Phase 3 (Test). Keep them in view throughout the run.**

## Phase 0.5: Branch Strategy (hybrid cascade-stack)

Before touching any code, determine the correct branch from the issue body. Three cases — pick exactly one:

### Case A — Standalone issue (no `Parent PRD` section)

Branch off `main`. Targets `main`.

```bash
git checkout main && git pull
git checkout -b issue-<number>-<short-slug>
```

### Case B — PRD-linked issue with `Blocked by: #X` (chain link)

This is a cascade-stack child. Branch off the **blocker's branch**, not `main`. PR targets the blocker's branch.

```bash
git fetch origin
git checkout feat/<X>-<blocker-slug>     # blocker's branch must exist on origin
git pull
git checkout -b feat/<this-issue-number>-<this-slug>
```

When opening the PR: `gh pr create --base feat/<X>-<blocker-slug>` (NOT `main`).

### Case C — PRD-linked issue with no `Blocked by` (foundation OR independent leaf)

Branch off `main`. Targets `main`. The issue body should say either "foundation slice" or "independent leaf".

```bash
git checkout main && git pull
git checkout -b feat/<this-issue-number>-<this-slug>
```

### Detect the case

1. Fetch the issue body via `gh issue view <number>`.
2. Look for `## Blocked by`. If it lists `#X`, this is **Case B**.
3. If `## Parent PRD` is present but no `Blocked by`, this is **Case C** (foundation or leaf).
4. Otherwise this is **Case A**.

**Confirm with the user** before creating the branch: state the case, the parent branch, and the PR base.

> **All commits go to the branch determined here. Never commit directly to `main` or to the parent branch.**

## Phase 0.6: Branch Discipline (cascade-stack rules)

The cascade-stack only works if every link in the chain stays disciplined. **Violating any of these rules during the run is a hard stop — do not silently work around the problem.**

1. **No `git merge main` into a chain branch.** If `main` advances during the run, do nothing — the cascade merge at the end handles it. If you genuinely cannot proceed without main's changes (e.g., a bug in main blocks the build), stop and ask the user; do not merge.
2. **No merging sibling branches.** If a TypeScript/lint error references symbols defined on a sibling branch, that's an undeclared dependency. Stop and report: "This issue depends on #<other> via <symbol>. The PRD breakdown needs a `Blocked by` link." Do not merge the sibling.
3. **No parallel siblings.** Before starting, run `gh pr list --search "feat/<X>-<blocker-slug> in:base"` (where `<X>` is your blocker). If another open PR already targets the same parent, stop and report: "Parallel sibling detected — chain must be linear. Escalate to the user."
4. **Migrations stay on the foundation/schema slice only.** If you find yourself running `npm run db:migration:generate` in a Case-B child branch, stop. The schema change belongs in the schema slice; rebase your branch onto the updated parent and continue without a local migration.
5. **Rebase on parent, never merge.** If the parent advances mid-run, `git fetch origin && git rebase origin/<parent-branch>`. Never `git merge` the parent.
6. **PR base = direct parent only.** Do not retarget your PR to `main` or to a grandparent. Retarget happens automatically when the parent merges to `main`.

If any of these is violated by an earlier human action (e.g., the user already merged main into the branch), pause and ask before proceeding. Do not paper over it with more merges.

## Phase 1: Build

1. Read `.claude/skills/worker-team-agent/feature-team.md` and follow its instructions to execute the plan.
   - On the **first iteration**, feature-team builds the full feature from the plan.
   - On **subsequent iterations** (fix loops), pass the specific issues to fix. Feature-team should focus ONLY on the reported issues, not rebuild everything.
2. Wait for feature-team to complete and report.

## Phase 2: Validate

1. After feature-team finishes, read and follow **both** `.claude/skills/worker-team-agent/debug-team.md` AND `.claude/skills/worker-team-agent/review-team.md` **in parallel**.
   - debug-team: Investigate any runtime issues, test the feature for bugs.
   - review-team: Review code quality, security, and architecture compliance.
2. Wait for BOTH teams to complete their reports.

## Phase 2.5: Assess

Collect findings from both teams and categorize them:

| Category | Description | Action |
|----------|-------------|--------|
| **Critical** | Bugs, security vulnerabilities, broken functionality | MUST fix — loop back to Phase 1 |
| **Architecture violations** | Breaks project patterns from CLAUDE.md | MUST fix — loop back to Phase 1 |
| **Minor** | Style nits, suggestions, non-blocking improvements | Note for user, do NOT loop |

### Before acting on any finding:

**Cross-check every review finding against CLAUDE.md and project rules.** If a review suggestion contradicts an established project rule, reject the suggestion — not the rule. Review teams can be wrong. Project rules are authoritative.

### If issues require fixes:

1. Compile a **fix list** from both teams' reports — deduplicate overlapping findings.
2. Present the fix list to the user: "Found N issues that need fixing. Looping back to feature-team."
3. Go back to **Phase 1** with the fix list as the task. The feature-team prompt for fix iterations must include:
   - The specific issues to fix (file:line, description, expected behavior)
   - "Fix ONLY these issues. Do not refactor or change anything else."
4. After feature-team fixes, go back to **Phase 2** to re-validate.

### If no issues (or only minor ones):

1. Proceed to **Phase 3** (Test).

## Phase 3: Test

Once the build passes review, verify the feature end-to-end in a real browser.

### 3a. Write and run the automated tests

1. Read the parent PRD's testing boundary — it states which modules are unit
   tested and which flows are integration tested for this slice. That boundary
   is the specification; do not invent a different one.
2. Write the tests:
   - **Unit** — beside the subject. Utilities, stores, composables, and
     components with real logic, in isolation.
   - **Integration** — in the top-level test directory, organised by journey.
     Real router, real Pinia, real services, with MSW answering the network.
     Never mock the service layer in an integration test.
3. Assert on user-visible behaviour — accessible roles, labels, text — never on
   internal state. A test asserting on a store's contents passes while the
   screen is blank.
4. Run them:
   ```bash
   NAPI_RS_NATIVE_LIBRARY_PATH=/nonexistent npm run test
   ```

### 3b. Browser verification

Automated tests are the gate; a browser pass is confirmation, not a substitute.

If the caller supplies a browser playbook (for example `ralph/e2e.md` when run
from the issue loop), follow it. Otherwise use the `playwright` skill against the
dev server, which must already be running — this skill never starts it.

If no browser tooling is available, say so plainly in the report and mark the
work as needing manual QA. Never claim a browser check that did not happen.

### 3c. Handle failures

- **All pass:** proceed to Phase 4.
- **Any fail:** compile the failures into a fix list — the exact assertion,
  expected versus actual, the failing test path, plus screenshots and console
  errors for a browser failure. Loop back to **Phase 1** with that list. After
  the fix iteration, re-run **Phase 2** and re-run only the failing tests.

## Phase 4: Learn

After the loop ends (clean or max iterations), extract lessons before reporting.

**What to capture** — only non-obvious insights that would change future behavior:

| Source | What to look for |
|--------|-----------------|
| **Build phase** | Patterns that didn't work, unexpected file conflicts, integration issues between teammates |
| **Debug phase** | Root causes that were surprising, bug patterns that could recur |
| **Review phase** | Architecture violations that kept appearing, security gaps in a specific area |
| **Test phase** | E2E failures that passed unit/type checks — gaps in the test strategy |
| **Fix loops** | What caused the loop — was it a build mistake, a missing contract, or an untested path? |

**What NOT to capture:**
- One-off typos or simple mistakes that won't recur
- Things already documented in CLAUDE.md or project-context.md
- Implementation details (the code itself is the record)

**How to write:** Append new entries to `.claude/skills/worker-team-agent/lessons-learned.md` using the format in that file. Use today's date and the feature name.

If the run was clean (no fix loops, no issues), you may still capture a lesson if something non-obvious went well.

If there are no lessons worth capturing, skip this phase.

## Phase 5: Complete

1. Present a final summary to the user:

```
## Orchestration Complete

### What was built
[Summary from the plan — feature name and scope]

### Iterations
- Build 1: [initial implementation]
- Review 1: [N issues found — list the categories]
- Build 2: [fixes applied] (if applicable)
- Review 2: [clean / N remaining issues] (if applicable)
- Tests: [N templates added, N/N passed]

### Final Status
[Clean — ready to commit / Minor notes remain]

### Test Templates Added
[Test files added, and what they cover]

### Minor Notes (if any)
[Non-blocking suggestions from reviewers]

### Lessons Learned
[What was added to lessons-learned.md, or "No new lessons — clean run."]

### Next Steps
[e.g., "Ready to commit and create PR" or "Run `npm run lint` to verify"]
```

2. Push the branch and open a PR when the run is complete (unless the user asks otherwise).
   - **PR base**: use the parent branch determined in Phase 0.5 (Case A/C → `main`, Case B → blocker's `feat/<X>-<slug>`).
   - **Do NOT merge the PR yourself.** PR landing follows the cascade-merge order and is the user's call (or a separate cascade-merge step). Tail-deepest first, then up the chain.

## Loop Safety

- **Max 3 fix iterations** (across Phase 2 and Phase 3 combined). If issues persist after 3 loops, stop and present the remaining issues to the user for manual decision. Say: "After 3 fix iterations, these issues remain: [list]. Would you like to continue fixing, or handle these manually?"
- **Track iteration count.** Announce each iteration: "Starting fix iteration 2/3."
- **Shrinking issue list.** If a fix iteration introduces MORE issues than it resolves, flag this to the user immediately: "Fix iteration introduced new issues. Pausing for your input."

## Rules

- A GitHub issue or plan file MUST exist before starting. The orchestrator does not write plans.
- Never skip Phase 2 (validate). Every build must be reviewed.
- Never skip Phase 3 (test). Every feature must be verified end-to-end in a browser.
- Fix iterations in Phase 1 must be scoped — only fix reported issues, not refactor.
- Branch creation in Phase 0.5 requires explicit user confirmation before checkout.
- Phase 0.6 cascade-stack rules are hard stops — never `merge main`/sibling into a chain branch, never run a child migration, never spawn parallel siblings. If any rule would be violated, pause and report.
- If the dev server is not running, remind the user to start it with `npm run dev` before Phase 2 and Phase 3.

## Tool Usage (applies to orchestrator and ALL spawned teammates)

**TOOLS:** Always use dedicated tools instead of shell commands:

- Read files: use the Read tool (NOT cat, head, tail)
- Search file contents: use the Grep tool (NOT grep, rg)
- Find files by name/pattern: use the Glob tool (NOT find, ls)
- Edit files: use the Edit tool (NOT sed, awk)
- Create files: use the Write tool (NOT echo, cat with heredoc)
- Only use Bash for commands that genuinely require shell execution (npm, git status, tsc, etc.)

Include this tool usage block in every teammate's spawn prompt.
