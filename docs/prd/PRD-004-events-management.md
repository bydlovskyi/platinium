# PRD-004 — Events Management

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001, PRD-002, PRD-003 |
| **Blocks** | PRD-006 (tickets reference events) |

## Problem Statement

An event is the root of this domain. A ticket cannot exist without one, and a category
is only meaningful because events group the tickets it classifies. Until administrators
can create and manage events, nothing else in the portal has anything to point at.

The platform, the shell and the shared list experience are in place, but no entity is
wired through them. Events are the right first entity precisely because they are the
hardest of the three: a date range that must be internally consistent, a country that
must come from a controlled list rather than a free-text field, and a status whose
transitions have real consequences for the tickets underneath.

There is also a referential-integrity question that no earlier PRD could answer:
what happens when an administrator deletes an event that has tickets attached? Answered
carelessly, it orphans records and leaves the portal showing tickets that belong to
nothing. This PRD has to settle it.

## Solution

Deliver complete event management through the shared list and form machinery.

**A list that answers real questions.** Search across name and venue, filter by status
and by country, filter by a date range that overlaps the event's own range, sort by
name, start date, end date or status. Because this is built on the PRD-003 composable,
all of it lives in the URL and all of it is computed server-side by the mock.

**A form that prevents bad data rather than reporting it afterwards.** The end date
cannot precede the start date, and the constraint is enforced in the picker itself, not
only on submit. Country is a searchable select over a controlled list, so a reviewer
never sees "USA", "U.S.A." and "United States" in the same dataset. Status is a select
over the enum. Required fields are marked before they are violated.

**Create and edit are the same form.** One component, two routes, differing only in
whether it loads an existing record first. The alternative — separate create and edit
components — guarantees that a validation rule gets fixed in one and not the other.

**Deletion is guarded by the data, not by hope.** The mock rejects deletion of an event
that still has tickets, returning a conflict that names the count. The portal surfaces
that as an actionable message telling the administrator how many tickets block the
delete and offering to open them, rather than a generic failure toast. This is the
honest behaviour for a referenced entity, and it is why the conflict response exists in
the PRD-001 contract.

**Unsaved work is protected.** Navigating away from a dirty form asks for confirmation.
Nothing else in the assessment demands it, and its absence is the single most common
way an administrator loses ten minutes of typing.

## User Stories

1. As an administrator, I want a list of all events, so that I can see what is
   scheduled.
2. As an administrator, I want to see each event's name, country, venue, dates and
   status at a glance, so that I can identify one without opening it.
3. As an administrator, I want to search events by name or venue, so that I can find
   one in a large list.
4. As an administrator, I want to filter events by status, so that I can review
   everything still in draft.
5. As an administrator, I want to filter events by country, so that I can work on one
   market at a time.
6. As an administrator, I want to filter events by a date range, so that I can see what
   is happening next month.
7. As an administrator, I want date filtering to include events that merely overlap my
   range, so that a long-running event is not hidden because it started earlier.
8. As an administrator, I want to sort events by start date, so that I can plan
   chronologically.
9. As an administrator, I want to sort by name, end date or status, so that I can order
   the list the way I am thinking about it.
10. As an administrator, I want the event list paginated with a total count, so that I
    know the size of the catalogue.
11. As an administrator, I want to create an event from the list, so that I do not have
    to hunt for the action.
12. As an administrator, I want to enter a name, country, venue, start date, end date
    and status, so that the event is fully described.
13. As an administrator, I want required fields marked before I submit, so that I know
    what is expected.
14. As an administrator, I want to be told when a required field is empty, so that I can
    complete it.
15. As an administrator, I want the name length constrained with a clear message, so
    that I do not create an unreadable list entry.
16. As an administrator, I want to pick a country from a searchable list, so that I
    neither misspell it nor invent a variant.
17. As an administrator, I want to be prevented from choosing an end date before the
    start date, so that I cannot create an impossible event.
18. As an administrator, I want the end date picker to disable dates before my chosen
    start date, so that the rule is obvious rather than punitive.
19. As an administrator, I want a warning when I change the start date to after the
    existing end date, so that I understand why the end date was cleared.
20. As an administrator, I want to choose a status when creating an event, so that I can
    prepare one without publishing it.
21. As an administrator, I want the submit button to show progress and prevent a second
    click, so that I do not create a duplicate.
22. As an administrator, I want a success confirmation after saving, so that I know it
    worked.
23. As an administrator, I want to be returned to the list after saving, so that I can
    continue working.
24. As an administrator, I want server-side validation errors attached to the fields
    that caused them, so that I can fix the right input.
25. As an administrator, I want to edit an existing event, so that I can correct a
    detail.
26. As an administrator, I want the edit form pre-filled with the current values, so
    that I only change what I mean to.
27. As an administrator, I want a clear message when I open an event that no longer
    exists, so that I am not shown an empty form.
28. As an administrator, I want to be asked before leaving a form with unsaved changes,
    so that I do not lose my work.
29. As an administrator, I want to cancel an edit and return to the list, so that I can
    back out safely.
30. As an administrator, I want to delete an event I no longer need, so that the list
    stays relevant.
31. As an administrator, I want deletion to be confirmed with the event's name, so that
    I do not remove the wrong one.
32. As an administrator, I want to be prevented from deleting an event that still has
    tickets, so that I do not orphan them.
33. As an administrator, I want to be told how many tickets block the deletion and to
    be able to open them, so that I can resolve it.
34. As an administrator, I want to return from an edit to the same filtered page of the
    list, so that I do not lose my place.
35. As an administrator using a phone, I want the event list as readable cards and the
    form as a single column, so that I can manage events away from my desk.
36. As an administrator, I want a status badge coloured consistently with the rest of
    the portal, so that I can scan statuses quickly.
37. As an administrator, I want dates shown in a readable local format rather than a raw
    timestamp, so that I do not have to decode them.

## Implementation Decisions

### View structure

A single events view owning three routes: the list, the create form and the edit form.
Create and edit share one form component; the route decides whether an existing record
is loaded first. The form is a full route rather than a modal — an event has seven
fields including two date pickers and a searchable country select, which is more than a
dialog should carry on a phone, and a route gives each record a shareable URL.

The events service exposes the five CRUD operations against the contract. A store is
**not** created: event state is not shared outside this view. PRD-006 needs a list of
events for its ticket form, and it obtains that through its own lookup call rather than
by reaching into an events store. A store here would be a store created out of habit.

### Data rules

Dates are stored and transported as ISO-8601 date strings without a time component. An
event occupies whole days; introducing times would raise timezone questions the domain
does not need. The picker binds directly to that representation, so nothing converts
between a `Date` object and a string in more than one place.

Country uses ISO 3166-1 alpha-2 codes over a bundled list of code-and-name pairs. The
stored value is the code; the display value is the name. This keeps the data
normalised and makes a future translation of country names a presentation change only.

The date-range constraint is enforced in three places for three different reasons: in
the picker, so the administrator cannot express the mistake; in the form rules, so a
programmatic change is still caught; and in the mock handler, so the contract is
honest about what the server accepts. A client-only constraint would leave the mock
accepting data the UI forbids.

### Status

The four statuses — draft, published, cancelled, completed — are free transitions in
this PRD. Any status may be set from any other. A real platform would constrain the
transition graph, and that constraint is noted in `TECHNICAL_REVIEW.md` as deferred
scope rather than silently omitted.

### Deletion

Referential integrity is enforced by the mock: deleting an event with dependent tickets
returns a conflict carrying the dependent count. The portal renders that as a specific,
actionable message with a link to the tickets list pre-filtered to that event.

Cascade deletion is explicitly rejected. Silently destroying an unknown number of
tickets behind a single confirmation is the wrong default for an administrative tool.

### Modules

**Event form component (deep module).** Owns the field set, validation rules, the
cross-field date constraint, dirty tracking and submission. Consumed by both routes and
testable without a router.

**Unsaved-changes guard composable.** Compares current form state against the loaded
baseline and registers a navigation guard plus a beforeunload handler. Built generically
here because PRD-005 and PRD-006 reuse it unchanged.

**Country reference data.** A bundled static list with a lookup by code. Not fetched —
it never changes at runtime and a round trip for it would be waste.

The list screen itself is thin: column descriptors, a filter descriptor, and the
PRD-003 composables. Any meaningful list logic appearing in this view is a signal that
PRD-003 under-delivered.

### Testing boundary

- Event form validation — unit tested: required fields, name length bounds, the date
  ordering constraint in both directions, and clearing the end date when the start date
  moves past it.
- Unsaved-changes composable — unit tested: clean form navigates freely, dirty form
  prompts, saving clears the dirty state.
- Events service — unit tested for correct request shaping of the full filter set.
- Full CRUD flow — integration tested against MSW: create with a validation failure then
  a success, verify the row appears; edit and verify the change; delete with
  confirmation; attempt to delete a referenced event and assert the conflict message.
- List behaviour — integration tested: search, each filter, sort toggling and pagination
  all reflected in the URL and in the request the mock receives.

## API Contract Plan

This PRD owns the following consolidated contract change.

**Endpoints introduced:**

- `GET /events` — list with `search` (name, venue), `status`, `country`, `startDateFrom`,
  `startDateTo`, `sort` (name, startDate, endDate, status, createdAt), `order`, `page`,
  `perPage`; returns the standard list envelope
- `POST /events` — create; `400` with field errors on invalid input
- `GET /events/{id}` — read; `404` when unknown
- `PATCH /events/{id}` — partial update; `400` and `404`
- `DELETE /events/{id}` — delete; `404` when unknown, `409` with the dependent ticket
  count when tickets reference it

**Schema components introduced:**

- `Event` — id, name, country, venue, startDate, endDate, status, createdAt, updatedAt
- `EventPayload` — the writable subset used by create and update
- `EventListResponse` — data array plus the shared `PaginationMeta`
- `DependencyConflict` — extends the shared error envelope with the blocking entity
  type and count

`EventStatus` was introduced by PRD-001 and is referenced, not redefined.

## Out of Scope

- Ticket categories — PRD-005.
- Tickets, and any aggregate of tickets shown on an event — PRD-006.
- Status transition rules and any approval workflow.
- Event images, banners, descriptions, seating maps, capacity and pricing tiers.
- Recurring events and event duplication.
- Timezone handling. Events are whole-day and timezone-naive by decision.
- Bulk operations and CSV export — PRD-007.
- An event detail screen. The edit form is the detail view; a separate read-only screen
  earns nothing here.

## Further Notes

This is the first entity to run through the PRD-003 machinery, so it doubles as the
proof that the abstraction holds. If the events list needs the table component changed,
the fix belongs in PRD-003's component rather than in a local variant — and that
correction is cheaper now than after two more entities have copied the workaround.

The referential-integrity decision is the most consequential one here. It is the
difference between an admin tool that protects its data and one that quietly corrupts
it, and it is the kind of choice an assessment reviewer looks for explicitly. Returning
the blocking count rather than a bare conflict is what turns a refusal into something
the administrator can act on.
