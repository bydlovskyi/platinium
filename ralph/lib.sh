#!/bin/bash
# Shared plumbing for afk.sh / once.sh / list.sh.
# Expects IMAGE_TAG and SANDBOX_NAME to be set by the caller.

STREAM_TEXT='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'
FINAL_RESULT='select(.type == "result").result // empty'

TMPFILES=()

# ---------------------------------------------------------------------------
# Preflight — fail early and loudly rather than halfway through an iteration.
# ---------------------------------------------------------------------------
ralph_preflight() {
  if [ ! -d .git ]; then
    echo "Run this from the repository root." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not running. Start Docker Desktop and retry." >&2
    exit 1
  fi

  # `docker sandbox` ships as a Docker Desktop CLI plugin. On an older Desktop
  # the command silently falls through to `docker --help`, and every call below
  # fails in a confusing way. Note that `docker sandbox --help` exits 0 even when
  # the plugin is absent, so probe a real subcommand instead.
  if ! docker sandbox ls >/dev/null 2>&1; then
    echo "The 'docker sandbox' CLI plugin is not available." >&2
    echo "It ships with recent Docker Desktop builds — update Docker Desktop, restart it," >&2
    echo "and confirm with: docker sandbox ls" >&2
    exit 1
  fi

  for bin in gh jq; do
    if ! command -v "$bin" >/dev/null 2>&1; then
      echo "Missing required tool: $bin" >&2
      exit 1
    fi
  done

  if ! gh auth status >/dev/null 2>&1; then
    echo "gh is not authenticated on the host. Run: gh auth login" >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Sandbox lifecycle.
# ---------------------------------------------------------------------------
ralph_ensure_sandbox() {
  if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
    echo "Building $IMAGE_TAG..."
    docker build -t "$IMAGE_TAG" ralph
  fi

  # Create the sandbox once with the custom image. Subsequent runs reuse it
  # (docker sandbox rejects --name / -t when running an existing sandbox).
  if ! docker sandbox ls --quiet | grep -qx "$SANDBOX_NAME"; then
    echo "Creating sandbox $SANDBOX_NAME..."
    docker sandbox create --name "$SANDBOX_NAME" -t "$IMAGE_TAG" claude .
  fi

  # Wake the sandbox VM if it's stopped. `docker sandbox run` is supposed to
  # auto-start, but a stopped VM occasionally races and exec inspect fails
  # with `error during connect ... EOF`. A no-op exec forces a clean boot.
  docker sandbox exec "$SANDBOX_NAME" true >/dev/null 2>&1 || true

  # Docker sandbox runs a default-deny network proxy. Without these, the
  # container can't reach the host dev server, GitHub, or the npm registry.
  # Idempotent: re-running allow-host is a no-op.
  for host in host.docker.internal github.com api.github.com registry.npmjs.org; do
    docker sandbox network proxy "$SANDBOX_NAME" --allow-host "$host" >/dev/null 2>&1 || true
  done
}

# ---------------------------------------------------------------------------
# The host's .claude/settings.local.json carries permission lists tailored for
# interactive dev on macOS, with absolute host paths. Inside the sandbox those
# entries never match and the hook fires against paths that don't exist. Hide
# it for the run and restore it on exit so the host session is unaffected.
# ---------------------------------------------------------------------------
ralph_hide_local_settings() {
  LOCAL_SETTINGS=".claude/settings.local.json"
  LOCAL_SETTINGS_BACKUP=".claude/settings.local.json.ralph-backup"
  if [ -f "$LOCAL_SETTINGS" ]; then
    mv "$LOCAL_SETTINGS" "$LOCAL_SETTINGS_BACKUP"
  fi
  trap ralph_cleanup EXIT INT TERM
}

ralph_cleanup() {
  for f in "${TMPFILES[@]}"; do rm -f "$f"; done
  if [ -f "$LOCAL_SETTINGS_BACKUP" ]; then
    mv "$LOCAL_SETTINGS_BACKUP" "$LOCAL_SETTINGS"
  fi
}

# ---------------------------------------------------------------------------
# Prompt assembly.
#
# $1 — destination file
# $2 — the task block (open issues, or a single target issue)
#
# The GitHub token is injected so the sandboxed agent can push and open PRs;
# the host keeps its token in the macOS keyring, which does not cross into the
# container. The prompt file is gitignored and deleted on exit.
# ---------------------------------------------------------------------------
ralph_write_prompt() {
  local prompt_file="$1"
  local task_block="$2"

  local git_user_name git_user_email workspace_path gh_token commits prompt_body
  git_user_name=$(git config user.name)
  git_user_email=$(git config user.email)
  workspace_path=$(pwd)
  gh_token=$(gh auth token)
  commits=$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")
  prompt_body=$(cat ralph/prompt.md)

  printf 'GIT_USER_NAME=%s\nGIT_USER_EMAIL=%s\nWORKSPACE_PATH=%s\nGH_TOKEN=%s\n\nPrevious commits:\n%s\n\n%s\n\n%s' \
    "$git_user_name" "$git_user_email" "$workspace_path" "$gh_token" \
    "$commits" "$task_block" "$prompt_body" \
    > "$prompt_file"
}

# ---------------------------------------------------------------------------
# Run one agent session in the sandbox.
#
# $1 — sandbox name
# $2 — prompt file path (relative to the workspace)
# $3 — the bootstrap instruction passed as the positional prompt
# ---------------------------------------------------------------------------
ralph_run() {
  local sandbox_name="$1" prompt_file="$2" instruction="$3"
  local workspace_path
  workspace_path=$(pwd)

  docker sandbox run "$sandbox_name" -- \
    --add-dir "$workspace_path" \
    --mcp-config ralph/.mcp.json \
    --allowedTools "Agent Bash Read Write Edit MultiEdit Glob Grep Skill TodoWrite Task mcp__playwright__* WebFetch WebSearch" \
    --verbose \
    --print \
    --output-format stream-json \
    --permission-mode acceptEdits \
    --dangerously-skip-permissions \
    "$instruction" \
  | grep --line-buffered '^{'
}
