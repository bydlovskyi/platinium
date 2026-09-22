#!/bin/bash
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

IMAGE_TAG="platinum-ralph:latest"
WORK_VOLUME="platinum-ralph-work"

source "$(dirname "$0")/lib.sh"

ralph_preflight
ralph_ensure_image

for ((i=1; i<=$1; i++)); do
  echo ""
  echo "=== Iteration $i ==="

  tmpfile=$(mktemp)
  TMPFILES+=("$tmpfile")

  prompt_file="$RUN_INPUT_DIR/prompt-$$-$i.txt"
  TMPFILES+=("$prompt_file")

  issues=$(gh issue list --state open --label AFK --json number,title,body,comments,labels --limit 100)

  ralph_write_prompt "$prompt_file" "Open issues (AFK only — HITL issues are filtered out host-side):
$issues"

  ralph_run "$prompt_file" "Do not stop until you hit a <promise> marker." \
    | tee "$tmpfile" \
    | jq --unbuffered -rj "$STREAM_TEXT"

  result=$(jq -r "$FINAL_RESULT" "$tmpfile")

  if [[ "$result" == *"<promise>NO MORE TASKS</promise>"* ]]; then
    echo ""
    echo "Ralph complete after $i iterations."
    exit 0
  fi

  # Stop on a failure rather than looping. The slices form a cascade, so a
  # failed slice blocks every one after it — the next iteration would pick the
  # same issue up again and fail the same way, burning the remaining budget.
  if [[ "$result" == *"<promise>TASK FAILED"* ]]; then
    echo ""
    echo "A task failed on iteration $i — see the issue comment."
    echo "Later slices branch off this one, so stopping here."
    exit 1
  fi

  # An HITL issue reached the agent despite the host-side filter.
  if [[ "$result" == *"<promise>NEEDS HUMAN"* ]]; then
    echo ""
    echo "Iteration $i needs a human — see the issue comment."
    exit 2
  fi
done

echo ""
echo "Reached max iterations ($1). Some tasks may still be pending — re-run to continue."
