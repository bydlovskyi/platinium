# PRD-005 — Ticket Categories Management

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001, PRD-002, PRD-003 |
| **Blocks** | PRD-006 (tickets reference categories) |

## Problem Statement

A ticket needs a category — General Admission, VIP, Early Bird, Press — and today there
is nowhere to define one. Without categories, the ticket form in PRD-006 has no
controlled vocabulary to offer and administrators would end up typing a category name
into a free-text field, producing "VIP", "vip" and "V.I.P." in the same dataset.

Categories are deliberately the simplest entity in the domain: a name and a
description. That simplicity is the point of scheduling them here. Events exercised
the hard paths — cross-field validation, controlled reference data, referential
integrity on delete. Categories exercise a different question: **does the shared
machinery built in PRD-003 and PRD-004 actually make a simple entity cheap?**

If a two-field entity still needs a bespoke list implementation, a bespoke form and a
bespoke delete flow, the abstractions are shallow and the portal will not scale to a
fourth or fifth entity. This PRD is the test of that, and it should be visibly small.

There is one substantive decision it cannot avoid: category names must be unique.
Nothing in the platform enforces uniqueness yet, and a duplicate-name conflict is a
different failure mode from a field-validation error — it is discovered by the server,
not by the client.

## Solution

Deliver complete category management as a thin composition of existing parts.

**A list built entirely from descriptors.** Search across name and description, sort by
name or creation date, paginate — `AppDataTable` (`el-table`, `sortable="custom"`), a
`ListToolbar` holding only the `el-input` search, and `el-pagination`. No filters —
there is no attribute worth filtering on, and inventing one to fill the toolbar would be
worse than leaving it out.

**A modal form rather than a route.** The form is an `el-form` inside an `el-dialog`.
Two short text fields do not justify a page
transition, and an administrator defining a set of categories is doing repetitive work
where a dialog keeps them in context on the list. This is a considered divergence from
PRD-004, not an inconsistency: the form pattern follows the size of the form. The
project's modal infrastructure — auto-registered `*Modal.vue` components opened through
the modals composable — already exists and has not been exercised by a real feature.

**Uniqueness enforced by the contract.** The mock rejects a duplicate name with a
conflict, and the portal attaches that message to the name field — `el-form-item
:error` — rather than showing a generic toast. A server-discovered error that lands on the responsible input is the
behaviour that separates a considered form from a naive one.

**Deletion guarded like events.** A category referenced by tickets cannot be removed;
the conflict names the count and links to those tickets. The same mechanism built in
PRD-004 — `ElMessageBox.confirm` through `useConfirm`, conflict feedback through the
notification service — reused unchanged.

## User Stories

1. As an administrator, I want a list of all ticket categories, so that I can see the
   vocabulary available to tickets.
2. As an administrator, I want to see each category's name and description together, so
   that I can tell similar ones apart.
3. As an administrator, I want to search categories by name or description, so that I
   can find one quickly.
4. As an administrator, I want to sort categories by name, so that I can scan them
   alphabetically.
5. As an administrator, I want to sort by creation date, so that I can see what was
   added recently.
6. As an administrator, I want the list paginated with a total count, so that I know how
   many categories exist.
7. As an administrator, I want to create a category from the list, so that I can add one
   without leaving the page.
8. As an administrator, I want the create form in a dialog, so that I can add several
   categories in a row without page transitions.
9. As an administrator, I want to enter a name and a description, so that the category
   is understandable to a colleague.
10. As an administrator, I want the name to be required, so that I cannot create an
    unnamed category.
11. As an administrator, I want a maximum length on the name with a clear message, so
    that it stays readable in a list and in a select.
12. As an administrator, I want a maximum length on the description with a live
    character counter, so that I know how much room I have left.
13. As an administrator, I want the description to be optional, so that an obvious
    category does not force me to invent prose.
14. As an administrator, I want to be told when a category name already exists, so that
    I do not create a duplicate.
15. As an administrator, I want the duplicate-name message attached to the name field,
    so that I can see exactly what to change.
16. As an administrator, I want the first field focused when the dialog opens, so that I
    can start typing immediately.
17. As an administrator, I want to submit the dialog with the keyboard, so that adding
    several categories is fast.
18. As an administrator, I want the submit button to show progress and prevent a second
    click, so that I do not create a duplicate by double-clicking.
19. As an administrator, I want a success confirmation after saving, so that I know it
    worked.
20. As an administrator, I want the list to refresh after saving, so that I see my new
    category without reloading.
21. As an administrator, I want my current page and search preserved after saving, so
    that I do not lose my place.
22. As an administrator, I want to edit an existing category, so that I can correct a
    name or improve a description.
23. As an administrator, I want the edit dialog pre-filled with the current values, so
    that I only change what I mean to.
24. As an administrator, I want to be asked before closing a dialog with unsaved
    changes, so that a stray click does not discard my work.
25. As an administrator, I want to close the dialog with Escape when it is clean, so
    that dismissing it is quick.
26. As an administrator, I want a clear message when I open a category that no longer
    exists, so that I am not shown an empty form.
27. As an administrator, I want to delete a category I no longer use, so that the
    vocabulary stays meaningful.
28. As an administrator, I want deletion confirmed with the category's name, so that I
    do not remove the wrong one.
29. As an administrator, I want to be prevented from deleting a category that still has
    tickets, so that I do not orphan them.
30. As an administrator, I want to be told how many tickets block the deletion and to be
    able to open them, so that I can resolve it.
31. As an administrator using a phone, I want the category list as readable cards and
    the dialog full-width, so that I can manage categories away from my desk.
32. As a keyboard user, I want focus trapped in the dialog and returned to the trigger
    when it closes, so that I do not lose my position in the list.

## Implementation Decisions

### View structure

A single categories view with one route: the list. Create and edit are modal states
layered over it, not routes — an `el-dialog` opened through the modals registry. The
category form is one component used for both, differing only in whether it receives an
existing record.

The categories service exposes the five CRUD operations. No store — category state is
not shared outside this view. PRD-006 needs categories for its ticket form and obtains
them through its own lookup call, exactly as it does for events.

### Modal versus route

PRD-004 chose a route; this PRD chooses a modal. The rule, recorded so the portal stays
coherent rather than arbitrary: **a form with more than three fields, any cross-field
constraint, or any field that is itself a complex control gets a route; anything
smaller gets an `el-dialog`.** Events have seven fields and two `el-date-picker`s.
Categories have two `el-input`s.

This also exercises the project's modal infrastructure with a real feature, which is
otherwise only demonstrated by a placeholder.

### Uniqueness

Name uniqueness is case-insensitive and whitespace-trimmed, enforced in the mock
handler. Comparing raw strings would let "VIP " and "vip" coexist, which defeats the
purpose.

The client does not pre-check uniqueness with a lookup request. A check-then-write is a
race even against a mock, it doubles the request count, and the server has to enforce it
regardless. The conflict response is the mechanism; the client's job is to render it on
the right field, through the name `el-form-item`'s `:error` prop.

### Deletion

Identical to PRD-004: the mock returns a conflict carrying the dependent ticket count,
and the portal renders an actionable message linking to the tickets list filtered by
that category. Cascade deletion is rejected for the same reason.

### Component library

Every control in this PRD is an Element Plus component, per
[`ELEMENT-PLUS.md`](./ELEMENT-PLUS.md). Shared portal components wrap and configure
Element Plus; they do not replace it. No raw `<button>`, `<input>`, `<textarea>` or
`<table>` appears in the categories view, and any Element Plus component adopted for the
first time here has its `theme-chalk` stylesheet imported in
`src/assets/styles/element-reset/components/index.css` (`importStyle: false`).

- **List** — `AppDataTable` (`el-table` + two `el-table-column`s, `sortable="custom"` on
  name and creation date, `el-skeleton`, `v-loading`, `el-empty` in `#empty`, `el-card`
  rows below tablet, `el-dropdown` row actions); `ListToolbar` with only the
  `el-input clearable` search; `el-pagination`; the shared `PageHeader` with an
  `el-button type="primary"` create action.
- **Modal** — `el-dialog` via the modals registry, `:fullscreen` below tablet,
  `destroy-on-close`, `:before-close` wired to the unsaved-changes composable so Escape,
  the close icon and a mask click on a dirty form prompt through `ElMessageBox.confirm`.
  Focus trap and return to the trigger come from `el-dialog`.
- **Form** — `el-form :model :rules label-position="top"` submitted on Enter;
  name `el-input maxlength show-word-limit` with `el-form-item :error` for the 409;
  description `el-input type="textarea" autosize maxlength show-word-limit` — the
  `show-word-limit` counter is the live character counter; footer `el-button` cancel and
  `el-button type="primary" :loading native-type="submit"`.
- **Missing record** — `el-result icon="warning"` in the dialog body with a close
  `el-button`.
- **Delete** — `ElMessageBox.confirm` through `useConfirm`, `beforeClose` setting
  `confirmButtonLoading` while the request runs.

### Modules

No new deep modules. This PRD composes:

- The list query and list resource composables (PRD-003)
- The data table (`AppDataTable` over `el-table`) with a two-column descriptor set
  (PRD-003)
- The confirmation composable (`useConfirm` over `ElMessageBox.confirm`, PRD-003)
- The unsaved-changes composable (PRD-004), applied to `el-dialog`'s `:before-close`
  rather than a route change — the composable's guard registration is parameterised for
  this
- The modals composable and `*Modal.vue` auto-registration (existing infrastructure),
  each modal rendering an `el-dialog`

**If this PRD requires a new shared module, that is a finding about PRD-003 or PRD-004,
not about categories.** It should be fixed in the owning PRD rather than worked around
here.

### Testing boundary

Component and integration tests mount the real Element Plus components — no stubs.
`ElMessageBox` (and `el-dialog` when `append-to-body` is set) teleports to
`document.body`, so the unsaved-changes prompt, the delete confirmation and the dialog
content are queried there.

- Category form validation — unit tested through the `el-form` ref: required name,
  length bounds on both fields, optional description, trimming.
- Duplicate-name handling — integration tested against MSW: submit an existing name,
  assert the message lands on the name `el-form-item`'s error and the dialog stays open.
- Full CRUD flow — integration tested: create, verify the row appears; edit, verify the
  change; delete with confirmation; attempt to delete a referenced category and assert
  the conflict message and its link.
- Dialog behaviour — component tested against the real `el-dialog`: focus on open,
  focus restored on close, Escape closes a clean form, Escape prompts on a dirty one.
- List behaviour — integration tested: search and sort reflected in the URL and in the
  request the mock receives.

## API Contract Plan

This PRD owns the following consolidated contract change.

**Endpoints introduced:**

- `GET /categories` — list with `search` (name, description), `sort` (name, createdAt),
  `order`, `page`, `perPage`; returns the standard list envelope
- `POST /categories` — create; `400` with field errors; `409` on a duplicate name
- `GET /categories/{id}` — read; `404` when unknown
- `PATCH /categories/{id}` — partial update; `400`, `404`, `409` on a duplicate name
- `DELETE /categories/{id}` — delete; `404` when unknown, `409` with the dependent
  ticket count when tickets reference it

**Schema components introduced:**

- `Category` — id, name, description, createdAt, updatedAt
- `CategoryPayload` — the writable subset used by create and update
- `CategoryListResponse` — data array plus the shared `PaginationMeta`

`DependencyConflict` was introduced by PRD-004 and is referenced, not redefined. The
duplicate-name conflict reuses the shared error envelope with a distinct code, so the
client can tell a uniqueness violation from a dependency violation.

## Out of Scope

- Events — PRD-004.
- Tickets and any ticket count displayed on a category row. Showing it would require an
  aggregate the contract does not carry, and adding one for a convenience column is not
  justified here.
- Category ordering, nesting, colour coding and iconography.
- Per-event category overrides. Categories are global.
- Default pricing or capacity attached to a category. Those belong to the ticket.
- Bulk operations and CSV export — PRD-007.
- Merging two categories and reassigning their tickets.

## Further Notes

This PRD should be conspicuously short to implement. If it is not, the shared machinery
is shallower than intended, and that is worth discovering now — with a two-field entity
— rather than at the fourth entity in a production platform. The implementation review
should treat unexpected size here as a signal about PRD-003, not as a problem with
categories.

The modal-versus-route rule is stated explicitly because inconsistency in form
presentation is the kind of thing that reads as carelessness in review. Divergence is
fine when the rule behind it is written down and applied; it is only a defect when it
looks accidental.

Rejecting the client-side uniqueness pre-check is a small decision with a general
lesson: a check-then-write against a mutable resource is a race regardless of how fast
the check is. The conflict response is the correct mechanism, and rendering it on the
responsible field is what makes it feel like validation rather than a failure.
