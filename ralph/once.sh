#!/bin/bash
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: $0 <issue-number>"
  exit 1
fi

ISSUE_NUMBER="$1"
IMAGE_TAG="platinum-ralph:latest"
SANDBOX_NAME="platinum-ralph"

source "$(dirname "$0")/lib.sh"

ralph_preflight
ralph_ensure_sandbox
ralph_hide_local_settings

echo ""
echo "=== Ralph once: issue #$ISSUE_NUMBER ==="

tmpfile=$(mktemp)
TMPFILES+=("$tmpfile")

prompt_file="ralph/.prompt-$$.txt"
TMPFILES+=("$prompt_file")

issue=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,comments,labels)

ralph_write_prompt "$prompt_file" "Target issue (#$ISSUE_NUMBER) — work on this issue only, ignore the task-selection section:
$issue"

ralph_run "$SANDBOX_NAME" "$prompt_file" \
  "Read $prompt_file in full and execute the instructions in it exactly. Work ONLY on issue #$ISSUE_NUMBER — do not pick a different issue. Do not stop until you hit a <promise> marker." \
  | tee "$tmpfile" \
  | jq --unbuffered -rj "$STREAM_TEXT"

echo ""
echo "Ralph done with issue #$ISSUE_NUMBER."
