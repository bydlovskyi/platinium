#!/bin/bash
# Container entrypoint. Prepares a clean checkout and hands control to Claude.
#
# The agent works on its OWN clone inside a named volume, never on the host's
# working tree. An autonomous loop that switches branches under a developer who
# is still working is a bad trade for the small convenience of seeing commits
# appear locally — and the loop's whole contract is that work is delivered as a
# pushed branch and a pull request anyway.
#
# Injected by the host: GH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, GIT_USER_NAME,
# GIT_USER_EMAIL, REPO_SLUG, RALPH_INSTRUCTION.
set -eo pipefail

for var in GH_TOKEN CLAUDE_CODE_OAUTH_TOKEN GIT_USER_NAME GIT_USER_EMAIL REPO_SLUG RALPH_INSTRUCTION; do
  if [ -z "${!var}" ]; then
    echo "entrypoint: missing required env var $var" >&2
    exit 1
  fi
done

# gh picks GH_TOKEN up from the environment on its own; `gh auth login
# --with-token` actively refuses when the variable is already set. Only the git
# credential helper needs wiring, so pushes over HTTPS use the same token.
gh auth setup-git

git config --global user.name "$GIT_USER_NAME"
git config --global user.email "$GIT_USER_EMAIL"
git config --global --add safe.directory /work
git config --global advice.detachedHead false

# Clone once into the named volume; reuse it on later iterations so branches
# accumulate and node_modules survives.
if [ ! -d /work/.git ]; then
  echo "Cloning $REPO_SLUG..."
  gh repo clone "$REPO_SLUG" /work
fi

cd /work
git fetch origin --prune --quiet

# Park on main between runs. The agent creates its own branch per §3; leaving a
# previous iteration's branch checked out would make it easy to build on the
# wrong base.
# --force matters: an iteration that dies mid-slice leaves modified tracked
# files behind (the auto-import generators rewrite committed files whenever a
# composable or service is added). A plain checkout refuses to clobber them,
# set -e kills the entrypoint, and the volume is wedged — every later run fails
# at the same line. This checkout is disposable; discard whatever is there.
git checkout --force --quiet main
git reset --hard --quiet origin/main
git clean -fdq -e node_modules

# node_modules lives in the volume. Reinstall only when the lockfile moved,
# otherwise a five-iteration run pays the install cost five times. The stamp
# lives inside node_modules so `git clean` does not delete it and it never
# shows up in `git status`.
lock_stamp=/work/node_modules/.ralph-lock-hash
current=$(sha1sum package-lock.json | cut -d' ' -f1)
if [ ! -f "$lock_stamp" ] || [ "$(cat "$lock_stamp")" != "$current" ] || [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm ci --no-audit --no-fund
  printf '%s' "$current" > "$lock_stamp"
fi

# Model is the account default unless overridden, e.g. RALPH_MODEL=opus.
MODEL_ARG=()
[ -n "$RALPH_MODEL" ] && MODEL_ARG=(--model "$RALPH_MODEL")

exec claude \
  "${MODEL_ARG[@]}" \
  --add-dir /work \
  --add-dir /run-input \
  --mcp-config ralph/.mcp.json \
  --allowedTools "Agent Bash Read Write Edit MultiEdit Glob Grep Skill TodoWrite Task mcp__playwright__* WebFetch WebSearch" \
  --verbose \
  --print \
  --output-format stream-json \
  --permission-mode acceptEdits \
  --dangerously-skip-permissions \
  "$RALPH_INSTRUCTION"
