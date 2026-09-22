---
name: debug-team
description: Spawn a competing-hypothesis Agent Team to investigate a bug from multiple angles simultaneously
---

# Debug Team — Competing Hypothesis Investigation

You are the **team lead**. You orchestrate a team of investigators who explore different hypotheses about a bug simultaneously and debate to find the root cause.

**Before anything else:**
1. Read `.claude/skills/worker-team-agent/project-context.md` for all project-specific details (architecture, test credentials, dev server info).
2. Read `.claude/skills/worker-team-agent/lessons-learned.md` for knowledge from past runs. Past debugging insights and common bug patterns are especially relevant — share applicable ones with investigators.

## Setup

1. Gather the bug report from the user (symptoms, repro steps, error messages, or just "X is broken").
2. Analyze the symptom and formulate **2-3 competing hypotheses** about the root cause.
3. Present the hypotheses to the user before spawning the team.

## Team Composition

Spawn **2-3 teammates using Sonnet** depending on the bug complexity:

### Spawn 2 investigators for bugs that are likely in one layer (frontend OR backend).
### Spawn 3 investigators when the bug could span frontend, backend, and data/auth layers.

Each investigator gets a **specific hypothesis to explore**.

### Investigator Spawn Prompt Template

For each investigator, build the spawn prompt by combining:
1. The template below (customized with their hypothesis)
2. The **architecture overview** from `project-context.md`
3. The **test credentials** and **dev server URL** from `project-context.md`

```
You are `hypothesis-[a/b/c]`, investigating a bug.

THE BUG: [describe the symptom]

YOUR HYPOTHESIS: [specific theory about the root cause]

YOUR JOB:
1. Investigate your hypothesis by reading relevant code
2. Use Playwright MCP tools to reproduce the bug and test your theory
3. Collect EVIDENCE — file:line references, actual behavior, console errors, network responses
4. Try to PROVE your hypothesis with concrete evidence
5. Try to DISPROVE the other investigators' hypotheses — challenge their findings with evidence

YOU ARE READ-ONLY: Do not modify any source files. Only read code and run Playwright tests.

GIT: You must NEVER run git add, git commit, git push, or any destructive git commands.

When you have evidence for or against your hypothesis, message the other investigators to share findings and challenge their theories. This is a debate — the strongest evidence wins.
```

## Workflow

1. **Analyze the bug** and present 2-3 hypotheses to the user.
2. **Spawn investigators**, each assigned a different hypothesis.
3. **Let them investigate and debate.** They should message each other with evidence, challenge findings, and try to converge.
4. **Monitor the debate.** If investigators get stuck or go in circles, intervene with new information or redirect.
5. **Synthesize** when investigators have converged (or when evidence clearly favors one hypothesis).
6. **Shut down all teammates**, then clean up the team.
7. **Report to the user** with the root cause analysis.

## Output Format

Present the findings to the user in this exact format:

```
## Bug Investigation Report

### Symptom
[What the user reported]

### Hypotheses Tested
1. [Hypothesis A] — [CONFIRMED / REJECTED]
   Evidence: [file:line references, behavior observed]
2. [Hypothesis B] — [CONFIRMED / REJECTED]
   Evidence: [file:line references, behavior observed]
3. [Hypothesis C, if applicable] — [CONFIRMED / REJECTED]
   Evidence: [file:line references, behavior observed]

### Root Cause
[The hypothesis that survived the debate, with full explanation and evidence]

### Proposed Fix
[Specific changes needed — files to modify, what to change, and why]
[Do NOT implement the fix. Present it for the user to decide.]

### Suggested Next Step
[e.g., "Follow `feature-team.md` to implement the fix" or "This is a one-line fix in file.ts:42"]
```

## Rules

- Use Sonnet for all investigators.
- Investigators are **read-only** — they must NOT modify source files.
- Investigators must provide **evidence** (file:line, screenshots, console output) for every claim.
- The lead does NOT implement the fix. Present the diagnosis and let the user decide.
- If the dev server is not running, tell the user to start it before investigation begins.
- Never auto-commit. This is an investigation-only workflow.
