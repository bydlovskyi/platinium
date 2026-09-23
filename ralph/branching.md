# Branching (§3 step 4)

**Every slice branches off `main` and its PR targets `main`.** One slice, one branch,
one PR, one merge. No stacks.

```bash
git fetch origin --prune
git checkout --quiet main && git pull --ff-only
git checkout -b "feat/<N>-<this-slug>"
```

Use the branch name from this issue's **Branch:** line verbatim.

Open the PR against `main`:

```bash
gh pr create --base main ...
```

## Check the blocker first

A slice declares `Blocked by: #X`. That slice's work must already be **in `main`**
before this one can build on it:

```bash
BLOCKER_BRANCH="feat/<X>-<blocker-slug>"     # from the blocker issue's Branch: line

if git rev-parse --verify --quiet "origin/$BLOCKER_BRANCH" >/dev/null &&
   ! git merge-base --is-ancestor "origin/$BLOCKER_BRANCH" origin/main; then
  echo "blocker #X is not merged into main yet"
fi
```

If the blocker is not in `main`, **stop**. Comment on this issue saying which blocker
is outstanding and that the work cannot start until it merges, then exit with
`<promise>NO MORE TASKS</promise>`.

Do not branch off the blocker. Do not branch off `main` anyway and hope — the code
this slice needs is not there, so it will not compile.

A slice with no `Blocked by` has nothing to check.

## Why not stack

Stacking a slice on its unmerged blocker lets work continue while a PR sits in
review. It costs a tangled graph, PR bases pointing at branches that later
disappear, dependence on GitHub's auto-retarget, and diffs that carry someone
else's commits.

This project merges each PR as it lands, so stacking buys nothing. Waiting is
cheaper than untangling.

**Escape hatch:** the host can set `RALPH_ALLOW_STACK=1`, which appears in the
prompt header. Only then may a slice branch off an unmerged blocker's branch — and
its PR must target that same branch, never `main`. Use it for an unattended batch
run where nobody is merging in between. When it is unset or `0`, the rule above is
absolute.

## Rules that keep the history sane

- **Never `git merge main` into your branch mid-slice.** Rebase if `main` moves.
- **Never merge another slice's branch into yours.** A branch that fails to
  typecheck because another slice changed shared types means the blocker is not
  merged — stop and say so.
- **Merging is a human's job.** Never run `gh pr merge`.
