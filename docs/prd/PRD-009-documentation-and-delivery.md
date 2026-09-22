# PRD-009 — Documentation & Delivery

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001 … PRD-008 |
| **Blocks** | — (final) |

## Problem Statement

The assessment names two documents as explicit deliverables with prescribed contents,
and adds a third requirement that is easy to overlook: evidence of how AI was used
during development.

Those documents are not a write-up added at the end. They are how the work gets
assessed. A reviewer has limited time; what they read first is the README, and what they
form a judgement from is `TECHNICAL_REVIEW.md`. An implementation that is excellent and
undocumented will be scored as an implementation that is undocumented.

Three specific risks make this a PRD rather than a checklist item.

**Documentation written from memory is wrong.** Commands that were renamed, a port that
changed, a structure that evolved — every inaccuracy a reviewer hits personally costs
more credibility than the thing it described was worth. A documented command that fails
on a clean clone is the worst possible first impression.

**The technical review asks for judgement, not description.** It asks what would be
improved with two more days, what debt was accepted deliberately, what would be
refactored first, and how the application scales to hundreds of thousands of tickets
with multiple concurrent administrators. Those answers cannot be reconstructed at the
end. They were made as decisions in PRD-001 through PRD-008 — integer minor units,
server-side query semantics, offset pagination, `localStorage` tokens, no optimistic
updates, no Playwright — and each of those PRDs already records its reasoning. This PRD
consolidates them; it does not invent them.

**The AI evidence requirement rewards showing the process.** The assessment states it
explicitly: they want to see how context was provided, how requirements were defined,
how implementation was guided and how results were validated. A repository that merely
mentions AI was used answers none of that. This one has the artefacts — nine PRDs,
their issue breakdowns, the project-specific skills and conventions, the path-rules
hook — and they need to be presented as a workflow rather than left as files in a
directory.

## Solution

**A README that is verified rather than written.** Every command in it is executed from
a clean clone before it is documented. Every path in the structure section is confirmed
to exist. The Docker instructions are run against a pruned Docker environment, not
against the machine that built the image.

Its ordering follows a reviewer's path: what this is and what it does, how to run it in
two minutes, credentials, then commands, then structure, then architecture, then the
decisions and trade-offs. Screenshots of the dashboard, a list and a form, in both
themes, because a reviewer forms an impression before reading anything.

**A technical review that argues rather than lists.** Each required section answered
directly, with the reasoning that was recorded when the decision was made. The scale
question gets a concrete treatment — where offset pagination breaks and what cursor
pagination changes, what a hundred-thousand-row table needs in the client, what caching
and invalidation would look like, and what happens when two administrators edit the same
record — rather than a list of technologies.

The debt section names what was accepted and why, with enough specificity that a
reviewer can check it: token in `localStorage` instead of an httpOnly cookie, no
optimistic updates, no Playwright layer, free status transitions, no timezone handling,
no cross-currency aggregation. Each with the condition that would change the answer.

**AI workflow shown as an artefact trail.** A document walking through how this project
was actually built: requirements to PRDs, PRDs to vertical-slice issues, issues to
implementation under project-specific conventions, and validation through review skills
and the test suite. It points at the real files — the PRDs, the issue specs, the skills,
the hook — because the artefacts are the evidence and prose about them is not.

**A repository that is ready to be read.** The final pass: architecture document
reconciled with what was built, no dead code, no placeholder examples from the template,
`.env.example` accurate, and a clean-clone rehearsal of the whole reviewer journey.

## User Stories

1. As an evaluator, I want to understand what this application does within thirty
   seconds of opening the README, so that I can orient myself.
2. As an evaluator, I want screenshots near the top, so that I can see the result before
   reading about it.
3. As an evaluator, I want screenshots in both themes and at mobile width, so that I can
   see the responsive and dark-mode work without running anything.
4. As an evaluator, I want the fastest path to a running application stated first, so
   that I can start it while I read.
5. As an evaluator, I want to run the application with one Docker command, so that I do
   not need a matching Node version.
6. As an evaluator, I want the local installation path documented too, so that I can run
   the tests.
7. As an evaluator, I want the required Node version stated, so that I do not debug a
   version mismatch.
8. As an evaluator, I want the login credentials in the README, so that I am not locked
   out of the thing I am assessing.
9. As an evaluator, I want credentials for both roles, so that I can verify the
   permission model.
10. As an evaluator, I want every command listed with a description, so that I know what
    is available.
11. As an evaluator, I want to know how to run unit and integration tests separately, so
    that I can see both deliverables.
12. As an evaluator, I want every documented command to work on a clean clone, so that I
    trust the rest of the document.
13. As an evaluator, I want the project structure explained with the purpose of each
    directory, so that I can navigate the source.
14. As an evaluator, I want the architecture explained with its dependency rules, so that
    I can judge the design rather than reverse-engineer it.
15. As an evaluator, I want to know the mock API is in-browser and where its contract
    lives, so that I understand what I am looking at.
16. As an evaluator, I want the technology choices justified, so that I can see they were
    decisions.
17. As an evaluator, I want assumptions stated, so that I do not mistake a deliberate
    boundary for an oversight.
18. As an evaluator, I want trade-offs stated, so that I can assess the judgement rather
    than only the output.
19. As an evaluator, I want to know how to reset the demo data, so that I can start a
    clean walkthrough.
20. As an evaluator, I want to know how to trigger an API failure, so that I can verify
    the error handling rather than take it on trust.
21. As an evaluator, I want the main architectural decisions explained with their
    alternatives, so that I can see what was considered and rejected.
22. As an evaluator, I want to know what two more days would buy, so that I can judge the
    author's sense of priority.
23. As an evaluator, I want the intentionally accepted debt listed, so that I can
    distinguish a decision from an oversight.
24. As an evaluator, I want each piece of debt to state what would change the answer, so
    that I can see the thinking is conditional rather than dogmatic.
25. As an evaluator, I want to know what would be refactored first and why, so that I can
    see the author is critical of their own work.
26. As an evaluator, I want a concrete scaling analysis for hundreds of thousands of
    tickets, so that I can assess depth rather than vocabulary.
27. As an evaluator, I want to know where offset pagination breaks and what replaces it,
    so that the answer is specific.
28. As an evaluator, I want concurrent-administrator conflicts addressed, so that I can
    see multi-user thinking.
29. As an evaluator, I want a caching and invalidation strategy discussed, so that I can
    see data-freshness was considered.
30. As an evaluator, I want the coding standards and quality gates a team would need
    described, so that I can see the author thinks beyond their own workflow.
31. As an evaluator, I want to understand how AI fits into the daily workflow on this
    project, so that I can assess the working method the role requires.
32. As an evaluator, I want to see the actual artefacts of the AI process, so that the
    claim is evidenced rather than asserted.
33. As an evaluator, I want to see how requirements were turned into specifications, so
    that I can judge how context was provided.
34. As an evaluator, I want to see how AI output was validated, so that I can judge
    whether it was reviewed or accepted.
35. As an evaluator, I want the repository free of template placeholders and dead code,
    so that I can see care in the final state.
36. As an evaluator, I want the architecture document to match what was built, so that I
    am not misled by an inherited file.
37. As an evaluator, I want a documented list of what was not built and why, so that I
    can distinguish scope from incompleteness.

## Implementation Decisions

### README

Ordered for a reviewer's path, not for a table of contents: overview and screenshots;
quick start via Docker; credentials for both roles; local installation; commands grouped
by purpose; project structure; architecture overview with the dependency rules; mock API
explanation including how to reset data and force failures; technical decisions;
assumptions and trade-offs; and a short pointer to the AI workflow document.

Every command is executed from a fresh clone before it is written down. Every structure
path is verified to exist. The Docker section is verified against a pruned Docker
environment so that a cached layer cannot hide a broken build.

Credentials for both roles are prominent. A reviewer who cannot sign in stops
evaluating.

### TECHNICAL_REVIEW.md

The seven required sections, each answered from the reasoning already recorded in
PRD-001 through PRD-008 rather than reconstructed.

**Architectural decisions** — the local OpenAPI contract as the single source of truth;
in-browser MSW with server-side query semantics; URL-driven list state; integer minor
units for money; the layered service/store/composable direction and why it is enforced;
one configurable table rather than three.

**Two more days** — a ranked list with the reasoning for the ranking, drawn from what
each PRD deferred. Ranking is the point; an unordered wish list demonstrates nothing.

**Accepted debt** — each item with what was accepted, why it was reasonable here, what
it would cost in production, and the condition that would change the answer. The token
in `localStorage`, no optimistic updates, no Playwright, free status transitions,
timezone-naive dates, no cross-currency aggregation, page-scoped selection, no request
caching layer.

**First refactors** — identified honestly from the implementation as built, not
predicted from the plan. Written last, after the code exists.

**Scaling** — the substantial section. Where offset pagination breaks and what cursor
pagination changes for the UI; virtualised rendering for large tables; server-side
aggregation for the dashboard, already the case here; a caching and invalidation
strategy and why a query-cache layer would be introduced; optimistic concurrency for
simultaneous edits, and what the conflict UI looks like; bundle splitting per route;
and what moves to the server when the mock is replaced.

**Team standards** — what would be introduced beyond what exists: conventional commits
and a changelog, pull-request templates and review checklists, the ESLint rules that
encode this project's layering rules mechanically, dependency and security scanning, a
definition of done, and an architecture decision record practice. Grounded in this
repository's gates rather than a generic list.

**AI in the workflow** — how it was used here and how it would be used daily on this
project: written specifications before implementation, project-specific conventions as
enforceable skills, path-triggered rule reminders, review passes as a gate rather than a
formality, and the boundary of what should not be delegated. Cross-references the
workflow document rather than duplicating it.

### AI workflow evidence

A document walking the trail the repository already contains: the assessment brief
turned into scoped questions and answers, those answers turned into nine PRDs, PRDs
turned into vertical-slice issues with an explicit dependency order, implementation
guided by project-specific conventions and a path-rules hook, and validation through
review skills and the test suite.

It points at the real artefacts — `docs/prd/`, `docs/issues/`, `.claude/skills/`,
`.claude/hooks/` — and explains the specific adaptations made for this project, such as
replacing the inherited database-migration concept in the PRD skills with the OpenAPI
contract, which is this project's equivalent shared bottleneck file. A concrete
adaptation demonstrates understanding; a claim of AI usage does not.

It is also honest about where AI output was wrong or had to be redirected. An account
with no corrections in it reads as an account that was not examined.

### Repository final pass

The inherited `architecture.md` is reconciled with what was built — every rule it states
must be true of the code, and every pattern the code relies on must appear in it.
Template placeholder code from the original skeleton is removed. Dead code, unused
dependencies and stale comments are removed. `.env.example` is verified against what the
application actually reads. Screenshots are captured from a seeded build at desktop and
mobile widths in both themes.

Finally, the complete reviewer journey is rehearsed from a clean clone in a fresh
directory: clone, Docker up, sign in as both roles, exercise each entity, run the local
installation, run both test suites, run the build. Anything that does not work is fixed
before this PRD closes.

## API Contract Plan

None. This PRD introduces no endpoint, parameter or schema component.

## Out of Scope

- Deployment to a hosting platform and a live demo URL. The assessment asks for a
  repository.
- API reference documentation generated from the OpenAPI document. The specification is
  readable and is the source of truth; a generated site adds a build step for no
  reviewer benefit.
- A component library or Storybook.
- Video walkthroughs and recorded demonstrations.
- Contribution guidelines, a code of conduct and issue templates. This is an assessment
  repository, not an open-source project.
- Translating documentation. English only.
- A changelog. The commit history is the record.

## Further Notes

The sequencing risk here is the same one that makes documentation unreliable everywhere:
written before the implementation settles, it describes an intention rather than a
result. The first-refactors section in particular is worthless if written from the plan
— it is only credible once the code exists and can be looked at critically.

The clean-clone rehearsal is the single highest-value activity in this PRD and the one
most likely to be skipped because everything obviously works on the machine that built
it. A stale command, a missing environment file, a Docker build that only succeeds
against a warm cache — each is invisible locally and immediate to a reviewer. It should
be an explicit acceptance criterion with a witness, not a habit.

The AI evidence requirement is one the assessment states outright and that most
submissions will answer with a sentence. This repository can answer it with nine
specifications, their issue breakdowns, adapted skills and a working hook. That material
already exists as a by-product of how the work was done; presenting it coherently is the
remaining step, and it is cheap relative to what it demonstrates.
