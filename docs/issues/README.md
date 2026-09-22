# Issue Breakdown

41 vertical slices produced from the ten PRDs in [`../prd/`](../prd/) with the
[`prd-to-issues`](../../.claude/skills/prd-to-issues/SKILL.md) skill. Each file mirrors a
live GitHub issue in [bydlovskyi/platinum](https://github.com/bydlovskyi/platinum/issues);
the PRDs themselves are issues #1–#10.

Every slice is a **tracer bullet**: a narrow but complete path through every layer —
contract, mock handler, service, store or composable, UI, tests — that is demoable on its
own. A slice is not complete without the tests its parent PRD declared for it.

## Branching model

A single **linear cascade-stack**. `Blocked by: #X` means this slice's branch is created
off `feat/<X>-<slug>` and its PR targets that branch, producing a stacked PR. Work starts
immediately — no waiting for the blocker to merge.

- Never `git merge main` into a chain branch. Only `git rebase` onto the direct parent.
- Never merge sibling branches into each other.
- At most one direct child per parent. Two issues with the same `Blocked by` is a Y-fork
  and must be serialised.
- Only a slice labelled `contract` may edit `src/mocks/openapi.yaml` or commit a
  regenerated `schema.ts`. This is what prevents unreadable conflicts in the generated
  file when sibling branches each regenerate against a different spec.
- **Merge order is bottom-up:** deepest child first, then its parent, down to the
  foundation.

## Execution order

Two orderings are deliberate and worth reading before picking up work:

- **The test harness is slice 1.** Every slice lists tests in its acceptance criteria. A
  runner that arrives late means those tests are deferred and then written against code
  that was never shaped for them.
- **The design token layer is slice 2.** Retrofitting a type scale or a dark palette after
  twenty components exist is an audit, not a feature. The design *polish* slices (31–35)
  correctly come near the end, once there are screens to polish.

## Slices

| Issue | Title | PRD | Type | Blocked by |
|---|---|---|---|---|
| [#11](https://github.com/bydlovskyi/platinum/issues/11) | [Test harness & quality gates](011-test-harness.md) | [008](../prd/PRD-008-testing-strategy-and-quality-gates.md) | AFK | — foundation |
| [#12](https://github.com/bydlovskyi/platinum/issues/12) | [Design system foundation — tokens, typography, dark palette, motion](012-design-system-foundation.md) | [010](../prd/PRD-010-visual-design-system-and-interface-polish.md) | AFK | #11 |
| [#13](https://github.com/bydlovskyi/platinum/issues/13) | [API contract foundation — local OpenAPI spec, offline generation, type helpers](013-api-contract-foundation.md) | [001](../prd/PRD-001-platform-foundation.md) | AFK | #12 |
| [#14](https://github.com/bydlovskyi/platinum/issues/14) | [Mock database — query engine and seed fixtures](014-mock-database.md) | [001](../prd/PRD-001-platform-foundation.md) | AFK | #13 |
| [#15](https://github.com/bydlovskyi/platinum/issues/15) | [MSW mock backend — browser worker, node server, handler factory, chaos controls](015-msw-mock-backend.md) | [001](../prd/PRD-001-platform-foundation.md) | AFK | #14 |
| [#16](https://github.com/bydlovskyi/platinum/issues/16) | [Error handling — response interceptor and notification service](016-error-handling.md) | [001](../prd/PRD-001-platform-foundation.md) | AFK | #15 |
| [#17](https://github.com/bydlovskyi/platinum/issues/17) | [Docker — multi-stage build, nginx SPA config, compose](017-docker.md) | [001](../prd/PRD-001-platform-foundation.md) | AFK | #16 |
| [#18](https://github.com/bydlovskyi/platinum/issues/18) | [Auth contract — login, logout, session endpoints](018-auth-contract.md) | [002](../prd/PRD-002-authentication-and-admin-shell.md) | AFK | #17 |
| [#19](https://github.com/bydlovskyi/platinum/issues/19) | [Session and login — auth store, bootstrap, route guard, login screen](019-session-and-login.md) | [002](../prd/PRD-002-authentication-and-admin-shell.md) | AFK | #18 |
| [#20](https://github.com/bydlovskyi/platinum/issues/20) | [Admin shell — layouts, navigation, page header, responsive drawer, theme toggle](020-admin-shell.md) | [002](../prd/PRD-002-authentication-and-admin-shell.md) | AFK | #19 |
| [#21](https://github.com/bydlovskyi/platinum/issues/21) | [List query composable — URL-driven list state](021-list-query-composable.md) | [003](../prd/PRD-003-data-table-and-list-experience.md) | AFK | #20 |
| [#22](https://github.com/bydlovskyi/platinum/issues/22) | [List resource composable — fetching, abort, error recovery](022-list-resource-composable.md) | [003](../prd/PRD-003-data-table-and-list-experience.md) | AFK | #21 |
| [#23](https://github.com/bydlovskyi/platinum/issues/23) | [Data table — descriptor-driven, responsive, async states](023-data-table.md) | [003](../prd/PRD-003-data-table-and-list-experience.md) | AFK | #22 |
| [#24](https://github.com/bydlovskyi/platinum/issues/24) | [List toolbar, pagination, confirmation, status tag, formatters](024-list-support-components.md) | [003](../prd/PRD-003-data-table-and-list-experience.md) | AFK | #23 |
| [#25](https://github.com/bydlovskyi/platinum/issues/25) | [Events contract — endpoints, filters, dependency conflict](025-events-contract.md) | [004](../prd/PRD-004-events-management.md) | AFK | #24 |
| [#26](https://github.com/bydlovskyi/platinum/issues/26) | [Events list — columns, filters, sorting, pagination](026-events-list.md) | [004](../prd/PRD-004-events-management.md) | AFK | #25 |
| [#27](https://github.com/bydlovskyi/platinum/issues/27) | [Events form — create, edit, date-range validation, unsaved-changes guard](027-events-form.md) | [004](../prd/PRD-004-events-management.md) | AFK | #26 |
| [#28](https://github.com/bydlovskyi/platinum/issues/28) | [Events deletion — confirmation and dependency-conflict handling](028-events-deletion.md) | [004](../prd/PRD-004-events-management.md) | AFK | #27 |
| [#29](https://github.com/bydlovskyi/platinum/issues/29) | [Categories contract — endpoints and name uniqueness](029-categories-contract.md) | [005](../prd/PRD-005-ticket-categories-management.md) | AFK | #28 |
| [#30](https://github.com/bydlovskyi/platinum/issues/30) | [Categories — list, modal CRUD, uniqueness handling, deletion](030-categories-crud.md) | [005](../prd/PRD-005-ticket-categories-management.md) | AFK | #29 |
| [#31](https://github.com/bydlovskyi/platinum/issues/31) | [Tickets contract — endpoints, cross-entity filters, denormalised names](031-tickets-contract.md) | [006](../prd/PRD-006-tickets-management.md) | AFK | #30 |
| [#32](https://github.com/bydlovskyi/platinum/issues/32) | [Currency input — the single minor-unit boundary](032-currency-input.md) | [006](../prd/PRD-006-tickets-management.md) | AFK | #31 |
| [#33](https://github.com/bydlovskyi/platinum/issues/33) | [Remote select — paginated, searchable, preselected-value resolution](033-remote-select.md) | [006](../prd/PRD-006-tickets-management.md) | AFK | #32 |
| [#34](https://github.com/bydlovskyi/platinum/issues/34) | [Tickets list — cross-entity filters, deep-link entry, deletion](034-tickets-list.md) | [006](../prd/PRD-006-tickets-management.md) | AFK | #33 |
| [#35](https://github.com/bydlovskyi/platinum/issues/35) | [Tickets form — create and edit](035-tickets-form.md) | [006](../prd/PRD-006-tickets-management.md) | AFK | #34 |
| [#36](https://github.com/bydlovskyi/platinum/issues/36) | [PRD-007 contract — dashboard stats, bulk endpoints, CSV param, viewer role](036-prd007-contract.md) | [007](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) | AFK | #35 |
| [#37](https://github.com/bydlovskyi/platinum/issues/37) | [Role-based permissions — capability composable, guard, UI gating, 403 handling](037-permissions.md) | [007](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) | AFK | #36 |
| [#38](https://github.com/bydlovskyi/platinum/issues/38) | [Dashboard screen](038-dashboard.md) | [007](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) | AFK | #37 |
| [#39](https://github.com/bydlovskyi/platinum/issues/39) | [Bulk operations](039-bulk-operations.md) | [007](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) | AFK | #38 |
| [#40](https://github.com/bydlovskyi/platinum/issues/40) | [CSV export](040-csv-export.md) | [007](../prd/PRD-007-dashboard-statistics-and-bulk-operations.md) | AFK | #39 |
| [#41](https://github.com/bydlovskyi/platinum/issues/41) | [Designed empty, loading and error states](041-designed-states.md) | [010](../prd/PRD-010-visual-design-system-and-interface-polish.md) | AFK | #40 |
| [#42](https://github.com/bydlovskyi/platinum/issues/42) | [Motion and micro-interactions](042-motion.md) | [010](../prd/PRD-010-visual-design-system-and-interface-polish.md) | AFK | #41 |
| [#43](https://github.com/bydlovskyi/platinum/issues/43) | [Dashboard visual design](043-dashboard-design.md) | [010](../prd/PRD-010-visual-design-system-and-interface-polish.md) | AFK | #42 |
| [#44](https://github.com/bydlovskyi/platinum/issues/44) | [Iconography, density and responsive refinement](044-polish-pass.md) | [010](../prd/PRD-010-visual-design-system-and-interface-polish.md) | AFK | #43 |
| [#45](https://github.com/bydlovskyi/platinum/issues/45) | [Design system documentation](045-design-system-docs.md) | [010](../prd/PRD-010-visual-design-system-and-interface-polish.md) | AFK | #44 |
| [#46](https://github.com/bydlovskyi/platinum/issues/46) | [Test gap review](046-test-gap-review.md) | [008](../prd/PRD-008-testing-strategy-and-quality-gates.md) | AFK | #45 |
| [#47](https://github.com/bydlovskyi/platinum/issues/47) | [Repository final pass and screenshots](047-repo-final-pass.md) | [009](../prd/PRD-009-documentation-and-delivery.md) | AFK | #46 |
| [#48](https://github.com/bydlovskyi/platinum/issues/48) | [README](048-readme.md) | [009](../prd/PRD-009-documentation-and-delivery.md) | AFK | #47 |
| [#49](https://github.com/bydlovskyi/platinum/issues/49) | [TECHNICAL_REVIEW.md](049-technical-review.md) | [009](../prd/PRD-009-documentation-and-delivery.md) | HITL | #48 |
| [#50](https://github.com/bydlovskyi/platinum/issues/50) | [AI workflow evidence](050-ai-workflow-evidence.md) | [009](../prd/PRD-009-documentation-and-delivery.md) | HITL | #49 |
| [#51](https://github.com/bydlovskyi/platinum/issues/51) | [Final manual QA](051-final-qa.md) | [009](../prd/PRD-009-documentation-and-delivery.md) | HITL | #50 |

## Types

- **AFK** — implementable and mergeable without human interaction.
- **HITL** — requires a human: the author's own engineering judgement (#49, #50) or
  manual verification (#51). The design slices (#12, #44) were HITL until the palette,
  typeface, density and motion were decided; those choices are recorded on issue #12.
