---
name: create-gh-issue
description: Use when the user asks to create a GitHub issue for a bug, feature request, or task — explores the codebase for context, structures the issue body, confirms with the user, and creates it via gh CLI
---

# Create GitHub Issue

Create a single, well-structured GitHub issue grounded in codebase context.

## Process

### 1. Understand the request

Extract from the user's message:
- **Type**: bug / feature / task / chore
- **Scope**: what part of the system is affected
- **Description**: what needs to happen and why

### 2. Grill for missing context (MANDATORY)

Before drafting, invoke the `grill-me` skill and follow it to resolve every uncertainty needed to fill the issue template concretely — no placeholders, no "TBD", no vague acceptance criteria.

Scope the grilling to what the template below needs: scope boundaries, affected files, API/data/UI changes, edge cases, error handling, acceptance criteria, and blockers.

Only proceed to drafting once all grilling questions are answered OR the user explicitly tells you to stop and draft with what you have.

### 3. Draft the issue

Pick the matching template below. Fill every section — do NOT leave placeholders.

#### Feature / Task template

```
## What to build

<End-to-end description of the behavior. One paragraph. Reference exact files where relevant.>

## Acceptance criteria

- [ ] <Specific, verifiable criterion>
- [ ] <Backend: API returns X when Y>
- [ ] <Frontend: UI shows/hides/disables Z>
- [ ] <Tests cover the new behavior>

## Blocked by

<"None — can start immediately"  OR  "Blocked by #<number>">

## Notes

<Optional: constraints, edge cases, links to related issues/PRs>
```

#### Bug template

```
## What's broken

<One sentence describing the incorrect behavior and where it occurs.>

## Steps to reproduce

1. <Step>
2. <Step>
3. Observe: <actual result>

Expected: <what should happen instead>

## Relevant code

- `<file path>:<line>` — <why this is relevant>

## Acceptance criteria

- [ ] <Bug no longer reproducible via steps above>
- [ ] <Regression test added>

## Blocked by

<"None — can start immediately"  OR  "Blocked by #<number>">
```

### 4. Confirm with the user

Show the proposed **title** and **body** inline. Ask:
- Does the scope look right?
- Any missing acceptance criteria?
- Should this be blocked by another issue?

Iterate until the user approves. Do NOT create the issue before approval.

### 5. Create the issue

```bash
gh issue create --title "<title>" --body "$(cat <<'EOF'
<approved body>
EOF
)"
```

Return the created issue URL.

## Tips

- Title: imperative verb, under 72 chars (`Block booking for inactive users`, not `Users with inactive status should not be able to book`)
- Acceptance criteria must be independently verifiable — avoid vague criteria like "works correctly"
- Reference file paths so the implementer doesn't have to rediscover them
- For bugs: always include steps to reproduce and expected vs. actual
