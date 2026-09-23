#!/bin/bash
# Shared plumbing for afk.sh / once.sh / list.sh.
# Expects IMAGE_TAG and WORK_VOLUME to be set by the caller.

STREAM_TEXT='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'
FINAL_RESULT='select(.type == "result").result // empty'

RUN_INPUT_DIR="ralph/.run"
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

  # The containerised Claude cannot reach the host's keychain, so it needs a
  # long-lived token of its own.
  if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo "CLAUDE_CODE_OAUTH_TOKEN is not set." >&2
    echo "Generate one on the host and export it:" >&2
    echo "  claude setup-token" >&2
    echo "  export CLAUDE_CODE_OAUTH_TOKEN=<the token it prints>" >&2
    echo "Add it to your shell profile to avoid repeating this." >&2
    exit 1
  fi

  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "No 'origin' remote. The agent clones from it." >&2
    exit 1
  fi
}

ralph_ensure_image() {
  if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
    echo "Building $IMAGE_TAG..."
    docker build -t "$IMAGE_TAG" ralph
  fi
  mkdir -p "$RUN_INPUT_DIR"
  trap ralph_cleanup EXIT INT TERM
}

ralph_cleanup() {
  for f in "${TMPFILES[@]}"; do rm -f "$f"; done
}

# ---------------------------------------------------------------------------
# Prompt assembly.
#
# $1 — destination file on the host (inside ralph/.run, bind-mounted read-only)
# $2 — the task block (open issues, or a single target issue)
#
# The GitHub token is injected so the agent can push and open PRs; the host
# keeps its token in the macOS keyring, which does not cross into the container.
# ralph/.run is gitignored and its contents are deleted on exit.
# ---------------------------------------------------------------------------
ralph_write_prompt() {
  local prompt_file="$1"
  local task_block="$2"

  local git_user_name git_user_email gh_token commits prompt_body
  git_user_name=$(git config user.name)
  git_user_email=$(git config user.email)
  gh_token=$(gh auth token)
  commits=$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")
  prompt_body=$(cat ralph/prompt.md)

  printf 'GIT_USER_NAME=%s\nGIT_USER_EMAIL=%s\nWORKSPACE_PATH=/work\nGH_TOKEN=%s\nRALPH_ALLOW_STACK=%s\n\nPrevious commits:\n%s\n\n%s\n\n%s' \
    "$git_user_name" "$git_user_email" "$gh_token" "${RALPH_ALLOW_STACK:-0}" \
    "$commits" "$task_block" "$prompt_body" \
    > "$prompt_file"
}

# ---------------------------------------------------------------------------
# Run one agent session.
#
# $1 — prompt file path on the host
# $2 — extra instruction appended to the bootstrap line
#
# The repository is NOT bind-mounted. The container clones it into a named
# volume and works there, so the host working tree is never touched and
# node_modules is built for linux rather than inherited from macOS.
# ---------------------------------------------------------------------------
ralph_run() {
  local prompt_file="$1" instruction="$2"
  local repo_slug container_prompt

  repo_slug=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
  container_prompt="/run-input/$(basename "$prompt_file")"

  docker run --rm \
    -v "$WORK_VOLUME":/work \
    -v "$(pwd)/$RUN_INPUT_DIR":/run-input:ro \
    --add-host=host.docker.internal:host-gateway \
    -e GH_TOKEN="$(gh auth token)" \
    -e CLAUDE_CODE_OAUTH_TOKEN \
    -e GIT_USER_NAME="$(git config user.name)" \
    -e GIT_USER_EMAIL="$(git config user.email)" \
    -e REPO_SLUG="$repo_slug" \
    -e RALPH_MODEL \
    -e RALPH_INSTRUCTION="Read $container_prompt in full and execute the instructions in it exactly. ${instruction}" \
    "$IMAGE_TAG" \
  | grep --line-buffered '^{'
}
