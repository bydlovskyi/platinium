# Branching (§3 step 4)

Slices declare `Blocked by: #X`. That names the work this slice builds on — it does
**not** by itself decide the base branch. Check whether the blocker has already
landed, and branch accordingly.

```bash
git fetch origin --prune
```

## Decide the base

```bash
BLOCKER_BRANCH="feat/<X>-<blocker-slug>"     # from the blocker issue's Branch: line

if git merge-base --is-ancestor "origin/$BLOCKER_BRANCH" origin/main 2>/dev/null; then
  BASE=main                 # blocker already merged — build on main, clean history
else
  BASE="$BLOCKER_BRANCH"    # blocker still open — stack on it, don't wait
fi
```

A slice with no `Blocked by` (only slice #11) always uses `main`.

## Create the branch

```bash
git checkout --quiet "$BASE" && git pull --ff-only
git checkout -b "feat/<N>-<this-slug>"
```

Use the branch name from this issue's **Branch:** line verbatim — the next slice in
the chain looks for it.

## Open the PR against the same base

```bash
gh pr create --base "$BASE" ...
```

`$BASE` must be the branch you actually cut from. Never target `main` from a branch
cut off an unmerged blocker: the diff would include the blocker's commits and the
reviewer could not tell your work from theirs.

## Why it adapts

Branching off the blocker is what lets work continue while a PR sits in review — it
is the only reason an unattended run of many slices is possible. But when the
reviewer merges promptly, that stacking buys nothing and costs a tangled graph, PR
bases pointing at dead branches, and reliance on GitHub's auto-retarget.

Checking `merge-base --is-ancestor` gives both: a clean linear history when review
keeps up, and a working stack when it does not.

## If the blocker's branch does not exist on the remote

Its slice has not been started. Do not skip ahead and do not silently fall back to
`main` — the code you need is not there. Pick the blocker up first, or exit with
`<promise>NO MORE TASKS</promise>` if it is not actionable.

## Rules that keep the history sane

- **Never `git merge main` into a branch cut from an unmerged blocker.** Rebase onto
  the blocker if it advances. Merging `main` in puts commits on your branch that the
  blocker does not have, and the stack stops merging cleanly bottom-up.
- **Never merge sibling branches into each other.** A branch that fails to typecheck
  because a sibling changed shared types means an undeclared dependency — report it,
  don't paper over it.
- **One direct child per parent.** Two open slices with the same `Blocked by` is a
  Y-fork; escalate rather than guessing.
- **Merging is a human's job.** When a stack does exist, it merges bottom-up: deepest
  child first, then its parent.
