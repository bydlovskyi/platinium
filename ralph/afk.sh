#!/bin/bash
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

IMAGE_TAG="platinum-ralph:latest"
SANDBOX_NAME="platinum-ralph"

source "$(dirname "$0")/lib.sh"

ralph_preflight
ralph_ensure_sandbox
ralph_hide_local_settings

for ((i=1; i<=$1; i++)); do
  echo ""
  echo "=== Iteration $i ==="

  tmpfile=$(mktemp)
  TMPFILES+=("$tmpfile")

  # Prompt file lives inside the workspace so the sandbox can read it via
  # --add-dir. Cannot use mktemp (writes to /tmp, not mounted) and cannot
  # pipe via stdin (`docker sandbox run` doesn't forward stdin to the
  # agent). Cannot pass as a positional arg either — the embedded
  # `gh issue list` JSON pushes the full prompt past Linux ARG_MAX
  # (~128KB), which manifests as `exec /usr/bin/claude: argument list
  # too long` and a 255 exit.
  prompt_file="ralph/.prompt-$$.txt"
  TMPFILES+=("$prompt_file")

  issues=$(gh issue list --state open --label AFK --json number,title,body,comments,labels --limit 100)

  ralph_write_prompt "$prompt_file" "Open issues (AFK only — HITL issues are filtered out host-side):
$issues"

  # Each iteration is a fresh `claude --print` session in the same sandbox
  # (faster startup, cached browsers). Playwright MCP spawns a clean Chromium
  # per session, so no state bleed between iterations.
  ralph_run "$SANDBOX_NAME" "$prompt_file" \
    "Read $prompt_file in full and execute the instructions in it exactly. Do not stop until you hit a <promise> marker." \
    | tee "$tmpfile" \
    | jq --unbuffered -rj "$STREAM_TEXT"

  result=$(jq -r "$FINAL_RESULT" "$tmpfile")

  if [[ "$result" == *"<promise>NO MORE TASKS</promise>"* ]]; then
    echo ""
    echo "Ralph complete after $i iterations."
    exit 0
  fi
done

echo ""
echo "Reached max iterations ($1). Some tasks may still be pending — re-run to continue."
