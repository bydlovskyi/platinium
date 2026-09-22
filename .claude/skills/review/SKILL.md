---
name: review
description: Review git changes, explain what was changed and why, and identify critical bugs
allowed-tools: Bash(git *), Read, Grep, Glob
---

# Code Review Task

Review the pending changes on the current branch and provide **short, focused feedback**.

**Be extremely brief.** Only mention what truly matters. Skip anything trivial or obvious.

## Step 1: Get the changes

Run these commands to understand what changed:

- `git diff main...HEAD --name-status` - List all changed files
- `git diff main...HEAD` - Get full diff of changes

## Step 2: Read and analyze the changed files

Read each changed file to understand:

- What functionality was added/modified
- The purpose and intent of the changes
- How the changes fit into the existing codebase

## Step 3: Provide feedback

Use this exact format. Keep each section to a few lines max.

### 1. Overview

- 1-2 sentences: what changed and why

### 2. Key Changes

- Bullet list of only the most important changes (3-5 bullets max)
- Skip anything self-explanatory, minor, or obvious from context

### 3. Critical Issues

- **ONLY list issues that would cause real bugs, crashes, or data loss**
- Format: one-line description with `file:line` reference
- If no critical issues exist, just write "No critical issues found."

**VERIFICATION REQUIRED — before reporting ANY issue, you MUST:**

1. Read the full source file (not just the diff) to see guards, checks, and context you might be missing
2. **Read code comments carefully** — they often explain WHY a design decision was made. If a comment addresses your concern, it's not a bug
3. Trace the actual code path end-to-end — follow the data through function calls, conditionals, and return values
4. Confirm the bug is real, not just hypothetical. If a condition already handles the case, it's not a bug
5. Never report a bug based on assumptions about what code does — read and verify the actual logic first
6. **Verify your claims are factually correct.** If you say a name is missing a prefix, re-read the actual name character by character. If you say a value could be X, verify that X is actually possible in the real data flow

**If you cannot confirm a bug after verification, do NOT report it.** A false positive is worse than a missed bug. One wrong "BLOCKER" destroys trust in the entire review.

**ALSO flag as critical:**

- Custom BEM/SCSS classes when Tailwind should be used — this project uses Tailwind as primary styling. New components must not introduce custom CSS classes (e.g., `.my-component__item`). Static classes must use `class=""`, never `:class="[]"` with only static strings (don't fake dynamic binding). If a class line exceeds 120 chars, split the string across two lines.
- **Code convention violations** — invoke the `code-conventions` skill for the canonical checklist (layering, views vs features, routing, mock API, types, components). `architecture.md` in the repo root describes the structure — flag any violation found there. Do not duplicate rules here; the skill + `architecture.md` are the single source of truth.

**DO NOT list:**

- Styling/positioning concerns (CSS issues are not critical bugs)
- Potential edge cases that are unlikely in practice
- Code style, naming, or subjective improvements — **including type naming conventions**
- Minor optimizations or "nice to have" changes
- Issues with mocked/placeholder data
- Missing null checks unless they will definitely crash
- Issues where the code already has a guard/check that handles the case
- Speculative problems about data mismatches when code comments explain the design

### 4. Verdict

One line: Ready to merge / Not ready (with reason)

## Strict Rules

- **Total review length should be under 30 lines of markdown**
- **Use ONLY the 4 sections in the format above** (Overview, Key Changes, Critical Issues, Verdict). Do NOT add extra sections like "Minor issues" or "Suggestions"
- Do NOT pad the review with extra observations to seem thorough
- Do NOT suggest fixes or provide code snippets
- Do NOT explain how things work — just flag what's broken
- Do NOT invent problems — if you're not 100% sure something is wrong after reading the actual code, leave it out
- If the code looks good, say so in 3-4 lines total and move on
- Fewer words = better review
