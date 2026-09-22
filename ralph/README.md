# Ralph — autonomous issue loop

Runs Claude Code in a Docker container against this repository's GitHub issues. Each
session picks **one** issue, implements it, verifies it, pushes a branch and opens a
pull request. **It never merges and never closes a PRD issue.** A human reviews
everything.

## Setup

Two one-time steps.

**1. A long-lived Claude token.** The container cannot reach the host keychain, so
it needs its own:

```bash
claude setup-token
export CLAUDE_CODE_OAUTH_TOKEN=<the token it prints>   # add to your shell profile
```

**2. `gh` authenticated on the host.** The scripts read the token with
`gh auth token` and pass it in, so the agent can push and open PRs.

Also needed: Docker running, and `jq`. The preflight checks all of this and refuses
to start with a specific message rather than failing halfway through an iteration.

## Running

From the repository root:

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

The first run builds `platinum-ralph:latest` and clones the repository into the
`platinum-ralph-work` volume. Later runs reuse both.

**Start with `once.sh 11`** and read the output before letting `afk.sh` run
unattended. Slice #11 is the test harness — the whole chain stands on it.

Optional: `RALPH_MODEL=opus ./ralph/once.sh 11` to override the account default.

Nothing to start on the host: the agent runs its own dev server inside the
container when a slice needs a browser check.

## Isolation model

**The host working tree is never mounted.** The container clones the repository from
`origin` into a named volume and works there.

That is deliberate. An autonomous loop that switches branches inside the tree you are
editing is a bad trade for the small convenience of seeing commits appear locally —
and the loop's contract is that work reaches you as a pushed branch and a pull
request anyway. It also avoids feeding macOS-built `node_modules` to a Linux
container.

The only host path exposed is `ralph/.run`, read-only, carrying the generated prompt.

To inspect or reset the agent's checkout:

```bash
docker run --rm -it -v platinum-ralph-work:/work platinum-ralph:latest bash   # look
docker volume rm platinum-ralph-work                                          # reset
```

## How work is ordered

The 41 slices form a **linear cascade-stack**. Slice N's branch is cut from slice
N−1's branch and its PR targets that branch. Only slice #11 branches off `main`.
Merging is bottom-up and is a human's job.

Each issue body carries the metadata the agent reads:

```
Parent: #4                                      ← the PRD this slice belongs to
Parent branch: feat/24-list-support-components  ← what to branch from
Branch: feat/25-events-contract                 ← what to name this branch
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
| `lib.sh` | Shared plumbing: preflight, image build, prompt assembly, run. |
| `entrypoint.sh` | Runs in the container: clone, install, launch Claude. |
| `once.sh` / `list.sh` / `afk.sh` | Entry points. |
| `branching.md` | The cascade rules and the exact git commands. |
| `checks.md` | Lint, type-check, tests, contract regeneration. |
| `e2e.md` | Browser verification through Playwright MCP. |
| `commit-format.md` | Commit and PR writing rules. |
| `failure-modes.md` | Past mistakes, so they are not repeated. |
| `Dockerfile` | Playwright base, Node 20.19, Claude Code, `gh`, Playwright MCP. |
| `.mcp.json` | Playwright MCP config used inside the container. |

## Container quirks worth knowing

- **Node is installed from the official tarball, not apt.** The Playwright base image
  ships Node 22.11, which satisfies neither branch of this project's `engines` field
  and makes `npm ci` fail with `EBADENGINE`. apt cannot fix it either — the base
  image's `nodejs` package is already newer, so installing from the 20.x repo is a
  silent no-op. The tarball goes into `/usr/local`, which precedes `/usr/bin` on PATH.
- **The agent runs as an unprivileged user.** Claude Code refuses
  `--dangerously-skip-permissions` as root. That is also why the Chrome symlink
  Playwright MCP expects is created at build time rather than at run time.
- **The browser check runs entirely in the container.** The agent starts
  `npm run dev`, and Playwright MCP's Chromium — a subprocess of the same container —
  reaches it at `localhost:5173`. A dev server anywhere else would serve different
  code than the branch under test.
- **No `NAPI_RS_NATIVE_LIBRARY_PATH`.** It was inherited from an x86 VM without AVX2
  and is harmful here: it forces every NAPI-RS loader onto its WASM branch, and
  `@tailwindcss/oxide` ships no WASM fallback, so `vite dev` dies with "Cannot find
  native binding". The container is arm64 and the native bindings load fine.
- **The generated prompt file carries a GitHub token.** It lives in `ralph/.run/`, is
  gitignored, and is deleted on exit — including on Ctrl-C.
- **`npm ci` reruns only when the lockfile changes**, tracked by a hash in the volume.
  A five-iteration run pays the install cost once.

## Limits

- Sessions are independent. Nothing carries over except the git history, the volume,
  and the issue comments the agent leaves.
- The browser check is skipped only when Playwright MCP itself fails to start. Then
  the PR is labelled `needs-manual-qa` with the exact error — never silently passed
  over.
- `HITL` issues (#49, #50, #51) need a human. The loop filters them out. The design
  slices (#12, #44) were HITL until the palette, typeface, density and motion were
  decided; those choices are recorded on issue #12.
- Until slice #13 lands, `npm ci` still runs the inherited `postinstall` that fetches
  an OpenAPI schema from a third-party host. That slice removes it.
