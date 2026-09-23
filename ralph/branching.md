# Branching (§3 step 4)

The base is decided per slice. Two cases, and the check is mechanical:

- **No `Blocked by`** → branch off `main`.
- **`Blocked by: #X`** → branch off the blocker's branch if it is still live, off
  `main` if the blocker has already merged.

The PR targets whatever you cut from. Never anything else.

## Decide

```bash
git fetch origin --prune

BLOCKER_BRANCH="feat/<X>-<blocker-slug>"     # from the blocker issue's Branch: line

if [ -z "<X>" ]; then
  BASE=main                                   # no blocker
elif ! git rev-parse --verify --quiet "origin/$BLOCKER_BRANCH" >/dev/null; then
  BASE=main                                   # branch gone — merged and deleted
elif git merge-base --is-ancestor "origin/$BLOCKER_BRANCH" origin/main; then
  BASE=main                                   # already in main
else
  BASE="$BLOCKER_BRANCH"                      # still open — build on it
fi
```

The two `main` cases exist because a merged blocker's work is already in `main`, and
its branch is usually deleted straight after. Cutting from `main` then gives the same
code with a linear history.

## Create the branch and open the PR

```bash
git checkout --quiet "$BASE" && git pull --ff-only
git checkout -b "feat/<N>-<this-slug>"
...
gh pr create --base "$BASE" ...
```

Use the branch name from this issue's **Branch:** line verbatim — the next slice
looks for it.

`--base` must be what you actually cut from. **Never `--base main` from a branch cut
off an unmerged blocker**: the diff would carry the blocker's commits and a reviewer
could not tell whose work is whose.

## If the blocker's branch does not exist and it has not merged

Its slice has not been started. Do not fall back to `main` — the code this slice
builds on is not there and it will not compile. Comment saying which blocker is
missing and exit with `<promise>NO MORE TASKS</promise>`.

## Why it works this way

Branching off an open blocker is what lets the loop keep going while PRs wait for
review. Without it the loop implements one slice, finds the next one blocked, and
stops until someone merges.

The cost is a stack: several PRs whose bases point at each other. They merge
bottom-up — deepest child first, then its parent — and GitHub retargets each child to
`main` as its base lands. Merge commits, not squash: squashing a parent rewrites its
commits and every child then conflicts against the copy already in `main`.

Once a blocker has merged, later slices cut from `main` again and the history
flattens on its own.

## Rules that keep the history sane

- **Never `git merge main` into a branch cut from an unmerged blocker.** Rebase onto
  the blocker if it advances. Merging `main` in puts commits on your branch the
  blocker does not have, and the stack stops merging cleanly bottom-up.
- **Never merge another slice's branch into yours.** A branch that fails to typecheck
  because another slice changed shared types means an undeclared dependency — report
  it, don't paper over it.
- **One direct child per parent.** Two open slices with the same `Blocked by` is a
  fork; escalate rather than guessing.
- **Merging is a human's job.** Never run `gh pr merge`.
