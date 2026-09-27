# How AI was used to build this project

The assessment asks how AI was used: how context was provided, how requirements were
defined, how the implementation was guided, and how the output was checked. This document
follows the trail the repository itself contains. Every claim links to an artefact or a
commit, so none of it has to be taken on trust. It also records where the AI was wrong and
how that was caught.

## At a glance

| | |
|---|---|
| Tool | Claude Code: interactive sessions on my machine, and a headless loop in Docker |
| Period | 22–27 September 2026 |
| Specifications | 10 PRDs → 41 vertical-slice issues ([#1–#51](https://github.com/bydlovskyi/platinum/issues)) |
| Pull requests | 38, one per slice, stacked; every merge done by me |
| Commits | 124 (83 excluding merges) |
| Tests | 842 across 73 files, all passing |

## The trail

```
brief ──► interview ──► 10 PRDs ──► 41 slice issues ──► loop: build → review → verify ──► PR ──► human merge
           grill-me      write-a-prd   prd-to-issues      worker-team-agent + ralph/        (me)
```

### 1. From brief to PRDs: defining requirements

I did not hand the brief to the AI and ask for an app. I used two skills to turn it into
decisions first:

- [`grill-me`](../.claude/skills/grill-me/SKILL.md) interrogates a design one question at a
  time, in the role of a senior architect.
- [`write-a-prd`](../.claude/skills/write-a-prd/SKILL.md) turns the answers into a PRD with
  a fixed structure: problem, user stories, implementation decisions, API contract plan,
  testing boundary and out of scope.

The result is [`docs/prd/`](prd/) (commit `1831d82`): ten PRDs, one per area. Each PRD
records **decisions with their reasons and the alternatives it rejected**. That is why
[`TECHNICAL_REVIEW.md`](../TECHNICAL_REVIEW.md) could be written from the PRDs rather than
reconstructed at the end. The answers to the interview questions were mine. The AI
structured them and pointed out the gaps.

### 2. From PRDs to issues: scoping the work

[`prd-to-issues`](../.claude/skills/prd-to-issues/SKILL.md) split the PRDs into 41
**vertical slices** ([`docs/issues/`](issues/), mirrored as GitHub issues #11–#51). Each
slice is a narrow but complete path through every layer: contract, mock handler, service,
composable, UI and tests. Each one can be demonstrated on its own.

- **Explicit order.** Every issue names its blocker. The test harness is slice 1 and the
  design-token layer is slice 2, because retrofitting either after twenty components exist
  is an audit, not a feature. The reasoning is in [`docs/issues/README.md`](issues/README.md).
- **AFK vs HITL.** 38 slices were labelled AFK, meaning they could run unattended. Three were
  HITL (human in the loop), because they are my own judgement: this technical review, this
  document, and the final manual QA.
- **Stacked branches.** Each slice branches off its blocker's branch, and merges go from the
  bottom up.

### 3. From issues to code: guiding the implementation

**Project conventions as skills.**

- [`code-conventions`](../.claude/skills/code-conventions/SKILL.md) is the rulebook derived
  from [`architecture.md`](../architecture.md): layering, views vs features, list state in
  the URL, the mock API, naming, and the lint, type-check and test gate.
- [`worker-team-agent/project-context.md`](../.claude/skills/worker-team-agent/project-context.md)
  gives each agent role its domain and the things it must not touch.

**The path-rules hook.** [`.claude/hooks/path-rules-reminder.sh`](../.claude/hooks/path-rules-reminder.sh)
runs after every file write and injects the rules for that kind of file, once per session:

| When the agent writes… | It is reminded that… |
|---|---|
| `*.spec.ts` | tests assert user-visible behaviour, integration tests go through MSW and never mock services, and there are no sleeps |
| `src/mocks/*` | `openapi.yaml` is the source of truth, `schema.ts` is never hand-edited, and search, filter, sort and paging happen in the handler |
| `*.service.ts` | a service is a class plus a singleton, and never imports a store, a composable or a notification |
| `*.store.ts` | stores use setup syntax, never use orchestrating composables, and exist only for shared state |
| `composables/*` | check VueUse first, and composables may use stores and services |
| `src/views/*`, `src/router/*` | routes are named, navigation is by name, and the generated registry is never edited |
| `src/features/*` | a feature never imports another feature |
| `*.vue` | Element Plus first, Tailwind in the template, and no `as any` |

The hook reminds; it does not block. The actual enforcement is the lint, type-check and
test gates, plus review.

**The build loop.** [`worker-team-agent`](../.claude/skills/worker-team-agent/SKILL.md)
runs one slice through five phases:

1. **Build.** A feature team implements the slice.
2. **Review and debug, in parallel.** Reviewers look at security, architecture and
   end-to-end behaviour. Debuggers each start from a different hypothesis about what could
   be wrong.
3. **Triage.** Findings that contradict the project rules are rejected.
4. **Verify.** Vitest at the testing boundary the PRD names, then a browser pass through
   Playwright MCP.
5. **Record and hand over.** Lessons go into [`lessons-learned.md`](../.claude/skills/worker-team-agent/lessons-learned.md),
   then the loop pushes and opens a pull request.

The loop allows three fix iterations at most, and it never merges.

**Running it unattended.** [`ralph/`](../ralph/) runs the loop headless in Docker against a
fresh clone in its own volume. The host tree is never mounted.

- `afk.sh` picks the lowest-numbered actionable AFK issue.
- It stops on `TASK FAILED` or `NEEDS HUMAN`.
- It checks each result with [`checks.md`](../ralph/checks.md) (lint → type-check → tests)
  and [`e2e.md`](../ralph/e2e.md), which has eight browser scenarios: happy path,
  validation, forced API failure, loading state, URL state, authorisation, 375/1440 px in
  both themes, and a clean console.
- [`failure-modes.md`](../ralph/failure-modes.md) lists the ways the loop is known to go
  wrong, so the next run is warned about them.

### 4. Checking the output

A slice was only closed when all four of these held:

- Every gate passed.
- The browser check was actually performed, not skipped.
- The pull request was not labelled `needs-manual-qa`.
- I had reviewed and merged it.

The pre-commit and pre-push hooks and CI run the same commands again, so nothing that
passes locally fails later.

## Adapting the skills to this project

Most skills started from a generic template I use on other projects, and I adapted them:

- **The database migration became the OpenAPI contract.** The template's PRD skills treat a
  database migration as the shared file that parallel branches must not both edit. This
  project has no database. The equivalent shared file is
  [`src/mocks/openapi.yaml`](../src/mocks/openapi.yaml) together with the generated
  `schema.ts`, and conflicts in generated code are unreadable. `write-a-prd` gained an
  **API Contract Plan** section, which declares one consolidated contract change per PRD.
  `prd-to-issues` makes a dedicated contract slice the only one allowed to edit the spec,
  and everything else is blocked by it. The six contract slices are #13, #18, #25, #29, #31
  and #36.
- **`code-conventions` was rewritten** from this project's `architecture.md`, not copied.
- **Ralph was ported from another codebase** (`dd05885`) and then rebuilt for this one:
  - `a934565` moved it to plain `docker run` with a clone inside the container's own volume.
  - `32e3e3e` moved the browser check inside the container. Pointing at my dev server would
    have tested the wrong code.

Some leftovers from the template are still there and are listed at the end.

## Where the AI was wrong, and how it was caught

An account with no corrections in it would be an account nobody examined. These are the
significant ones.

### Bugs the gates caught

[`lessons-learned.md`](../.claude/skills/worker-team-agent/lessons-learned.md) has 20 dated
entries, each written by the loop when something went wrong. A selection:

| Slice | What was wrong | What caught it |
|---|---|---|
| #19 | The router was installed before the session was restored, so the guard ran on stale state | Only a live browser reload |
| #19 | A test agent ran `git stash drop` and silently lost the `RouteMeta` typings | A manual diff; every gate had passed |
| #23 | `setSort` could never return to "unsorted", and one test masked it | The multi-agent review |
| #26 | "Reset filters" did not clear the search | Only a live browser click; all gates were green |
| #27 | A double-submit race and a stale-response race in the form | Adversarial live debugging |
| #31 | `PATCH` with `eventId: ''` bypassed validation and corrupted the record | A direct HTTP reproduction; both static reviewers missed it |
| #36 | CSV formula injection | Only the security reviewer |
| #39 | The missing-CSS lesson from #16 happened again | The lesson itself: "reading a past lesson is not the same as running its check" |
| #42 | A hard-coded `600` ms broke the motion-tokens rule | Re-reading the acceptance criteria line by line; all three reviewers missed it |

Two patterns stand out:

- **The browser caught what the gates could not.** jsdom does not render CSS or evaluate
  media queries, and it never reloads a real page. That is why a browser pass was
  mandatory, not optional.
- **Reviewers are fallible too.** The #35 review reported "submit does nothing". It was a
  false positive, and was dismissed because it could not be reproduced independently.

### The loop itself needed correcting

- **The branching strategy changed three times.** It started adaptive (`25c6224`), then
  always branched from `main` and waited for merges (`2c23d09`), which allowed only one task
  per run. It went back to stacking in `fbe4270`.
- **A three-hour rabbit hole.** An agent spent nearly three hours trying to screenshot a
  loading skeleton that was too fast to capture (`e93c16b`). The fix was a documented
  latency control, and a failure mode written down so later runs stop earlier.
- **The loop flagged a problem it was not allowed to fix.** In slice #17 the agent noticed
  that the Docker image would ship without the mock API, and flagged it instead of fixing it
  outside its scope. The flag then waited five days. I only acted on it while preparing for
  submission, when a real `docker compose up` failed (`d08b130`). Scope discipline worked;
  following up on the flag did not.

### Cleanup I did afterwards

On 27 September I went through the output myself:

- **`2604e36`** stripped agent-written comment essays, issue and PRD references, and history
  narration from 175 files (−4,703 lines). Agents over-document. A comment should explain
  why, not what happened in slice #23.
- **`a6a1fe7`** replaced a sort-select workaround the agent had built for #30 with a plain
  "Created" column (−200 lines).
- **`493acc2`** debounced list requests and stopped a component remounting on every query
  change.
- **Review for the technical review.** While preparing `TECHNICAL_REVIEW.md` I had review
  agents read the code critically. I also walked every flow in a real browser against the
  Docker image. That turned up three defects that had all slipped past green tests:
  - A price with cents could not be saved. The browser's native number-step validation
    blocked the submit, and jsdom never runs it.
  - The events CSV export was empty. The test checked the file name instead of the rows.
  - Dates showed a day early west of UTC. The tests only ever ran in my own timezone.

  I fixed all three. Before each fix, I made sure the new test failed on the old code. The
  same walkthrough showed a squeezed seven-column table on tablets, which now render cards.

## Commit authorship

The history has two kinds of commits, and you can tell them apart:

- **Loop commits**, timestamped **+0000**: 52 commits made inside the Ralph container. These
  are every `feat(...)` slice commit and every `chore(process): record lessons…` commit. They
  carry no AI attribution, because the loop prompt I ported had a rule against revealing
  agent authorship. I kept that rule without questioning it, and I should not have.
  This document is the attribution: **all 52 +0000 commits, and the pull requests opened
  from the loop, were written by the agent.** I reviewed and merged each one.
- **Commits from my machine**, timestamped **+0300**: 31 commits from interactive sessions.
  These cover scaffolding, specs, fixes and cleanup. 20 of them carry a
  `Co-Authored-By: Claude` line. The rest are mine.

## What I did not delegate

- **The decisions.** Scope, architecture, trade-offs and the "rejected alternative" in every
  PRD. The AI asked the questions and wrote them down; the answers were mine.
- **Design.** The palette, typeface, density and motion timings (#12), and the subjective UI
  review (#51). The agent refused #12 as AFK work, correctly, and I answered on the issue.
- **Merging.** Every one of the 38 pull requests.
- **[`TECHNICAL_REVIEW.md`](../TECHNICAL_REVIEW.md) and this document.** The AI gathered
  facts from the code, the PRDs and the git history. The judgement is mine.

The principle is that the AI applies a decision well and consistently across forty files.
It should not be the one making the decision, and nothing merges without a human.

## Known leftovers

These are honest loose ends in the AI tooling, which I would clean up next:

- **Inherited migration wording.** `prd-to-issues` still mentions "parallel migrations" in
  one place. `worker-team-agent` still refers to `db:migration:generate`.
- **Inherited team roles.** `feature-team.md` still spawns the template's
  `schema-eng`/`backend-eng` roles. `project-context.md` defines this project's roles:
  contract, frontend, test and docs.
- **The `playwright` skill describes another project**: port 3000 and credentials read from
  `.env`. The `commit` skill is empty.
- **Drift inside `ralph/`.** `failure-modes.md` cites a `__mockChaos.reset()` that was
  removed from `e2e.md`, and two files cite "Hard Rule 8" although there are only seven.
- **No run logs.** The loop's logs were not kept (`ralph/.run/` is deleted on exit), so run
  counts and costs cannot be reconstructed. The durable record is the commits, the pull
  requests and `lessons-learned.md`.
