# Failure Modes (don't repeat these)

Read when uncertain about verification scope or sandbox quirks. Otherwise the
prompt's main rules cover the common path.

## Container

- ❌ `Illegal instruction` (SIGILL) on `npm`/`node`/`npx`. NOT infrastructure — a
  missing env var. Fix: prefix with `NAPI_RS_NATIVE_LIBRARY_PATH=/nonexistent`.
- ❌ Browser check silently skipped because Playwright was unavailable. → §6.4
  requires an explicit `needs-manual-qa` label and a written reason.
- ❌ Tried to run the dev server inside the container. It runs on the host at
  `host.docker.internal:5173`.
- ❌ `localhost` used inside the container to reach the dev server. That is the
  container, not the host.

## The cascade

- ❌ Opened a slice PR with `--base main` while the issue had a `Blocked by`. This
  collapses 41 stacked PRs into 41 independent merges into `main` and leaves a
  reviewer to reassemble the order by hand. → Hard Rule 7, §3, §9.
- ❌ `git merge main` into a mid-chain branch to "get the latest". This puts commits
  on the child that the foundation doesn't have and breaks the bottom-up cascade.
  → Rebase onto the direct parent instead.
- ❌ Skipped ahead to a later slice because it looked easier. Slice 20 on a missing
  slice 14 does not compile. → §2: take the lowest-numbered actionable slice.
- ❌ Branched off `main` because the blocker's branch wasn't on the remote yet. That
  means the blocker hasn't been started — pick the blocker up instead.

## Contract

- ❌ A code slice edited `openapi.yaml` or regenerated `schema.ts` because it needed
  one more field. The generated file conflicts unreadably across branches. → Hard
  Rule 8: stop, comment on the owning contract issue.
- ❌ A field added to the contract but only surfaced in one place — the mock handler
  updated, the type alias, table column, form field or fixture left stale. → §6.1
  propagation catches this.

## Architecture

- ❌ A service imported a store, or a store imported an orchestrating composable.
  The one-way rule is the whole point of the layering. → §6.3.
- ❌ A feature imported another feature directly instead of going through a view, a
  composable or the event emitter. → §6.3.
- ❌ List state kept in local refs inside an entity view instead of the shared
  URL-driven composable. The first one that does this gets copied by the next two
  entities. → §6.3, and `.claude/skills/code-conventions/SKILL.md`.
- ❌ Money converted between decimal and minor units somewhere other than the
  currency input component. A second conversion site is how rounding bugs enter.
- ❌ A value summed across currencies. A total mixing euros and pounds is not a
  number.

## Process

- ❌ Closed an issue without running the verification section. → §10 allows a close
  only after every check passes.
- ❌ Self-review confirmed broken work. → §6 is mechanical, not self-assessment.
- ❌ Shipped half-working code rather than failing loud. The next slice branches off
  this one, so a broken branch poisons everything after it. → §7.

When in doubt: STOP, comment, exit.
