# Ralph — autonomous issue loop

Runs Claude Code in a Docker sandbox against this repository's GitHub issues. Each
session picks **one** issue, implements it, verifies it, pushes a branch and opens a
pull request. **It never merges and never closes a PRD issue.** A human reviews
everything.

## Prerequisites

- **Docker Desktop recent enough to ship the `docker sandbox` CLI plugin.** Verify:
  ```bash
  docker sandbox --help
  ```
  If that prints Docker's generic help instead of sandbox usage, the plugin is
  missing — update Docker Desktop and restart it. The scripts check this and refuse
  to start rather than failing halfway through.
- `gh` authenticated on the host (`gh auth status`). The token is read with
  `gh auth token` and injected into the sandbox, because the host keeps it in the
  macOS keyring, which does not cross into the container.
- `jq`.
- For the browser check: the dev server running **on the host**, `npm run dev`. The
  container reaches it at `host.docker.internal:5173`.

## Running

All commands run from the repository root.

```bash
# One specific issue — use this first.
./ralph/once.sh 11

# A list, in order. The slices are a linear cascade, so list them ascending;
# the run stops at the first failure because later slices branch off earlier ones.
./ralph/list.sh 11 12 13 14

# Autonomous: N iterations, picking its own issue each time. HITL issues are
# filtered out host-side.
./ralph/afk.sh 5
```

The first run builds `platinum-ralph:latest` (Playwright base + Claude Code +
Playwright MCP) and creates the `platinum-ralph` sandbox. Later runs reuse both.

**Start with `once.sh 11`** and read the output before letting `afk.sh` run
unattended. Slice #11 is the test harness — the whole chain stands on it.

## How work is ordered

The 41 slices form a **linear cascade-stack**. Slice N's branch is cut from slice
N−1's branch and its PR targets that branch. Only slice #11 branches off `main`.
Merging is bottom-up and is a human's job.

Each issue body carries the metadata the agent reads:

```
Parent: #4                                  ← the PRD this slice belongs to
Parent branch: feat/24-list-support-components  ← what to branch from
Branch: feat/25-events-contract             ← what to name this branch
Blocked by: #24
```

`Parent branch:` points at the **blocker's** branch rather than a per-PRD branch.
The PRDs here are strictly sequential — PRD-004 cannot compile without PRD-001
through PRD-003 — so a branch cut from `main` per PRD would be an empty scaffold.
The slices are still attached as native GitHub sub-issues under their PRD, so the
issue list stays organised.

## Files

| File | Purpose |
|---|---|
| `prompt.md` | The agent's instructions. The hard rules live at the top. |
| `lib.sh` | Shared plumbing: preflight, sandbox lifecycle, prompt assembly, run. |
| `once.sh` / `list.sh` / `afk.sh` | Entry points. |
| `branching.md` | The cascade rules and the exact git commands. |
| `checks.md` | Lint, type-check, tests, contract regeneration. |
| `e2e.md` | Browser verification through Playwright MCP. |
| `commit-format.md` | Commit and PR writing rules. |
| `failure-modes.md` | Past mistakes, so they are not repeated. |
| `Dockerfile` | Playwright base + Claude Code + `gh` + Playwright MCP. |
| `.mcp.json` | Playwright MCP config used inside the sandbox. |

## Sandbox quirks worth knowing

- **`NAPI_RS_NATIVE_LIBRARY_PATH=/nonexistent` prefixes every npm/node command.**
  The sandbox CPU lacks AVX2 and the oxc native bindings used by the Vite
  auto-import plugins crash with `Illegal instruction` without it. The Dockerfile
  sets it as an env var and the prompt requires the prefix as a belt-and-braces
  measure. A SIGILL is a missing prefix, not broken infrastructure.
- **`localhost` inside the container is the container.** The host dev server is
  `host.docker.internal`.
- **The sandbox network is default-deny.** `lib.sh` allow-lists the host, GitHub and
  the npm registry. A new outbound dependency needs another `--allow-host`.
- **`.claude/settings.local.json` is moved aside for the run** and restored on exit.
  Its permission entries carry absolute macOS paths that never match inside the
  container.
- **The generated prompt file carries a GitHub token.** It lives at
  `ralph/.prompt-*.txt`, is gitignored, and is deleted on exit — including on
  Ctrl-C.

## Limits

- Sessions are independent. Nothing carries over except the git history and the
  issue comments the agent leaves.
- The agent cannot start the dev server, so the browser check is skipped unless a
  human has one running. A skipped check is labelled `needs-manual-qa` on the PR
  with the reason written out — it is never silently passed over.
- `HITL` issues (#12, #44, #49, #50, #51) need a human. The loop filters them out.
