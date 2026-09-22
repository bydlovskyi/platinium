# Branching (§3 step 4)

The 41 slices are a **linear cascade-stack**. Slice N branches off slice N−1 and
its PR targets that branch. Only slice #11 branches off `main`.

Read the `Blocked by` line in the issue body. It names the blocker issue, and the
issue body also states the branch name explicitly.

## Slice #11 only — no blocker

```bash
git fetch origin && git checkout main && git pull --ff-only
git checkout -b feat/11-test-harness
```

## Every other slice — `Blocked by: #X`

Branch off the blocker's working branch, **whether or not its PR has merged**.
That is what produces the stacked PR: your branch contains the blocker's commits
plus yours, and the diff a reviewer sees is only your change.

```bash
git fetch origin
git checkout "feat/<X>-<blocker-slug>" && git pull --ff-only
git checkout -b "feat/<N>-<this-slug>"
```

The branch name for each slice is written in its issue body under **Branch:** —
use it verbatim so the next slice in the chain can find it.

If the blocker's branch does not exist on the remote yet, its slice has not been
started. Do not skip ahead and do not branch off `main` instead — pick the blocker
up first, or exit with `<promise>NO MORE TASKS</promise>` if it is not actionable.

## Rules that keep the cascade alive

- **Never `git merge main` into a chain branch.** Only `git rebase` onto the direct
  parent when the parent advances. Merging `main` into a mid-chain branch puts
  commits there that the foundation doesn't have and breaks the bottom-up cascade.
- **Never merge sibling branches into each other.** A branch that fails to
  typecheck because a sibling changed shared types means an undeclared dependency
  — report it, don't paper over it.
- **PR base is the direct parent only.** Never retarget to a grandparent or to
  `main` mid-chain. Retargeting happens on its own when the parent PR merges.
- **Merge order is bottom-up**, and it is a human's job: deepest child first, then
  its parent, down to slice #11 into `main`.
