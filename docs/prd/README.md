# Product Requirement Documents

Ten PRDs covering the Ticket Management Admin Portal. Each was produced with the
[`write-a-prd`](../../.claude/skills/write-a-prd/SKILL.md) skill and broken into
vertical-slice issues with [`prd-to-issues`](../../.claude/skills/prd-to-issues/SKILL.md).
The issue breakdowns live in [`../issues/`](../issues/).

## Reading order

| # | PRD | Delivers | Depends on |
|---|---|---|---|
| 001 | [Platform Foundation](PRD-001-platform-foundation.md) | Local OpenAPI contract, MSW mock backend with server-side query semantics, in-memory DB, error handling, notifications, Docker | — |
| 002 | [Authentication & Admin Shell](PRD-002-authentication-and-admin-shell.md) | Login, mocked session, route guards, responsive shell, dark mode | 001 |
| 003 | [Data Table & List Experience](PRD-003-data-table-and-list-experience.md) | URL-driven list state, configurable data table, async states, confirmations | 001, 002 |
| 004 | [Events Management](PRD-004-events-management.md) | Event CRUD, date-range validation, referential-integrity on delete | 001–003 |
| 005 | [Ticket Categories Management](PRD-005-ticket-categories-management.md) | Category CRUD in dialogs, name uniqueness | 001–003 |
| 006 | [Tickets Management](PRD-006-tickets-management.md) | Ticket CRUD, money as minor units, paginated remote selects, cross-entity filtering | 001–005 |
| 007 | [Dashboard, Bulk Ops & Permissions](PRD-007-dashboard-statistics-and-bulk-operations.md) | Aggregate dashboard, bulk operations, CSV export, role-based permissions | 001–006 |
| 008 | [Testing Strategy & Quality Gates](PRD-008-testing-strategy-and-quality-gates.md) | Vitest harness, test kit, CI, hooks, the strategy itself | 001 (harness), 002–007 (suites) |
| 009 | [Documentation & Delivery](PRD-009-documentation-and-delivery.md) | README, TECHNICAL_REVIEW, AI workflow evidence, clean-clone rehearsal | 001–008, 010 |
| 010 | [Visual Design System & Polish](PRD-010-visual-design-system-and-interface-polish.md) | Design tokens, typography, dark palette, motion, designed states, dashboard presentation | 002 (foundation), 003–007 (polish) |

## Execution note

**Two PRDs do not execute in numbered order, and both splits are deliberate.**

**PRD-008 (testing).** Its *harness* half blocks PRD-001 — a test runner has to exist
before any PRD can satisfy its own acceptance criteria. Its *suites* half is written
inside each feature PRD's own slices; a slice is not complete without its tests. Only
the closing gap review runs at the end.

**PRD-010 (design).** Its *foundation* half — the token layer — blocks every feature
PRD, because retrofitting a type scale or a dark palette after twenty components exist
is an audit rather than a feature. Its *polish* half depends on all of them, because
there is nothing to polish until the screens exist.

The issue graph in [`../issues/`](../issues/) reflects both orderings.

## Cross-cutting decisions

Decisions made once and relied on everywhere. Changing any of them touches several PRDs.

- **The OpenAPI document is the single source of truth.** Types are generated from it
  offline. Only a PRD's dedicated contract slice may edit it.
- **The mock implements server-side semantics.** Search, filtering, sorting and
  pagination are computed by the handler. The UI never receives a full dataset.
- **List state lives in the URL.** Filtered views are shareable, survive a reload and
  behave correctly with the back button.
- **Money is an integer in minor units,** everywhere except one input component.
- **No value is ever summed across currencies.**
- **Layer direction is one-way:** composable → store → service → apiClient.
- **A store exists only when state is genuinely shared.** No entity PRD creates one.
- **Deletion of a referenced record is refused** with the blocking count, never cascaded.
- **Every colour, size and spacing value comes from a semantic token** with a light and
  a dark value. No component holds a literal colour.
- **Status is never encoded by colour alone,** and all motion respects the
  reduced-motion preference.
