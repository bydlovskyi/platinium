# PRD-006 — Tickets Management

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-001, PRD-002, PRD-003, PRD-004, PRD-005 |
| **Blocks** | PRD-007 (dashboard aggregates tickets) |

## Problem Statement

Tickets are what this portal is named for, and they are the only entity that touches
everything else. A ticket carries money, a stock quantity, a lifecycle status, and two
foreign references — to an event and to a category. Every earlier PRD exists so that
this one can be built correctly.

Three problems only appear here.

**Money.** Price and currency travel together and are meaningless apart. A price of
`50` is not a price; `50` in `EUR` is. Getting this wrong — storing a float, formatting
with string concatenation, letting a currency default silently — produces defects that
are invisible in a demo and expensive in production. PRD-001 chose integer minor units
for exactly this reason, and this is the PRD where that decision earns its keep or
fails.

**Reference selection at scale.** A ticket must point at an event and a category. With
several dozen events, a plain select is acceptable; with thousands, it is not. The
selector has to be built as if the dataset were large, because the mock already returns
paginated, searchable lists and there is no reason to write a component that would have
to be replaced.

**Filtering across a relationship.** Administrators do not think "show me tickets"; they
think "show me the VIP tickets for the Berlin show that are still on sale". That is a
filter spanning two foreign keys and a status, and it has to be computed server-side
against a dataset the client never fully holds.

Without this PRD the portal has two well-managed reference tables and nothing that uses
them.

## Solution

Deliver complete ticket management, with money, references and cross-entity filtering
treated as first-class concerns.

**Money handled once, correctly.** Prices are integer minor units throughout the
contract, the store and the service layer. A dedicated currency input presents a
decimal value to the administrator and converts at the boundary — the only place in the
codebase where that conversion is allowed to exist. Display uses the locale-aware
formatter introduced in PRD-003. A currency must be chosen explicitly; there is no
silent default, because a wrong default is worse than a required field.

**Reference selectors that page and search.** Event and category pickers query their
own endpoints with a debounced search term and load further results on scroll. When
editing an existing ticket whose event is not on the first page, the selected record is
fetched by identifier and merged into the options, so the field never renders as a bare
identifier or an empty box.

**A list that answers the real question.** Search by ticket name; filter by event, by
category, by status, by currency and by a price range; sort by name, price, quantity,
status or creation date. The list shows the resolved event and category names, not
identifiers — the contract returns the names alongside the references so the client
never has to issue N additional requests to render a page.

**Quantity as stock, not as a number.** Quantity is a non-negative integer with a
sensible upper bound. Zero is legitimate and means sold out, so the list surfaces
zero-quantity tickets distinctly rather than letting them look like a data entry
mistake.

**Deep links from the rest of the portal.** The conflict messages built in PRD-004 and
PRD-005 link here with a pre-applied filter. Because PRD-003 put list state in the URL,
those links work by construction.

## User Stories

1. As an administrator, I want a list of all tickets, so that I can see what is on sale.
2. As an administrator, I want to see each ticket's name, price with currency, quantity,
   status, event and category, so that I can understand it without opening it.
3. As an administrator, I want the event and category shown by name rather than by
   identifier, so that the list is readable.
4. As an administrator, I want to search tickets by name, so that I can find one
   quickly.
5. As an administrator, I want to filter tickets by event, so that I can manage one
   show's inventory.
6. As an administrator, I want to filter tickets by category, so that I can review all
   VIP tickets across events.
7. As an administrator, I want to filter tickets by status, so that I can find
   everything still in draft.
8. As an administrator, I want to filter tickets by currency, so that I can review one
   market's pricing.
9. As an administrator, I want to filter tickets by a price range, so that I can find
   outliers.
10. As an administrator, I want to combine event, category and status filters, so that I
    can answer a specific question.
11. As an administrator, I want to sort tickets by price, so that I can see the range at
    a glance.
12. As an administrator, I want to sort by quantity, so that I can find what is nearly
    sold out.
13. As an administrator, I want to sort by name, status or creation date, so that I can
    order the list the way I am thinking about it.
14. As an administrator, I want the list paginated with a total count, so that I know the
    size of the inventory.
15. As an administrator, I want to arrive from an event with its filter already applied,
    so that a deep link from a blocked deletion is useful.
16. As an administrator, I want to create a ticket from the list, so that I do not have
    to hunt for the action.
17. As an administrator, I want to enter a name, price, currency, quantity, status,
    event and category, so that the ticket is fully described.
18. As an administrator, I want to enter the price as a normal decimal amount, so that I
    do not have to think in cents.
19. As an administrator, I want the price constrained to two decimal places, so that I
    cannot enter an amount that is not chargeable.
20. As an administrator, I want to be prevented from entering a negative price, so that I
    cannot create an impossible ticket.
21. As an administrator, I want to choose a currency explicitly, so that the price is
    never ambiguous.
22. As an administrator, I want the currency symbol shown beside the price input, so
    that I can see what I am entering.
23. As an administrator, I want quantity restricted to whole non-negative numbers, so
    that I cannot enter half a ticket.
24. As an administrator, I want to save a ticket with zero quantity, so that I can
    define one before stock is allocated.
25. As an administrator, I want to search the event list inside the picker, so that I can
    find an event among many.
26. As an administrator, I want the event picker to load more results as I scroll, so
    that a long list is usable.
27. As an administrator, I want the event picker to show the country and dates alongside
    the name, so that I can tell two similar events apart.
28. As an administrator, I want to search the category list inside the picker, so that I
    can select quickly.
29. As an administrator, I want the currently selected event and category shown even
    when they are not on the first page, so that editing never shows me an empty field.
30. As an administrator, I want required fields marked before I submit, so that I know
    what is expected.
31. As an administrator, I want server-side validation errors attached to the fields
    that caused them, so that I can fix the right input.
32. As an administrator, I want to be told when I reference an event or category that no
    longer exists, so that I understand why saving failed.
33. As an administrator, I want the submit button to show progress and prevent a second
    click, so that I do not create a duplicate.
34. As an administrator, I want a success confirmation after saving, so that I know it
    worked.
35. As an administrator, I want to edit an existing ticket, so that I can adjust a price
    or a quantity.
36. As an administrator, I want the edit form pre-filled with the current values
    including the resolved event and category, so that I only change what I mean to.
37. As an administrator, I want to be asked before leaving a form with unsaved changes,
    so that I do not lose my work.
38. As an administrator, I want a clear message when I open a ticket that no longer
    exists, so that I am not shown an empty form.
39. As an administrator, I want to delete a ticket, so that I can remove an obsolete
    price point.
40. As an administrator, I want deletion confirmed with the ticket's name, so that I do
    not remove the wrong one.
41. As an administrator, I want ticket deletion to succeed without a dependency check,
    so that removing a leaf record is not obstructed.
42. As an administrator, I want to return from an edit to the same filtered page of the
    list, so that I do not lose my place.
43. As an administrator, I want zero-quantity tickets visually distinguished, so that I
    can spot what is sold out.
44. As an administrator using a phone, I want the ticket list as readable cards showing
    name, price and status, so that I can check inventory away from my desk.
45. As an administrator, I want prices formatted with the correct currency symbol and
    grouping, so that I can read them without effort.

## Implementation Decisions

### View structure

A single tickets view with three routes: the list, the create form and the edit form.
Create and edit share one form component, following PRD-004 and the form-size rule
recorded in PRD-005 — seven fields including two remote selectors is firmly route
territory.

The tickets service exposes the five CRUD operations. No store; ticket state is not
shared outside this view. PRD-007's dashboard reads its own aggregate endpoint rather
than a ticket list, so there is nothing to share.

### Money

Price is an integer in the currency's minor unit everywhere except inside the currency
input component. Currency is the enum introduced in PRD-001, and it is required with no
default.

**The minor-unit conversion exists in exactly one module.** A currency input component
accepts a minor-unit value, presents a decimal to the administrator, constrains input to
the currency's decimal precision, and emits minor units. Every other layer — service,
contract, mock, list column, dashboard — deals only in integers. Any conversion found
elsewhere in review is a defect, because a second conversion site is how rounding
inconsistencies enter a codebase.

Formatting for display uses the PRD-003 money formatter, which takes minor units and a
currency code.

### Reference selectors

One generic remote-select component, parameterised by a fetch function, an option
renderer and a value resolver. Event and category pickers are configurations of it, not
two components. It owns debounced search, incremental loading on scroll, loading and
empty states, and resolution of a preselected value that is absent from the loaded page.

That last behaviour is the one that is routinely omitted and always noticed: without it,
editing a ticket whose event sits on page four shows an empty selector, and saving
silently drops the reference.

### List denormalisation

List responses embed the event name and the category name alongside their identifiers.
The alternative — returning identifiers and resolving them client-side — means an extra
request per distinct reference per page, a loading flicker per cell, and a list that
cannot be sorted by event name. Embedding a display name is the standard answer and it
is the contract's responsibility, not the client's.

### Referential validation

The mock rejects a create or update referencing an unknown event or category with a
field-level validation error on the offending field. The client renders it through the
normal field-error path, so a stale picker option produces an intelligible message
rather than a generic failure.

Tickets are leaves: nothing references them, so deletion has no dependency check.

### Status

Four statuses — draft, on sale, sold out, archived — freely transitioned, consistent
with the decision in PRD-004. Status is not derived from quantity: a ticket with zero
quantity is not automatically sold out, because an administrator may be preparing stock.
Deriving it would remove control the administrator needs, and the two concepts are
surfaced separately in the list instead.

### Modules

**Currency input (deep module).** The sole minor-unit boundary. Unit-testable with no
network and no router, and the highest-value unit test in this PRD.

**Remote select (deep module).** Generic paginated, searchable selector with
preselected-value resolution. Two configurations in this PRD, reusable by any future
entity.

**Ticket form component.** Field set, validation rules, dirty tracking, submission.
Reuses the unsaved-changes composable from PRD-004 unchanged.

The list screen remains thin: column descriptors, a filter descriptor, and the PRD-003
composables.

### Testing boundary

- Currency input — unit tested exhaustively: decimal-to-minor conversion in both
  directions, precision clamping, zero, a large value, negative rejection, and a
  currency change preserving the entered amount correctly.
- Money formatter with each supported currency — unit tested (extends PRD-003 coverage).
- Remote select — component tested: debounced search, incremental load, resolution of a
  preselected value absent from the first page, empty and loading states.
- Ticket form validation — unit tested: required fields, price and quantity bounds,
  integer-only quantity, required currency.
- Full CRUD flow — integration tested against MSW: create with a validation failure then
  a success; edit including changing the event; delete with confirmation.
- Cross-entity filtering — integration tested: filter by event and category together,
  assert the request the mock receives and the rendered result.
- Deep-link entry — integration tested: arriving with an event filter in the URL applies
  it and shows it as an active chip.

## API Contract Plan

This PRD owns the following consolidated contract change.

**Endpoints introduced:**

- `GET /tickets` — list with `search` (name), `eventId`, `categoryId`, `status`,
  `currency`, `priceMin`, `priceMax`, `sort` (name, price, quantity, status, createdAt),
  `order`, `page`, `perPage`; returns the standard list envelope with denormalised event
  and category names
- `POST /tickets` — create; `400` with field errors, including unknown event or category
  references
- `GET /tickets/{id}` — read; `404` when unknown
- `PATCH /tickets/{id}` — partial update; `400` and `404`
- `DELETE /tickets/{id}` — delete; `404` when unknown

**Schema components introduced:**

- `Ticket` — id, name, price (integer minor units), currency, quantity, status,
  eventId, eventName, categoryId, categoryName, createdAt, updatedAt
- `TicketPayload` — the writable subset: name, price, currency, quantity, status,
  eventId, categoryId
- `TicketListResponse` — data array plus the shared `PaginationMeta`

`TicketStatus` and `Currency` were introduced by PRD-001 and are referenced, not
redefined.

## Out of Scope

- Sales, orders, reservations, refunds and any notion of a ticket being purchased.
  Quantity is administrator-managed stock, not a live counter.
- Seat assignment, seat maps and per-seat pricing.
- Price history, scheduled price changes and promotional codes.
- Currency conversion and exchange rates. Each ticket is priced in one currency and
  compared only within it; the dashboard in PRD-007 aggregates per currency for this
  reason.
- Automatic status transitions derived from quantity or event dates.
- Ticket duplication and templates.
- Bulk operations and CSV export — PRD-007.
- Aggregate ticket counts shown on event or category rows.

## Further Notes

This PRD carries the two components most worth extracting in the whole project. The
currency input and the remote select are both deep modules by the definition that
matters: substantial behaviour behind a small interface that will not change. If either
ends up inlined into the ticket form, the project loses its clearest demonstration of
the principle, and a future entity will reimplement it.

The preselected-value resolution in the remote select is the detail most likely to be
missed and the one a reviewer is most likely to find, because opening any ticket whose
event is not on the first page exposes it immediately. It belongs in the acceptance
criteria explicitly rather than being left to the implementer's diligence.

Declining to derive status from quantity is worth defending in `TECHNICAL_REVIEW.md`. It
looks like an omission and is in fact a choice: an administrator preparing an event
needs to hold a ticket in draft with zero stock without the system relabelling it.
