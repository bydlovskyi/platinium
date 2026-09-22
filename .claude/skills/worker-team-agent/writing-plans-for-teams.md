---
name: writing-plans-for-teams
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans for Agent Teams

## Overview

Write implementation plans designed for parallel execution by `feature-team.md`. Plans describe **what to build and why** — not how to code it. Teammates are skilled engineers with access to CLAUDE.md; they know the patterns.

**Before anything else:**
1. Read `.claude/skills/agent/project-context.md` for project-specific details (team roles, plans directory, architecture).
2. Read `.claude/skills/agent/lessons-learned.md` for knowledge from past runs. Factor relevant lessons into the plan — e.g., if past runs revealed a pattern that causes bugs, add it as a constraint or boundary in the relevant task.

**Announce at start:** "I'm using the writing-plans-for-teams skill to create the implementation plan."

**Save plans to:** the plans directory specified in `project-context.md`.

## What a Plan Is

A plan is a **contract between the lead and the teammates**. It defines:
- What each teammate must build
- What the acceptance criteria are
- Which files each teammate owns
- What types/schemas must exist before dependent work can start
- How teammates' outputs connect to each other

## What a Plan Is NOT

- Not code. Never write implementation code, test code, or shell commands in the plan.
- Not a tutorial. Don't explain how frameworks work or how to create pages.
- Not prescriptive about implementation details. Say "create an endpoint that returns paginated studios" — not "use `offset` and `limit` query params with a Zod schema that looks like this."

## Checklist

You MUST complete these in order:

1. **Explore the codebase** — read relevant existing files, understand current patterns
2. **Identify the work** — break the feature into tasks, map them to teammates (use roles from `project-context.md`)
3. **Analyze dependencies** — determine which tasks block which
4. **Team fitness check** — verify this actually benefits from parallel execution
5. **Write the plan** — using the structure below
6. **Save and present** — save to plans directory, present execution choice

## Plan Document Structure

### 1. Header

```markdown
# [Feature Name] Implementation Plan

> **Execution:** Use `feature-team.md` to execute this plan.

**Goal:** [One sentence]

**Architecture:** [2-3 sentences about the approach and how it fits the project's existing patterns]
```

### 2. Teammates & Ownership

Map the work to `feature-team.md` roles from `project-context.md`. Not every feature needs all teammates.

```markdown
## Team

| Teammate | Scope | Key Deliverables |
|----------|-------|-----------------|
| `schema-eng` | [what schemas/types they create] | [list of files they produce] |
| `backend-eng` | [what endpoints/controllers/repos they build] | [list of files they produce] |
| `frontend-eng` | [what pages/components/stores they build] | [list of files they produce] |
| `e2e-tester` | [what flows they validate] | [acceptance criteria they test] |
```

### 3. Wave Analysis

Group tasks into waves based on dependencies. Earlier waves produce foundations that later waves consume.

```markdown
## Waves

**Wave 1: [Theme]** — foundation, no dependencies
- Task 1 (`schema-eng`): [what to build]
- Task 2 (`backend-eng`): [what to build, if independent of schemas]

  *Parallel-safe because:* [different directories, no shared files]

**Wave 2: [Theme]** — depends on Wave 1 types/schemas
- Task 3 (`backend-eng`): [what to build]
- Task 4 (`frontend-eng`): [what to build]

  *Parallel-safe because:* [different layers, no file overlap]
  *Needs from Wave 1:* [specific types/schemas by file path]

**Wave 3: Validation**
- Task 5 (`e2e-tester`): [what flows to test]

### Dependency Graph

Task 1 ──→ Task 3 ──→ Task 5
            Task 4 ──↗
```

**Wave rules:**
- Tasks in the same wave MUST NOT touch the same files
- Max 3 tasks per wave
- When unsure about independence → put in separate waves

### 4. Tasks

Each task is a self-contained assignment for one teammate.

```markdown
### Task N: [Name]

**Teammate:** `schema-eng` | `backend-eng` | `frontend-eng` | `e2e-tester`
**Depends on:** None | Task X (for [what specifically])
**Produces:** [what later tasks need — file paths and what they export]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts`

**Requirements:**
- [Requirement 1 — what it must do, not how to code it]
- [Requirement 2]
- [Requirement 3]

**Acceptance Criteria:**
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

**Boundaries:**
- [What this task must NOT do — e.g., "do not create the frontend page, that's Task 4"]
- [Any constraints — e.g., "response schema must list fields explicitly, no .omit()/.pick()"]
```

### 5. Contracts Between Teammates

Define the interfaces where teammates' work connects. This is critical — it prevents teammates from making incompatible assumptions.

```markdown
## Contracts

### [Contract Name, e.g., "Studio API Response"]
- **Producer:** Task N (`schema-eng`)
- **Consumers:** Task M (`backend-eng`), Task P (`frontend-eng`)
- **Location:** `shared/schemas/studios/StudioSchema.ts`
- **Shape:** [describe the fields and types at a high level]
```

### 6. Execution Handoff

Every plan MUST include all three steps: build, debug, and review.

```markdown
---

## Execution

Plan saved to `[plans directory]/YYYY-MM-DD-<feature-name>.md`.

### Step 1: Build
Run `feature-team.md` to execute this plan.

### Step 2: Debug (if needed)
If any issues arise during or after implementation, run `debug-team.md` to investigate from multiple angles simultaneously.

### Step 3: Review
After all tasks are complete and working, run `review-team.md` to spawn parallel reviewers:
- **Security reviewer** — validate auth, token handling, data exposure, endpoint authorization
- **Architecture reviewer** — verify the implementation follows project patterns and conventions
- **E2E reviewer** — validate the full user flow works end-to-end
```

## Team Fitness Check

Before writing the full plan, verify this benefits from Agent Teams:

**Use `feature-team.md` when:**
- At least 2 waves have 2+ parallel tasks
- At least 2 distinct teammate roles are needed
- 4+ tasks total

**Fall back to `superpowers:writing-plans` when ANY of these are true:**
- Every wave has only 1 task (purely serial)
- Fewer than 4 tasks
- Only 1 teammate role needed
- Tasks are tightly coupled on the same files

If serial is better, announce: *"After analyzing dependencies, this plan is serial — [reason]. Switching to standard plan format."* Then invoke `superpowers:writing-plans` instead.

## Principles

- **Requirements, not code.** Describe what to build, never how to type it.
- **Exact file paths.** Every task specifies which files to create or modify.
- **Contracts are mandatory.** If Task A produces something Task B consumes, define the contract.
- **Acceptance criteria are testable.** Each criterion can be verified by `e2e-tester` or by reading the code.
- **YAGNI.** Only plan what the feature requires. No "nice to have" tasks.
- **Boundaries are explicit.** Every task says what it must NOT do, to prevent file conflicts.
