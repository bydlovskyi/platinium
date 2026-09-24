# Issue #51 — Final manual QA

| | |
|---|---|
| **GitHub issue** | [#51](https://github.com/bydlovskyi/platinum/issues/51) |
| **Parent PRD** | [#9](https://github.com/bydlovskyi/platinum/issues/9) · [`PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md) |
| **Type** | HITL |
| **Slice** | 41 of 41 |
| **Branch** | `feat/51-final-qa` |

```
Parent: #9
Parent branch: feat/50-ai-workflow-evidence
Branch: feat/51-final-qa
Blocked by: #50
```

## Parent PRD

#9 — [`docs/prd/PRD-009-documentation-and-delivery.md`](../prd/PRD-009-documentation-and-delivery.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

The clean-clone rehearsal of the entire reviewer journey. **This is the single
highest-value activity in PRD-009 and the one most likely to be skipped, because
everything obviously works on the machine that built it.**

A stale command, a missing environment file, a Docker build that only succeeds against a
warm cache — each is invisible locally and immediate to a reviewer.

Blocked by every other slice. HITL by definition: it is human verification of everything
that cannot be asserted in a test.

## Manual QA plan

**Cold start.** Clone into a fresh directory. `docker compose up`. Portal reachable on the
documented port with seeded data. Prune the Docker cache and rebuild; it still succeeds.

**Local setup.** `nvm use`, `npm install`, `cp .env.example .env`, `npm run dev`. No
network calls to any third party during install. `npm run build`, `npm run preview`,
`npm run test`, `npm run test:unit`, `npm run test:integration`, `npm run lint`,
`npm run type-check` — every command in the README, exactly as written.

**Authentication.** Sign in as administrator and as viewer with the documented
credentials. Wrong credentials show a clear message. Reload on a deep admin route stays
there. Sign out clears state. Force a 401 via chaos controls and confirm the redirect with
an explanation, then confirm return to the intended destination after signing in.

**Each entity — events, categories, tickets.** Create with a validation failure then a
success. Edit. Delete with confirmation. Attempt to delete a referenced event and a
referenced category; confirm the count and follow the link. Search, apply every filter,
combine filters, sort every sortable column, page through, change page size. Copy a
filtered URL into a new tab and confirm it reproduces the view. Reload mid-filter. Use the
back button through several filter changes. Edit a record and confirm return to the same
filtered page.

**Tickets specifically.** Open a ticket whose event is not on the first page of the picker
and confirm the selector shows it. Enter a price, save, reopen, confirm the exact amount.
Change currency and confirm the amount behaves correctly. Save a zero-quantity ticket.

**Dashboard.** Every figure matches the data. No cross-currency total exists. Every link
navigates to the correct filtered list.

**Bulk and export.** Select rows, change status, delete — including a referenced record —
and confirm the per-record report. Export each entity with filters applied; open the file
and confirm it matches the screen, including a value containing a comma or a quote.

**Permissions.** As viewer: write actions absent, direct edit URL refused, a forced write
request rejected by the API.

**States.** Empty database, filtered-with-no-matches, and forced API failure on each list.
Not-found route.

**Responsive and theme.** Every screen at 375px, 768px and 1440px in both themes. Mobile
drawer opens, traps focus, closes on navigate and on Escape. Toggle theme on every screen;
no unthemed element, no flash on reload.

**Visual judgement (moved from #44).** Walk every finished screen at desktop, tablet and
mobile widths in both themes and note what still reads as generated rather than designed —
spacing, density, card overuse, hover/zebra choice, icon consistency. Resolve each finding
or record why it stays. Open every Element Plus popper (`el-select`,
`el-dropdown`, `el-date-picker`, `el-tooltip`), an `ElMessageBox` confirm, an `el-dialog`
and an `ElNotification` in both themes; each is styled (its `theme-chalk` stylesheet is
registered) and follows the tokens.

**Accessibility.** Tab through login, a list and a form; focus visible throughout and
order sensible; keyboard works inside `el-select`, `el-dropdown`, `el-date-picker` and
`el-pagination`, and focus returns to the trigger when an `ElMessageBox`, `el-dialog` or
`el-drawer` closes. Enable reduced motion and confirm all animation is suppressed,
including Element Plus's own transitions.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Every section of the manual QA plan executed and the result recorded
- [ ] Executed from a clean clone in a fresh directory, not the development machine's working copy
- [ ] Docker verified against a pruned cache
- [ ] Every command in the README run exactly as written
- [ ] No Element Plus component renders unstyled on any screen, in either theme
- [ ] Any defect found is fixed and the affected section re-run
- [ ] Sign-off recorded in the issue with the environment and date
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #50 — *AI workflow evidence*

This slice's branch is created off `feat/50-ai-workflow-evidence` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/51-final-qa`

## User stories addressed

Referenced by number from the parent PRD:

- Covers every user story across PRD-001 through PRD-010 that requires human verification
