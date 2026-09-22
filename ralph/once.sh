#!/bin/bash
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: $0 <issue-number>"
  exit 1
fi

ISSUE_NUMBER="$1"
IMAGE_TAG="platinum-ralph:latest"
WORK_VOLUME="platinum-ralph-work"

source "$(dirname "$0")/lib.sh"

ralph_preflight
ralph_ensure_image

echo ""
echo "=== Ralph once: issue #$ISSUE_NUMBER ==="

prompt_file="$RUN_INPUT_DIR/prompt-$$.txt"
TMPFILES+=("$prompt_file")

issue=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,comments,labels)

ralph_write_prompt "$prompt_file" "Target issue (#$ISSUE_NUMBER) — work on this issue only, ignore the task-selection section:
$issue"

ralph_run "$prompt_file" "Work ONLY on issue #$ISSUE_NUMBER — do not pick a different issue. Do not stop until you hit a <promise> marker." \
  | jq --unbuffered -rj "$STREAM_TEXT"

echo ""
echo "Ralph done with issue #$ISSUE_NUMBER."
