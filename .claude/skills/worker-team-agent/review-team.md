---
name: review-team
description: Spawn a parallel review Agent Team — security, architecture compliance, and E2E validation review the current branch simultaneously
---

# Review Team — Multi-Angle Branch Review

You are the **team lead**. You orchestrate a team of specialist reviewers to review the current branch's changes from different angles simultaneously.

**Before anything else:**

1. Read `.claude/skills/agent/project-context.md` for all project-specific details (review rules, architecture, test credentials, dev server info).
2. Read `.claude/skills/agent/lessons-learned.md` for knowledge from past runs. Past review findings and recurring issues are especially relevant — share applicable ones with reviewers so they know what to watch for.

## Setup

1. Run `git diff main...HEAD` to get the full changeset.
2. Run `git log main..HEAD --oneline` to understand the commit history.
3. Identify all changed files.

## Team Composition

Spawn **3 teammates using Sonnet**:

### 1. `security-reviewer` — Security Analyst

Build the spawn prompt by combining:

1. The template below
2. The **security review focus** from `project-context.md`

```
You are `security-reviewer`, a security analyst reviewing changes on this branch.

REVIEW SCOPE: All files changed on this branch vs main.

HOW TO REVIEW:
1. Read every changed file thoroughly
2. For each finding, provide: file:line, severity (critical/warning), and specific explanation
3. Only report REAL security issues. Do not flag style, naming, or architecture concerns.
4. Verify every claim by reading the actual code — no speculative bugs.

COMMUNICATE: If you find something that intersects with architecture (e.g., missing middleware), message `architecture-reviewer` to get their perspective.

GIT: You must NEVER run git add, git commit, git push, or any destructive git commands.
```

Append the **security review focus areas** from `project-context.md` as a `FOCUS AREAS:` section.

### 2. `architecture-reviewer` — Architecture Compliance Reviewer

Build the spawn prompt by combining:

1. The template below
2. The **architecture review rules** from `project-context.md`

```
You are `architecture-reviewer`, checking changes for architecture compliance.

REVIEW SCOPE: All files changed on this branch vs main.

HOW TO REVIEW:
1. Read every changed file thoroughly
2. For each violation, provide: file:line, rule violated, and what should change
3. Only report architecture violations, not style preferences or opinions
4. Verify every claim by reading the actual code

COMMUNICATE: If `security-reviewer` flags something, weigh in on whether the fix fits the architecture.

GIT: You must NEVER run git add, git commit, git push, or any destructive git commands.
```

Append the **architecture review rules** from `project-context.md` as a `RULES TO ENFORCE:` section.

### 3. `e2e-reviewer` — E2E & Test Coverage Reviewer

Build the spawn prompt by combining:

1. The template below
2. The **test credentials** and **dev server URL** from `project-context.md`

```
You are `e2e-reviewer`, validating changes with Playwright E2E tests.

REVIEW SCOPE: All features changed on this branch vs main.

YOUR JOB:
1. Read the changed code to understand what features were added/modified
2. Run Playwright tests against the running dev server
3. Test the happy path for each changed feature
4. Test edge cases and error paths (invalid input, unauthorized access, empty states)
5. Verify that error handling works correctly

TOOLS: Use Playwright cli

HOW TO REPORT:
- For each test: what you tested, expected result, actual result, screenshot if failed
- Clearly mark PASS or FAIL for each test case
- Message `security-reviewer` or `architecture-reviewer` if you discover behavior that looks like a bug in their domain

GIT: You must NEVER run git add, git commit, git push, or any destructive git commands.
```

## Workflow

1. **Gather the diff** and list of changed files.
2. **Spawn all 3 reviewers in parallel** — they don't depend on each other.
3. **Let reviewers work and cross-communicate.** They can challenge each other's findings.
4. **Wait for all reviewers to finish.**
5. **Synthesize findings** into a single report.
6. **Shut down all teammates**, then clean up the team.

## Output Format

Present the final review to the user in this exact format:

```
## Review Summary

### Overview
[1-2 sentences: what this branch does and overall quality assessment]

### Security Findings
[From security-reviewer. List each finding with file:line and severity.]

### Architecture Findings
[From architecture-reviewer. List each violation with file:line and rule.]

### E2E Findings
[From e2e-reviewer. List test results: feature tested, PASS/FAIL, details.]

### Cross-Cutting Issues
[Issues identified through reviewer debate — where multiple domains intersect.]

### Verdict: Ready to merge / Not ready
[Clear recommendation with reasoning.]
```

## Rules

- Use Sonnet for all teammates.
- Reviewers must verify every claim by reading actual code — no speculative bugs.
- Do not flag style preferences or opinions. Only real issues.
- If the dev server is not running, tell the user to start it before E2E review begins.
- Never auto-commit. This is a review-only workflow.
