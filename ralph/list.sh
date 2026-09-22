#!/bin/bash
set -eo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <issue-number> [<issue-number> ...]"
  echo ""
  echo "Runs the given issues in the order listed, one agent session each."
  echo "The slices form a linear cascade, so list them ascending — a later"
  echo "slice's branch is created off the previous slice's branch."
  exit 1
fi

IMAGE_TAG="platinum-ralph:latest"
WORK_VOLUME="platinum-ralph-work"

source "$(dirname "$0")/lib.sh"

ralph_preflight
ralph_ensure_image

ISSUES=("$@")
TOTAL=${#ISSUES[@]}
FAILED=()

for idx in "${!ISSUES[@]}"; do
  ISSUE_NUMBER="${ISSUES[$idx]}"
  echo ""
  echo "=== [$((idx + 1))/$TOTAL] Issue #$ISSUE_NUMBER ==="

  tmpfile=$(mktemp)
  TMPFILES+=("$tmpfile")

  prompt_file="$RUN_INPUT_DIR/prompt-$$-$ISSUE_NUMBER.txt"
  TMPFILES+=("$prompt_file")

  if ! issue=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,comments,labels 2>&1); then
    echo "Could not read issue #$ISSUE_NUMBER — skipping."
    FAILED+=("$ISSUE_NUMBER")
    continue
  fi

  ralph_write_prompt "$prompt_file" "Target issue (#$ISSUE_NUMBER) — work on this issue only, ignore the task-selection section:
$issue"

  ralph_run "$prompt_file" "Work ONLY on issue #$ISSUE_NUMBER — do not pick a different issue. Do not stop until you hit a <promise> marker." \
    | tee "$tmpfile" \
    | jq --unbuffered -rj "$STREAM_TEXT"

  result=$(jq -r "$FINAL_RESULT" "$tmpfile")

  if [[ "$result" == *"<promise>TASK FAILED"* ]]; then
    echo ""
    echo "Issue #$ISSUE_NUMBER failed — see the issue comment."
    FAILED+=("$ISSUE_NUMBER")
    echo "Stopping — later slices branch off this one."
    break
  fi
done

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "All $TOTAL issues processed."
else
  echo "Processed with failures: ${FAILED[*]}"
  exit 1
fi
