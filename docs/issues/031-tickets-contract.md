# Issue #31 — Tickets contract — endpoints, cross-entity filters, denormalised names

| | |
|---|---|
| **GitHub issue** | [#31](https://github.com/bydlovskyi/platinum/issues/31) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 21 of 41 |
| **Branch** | `feat/31-tickets-contract` |

```
Parent: #6
Parent branch: feat/30-categories-crud
Branch: feat/31-tickets-contract
Blocked by: #30
```

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

## What to build

The ticket API surface, carrying the two decisions that make the rest of PRD-006
work.

**Price is an integer in minor units.** A price of 50 is not a price; 50 in EUR is.
Floats and string-concatenated formatting produce defects that are invisible in a demo
and expensive in production.

**List responses embed the event and category names alongside their identifiers.** The
alternative — returning identifiers and resolving them client-side — means an extra
request per distinct reference per page, a loading flicker per cell, and a list that
cannot be sorted by event name. Denormalising a display name is the contract's
responsibility, not the client's.

Referential validation rejects a create or update pointing at an unknown event or
category with a field-level error on the offending field, so a stale picker option
produces an intelligible message. Tickets are leaves: deletion has no dependency check.

**Only this slice may edit `openapi.yaml` or regenerate `schema.ts` within PRD-006.**

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] `GET /tickets` with `search` (name), `eventId`, `categoryId`, `status`, `currency`, `priceMin`, `priceMax`, `sort` (name, price, quantity, status, createdAt), `order`, `page`, `perPage`
- [ ] List responses embed `eventName` and `categoryName` alongside the identifiers
- [ ] `POST /tickets` creates; 400 with field errors including unknown event or category references
- [ ] `GET /tickets/{id}` reads; 404 when unknown
- [ ] `PATCH /tickets/{id}` partially updates; 400 and 404
- [ ] `DELETE /tickets/{id}` deletes; 404 when unknown — no dependency check, tickets are leaves
- [ ] Schema components: `Ticket`, `TicketPayload`, `TicketListResponse`
- [ ] `TicketStatus` and `Currency` referenced from the PRD-001 contract, not redefined
- [ ] Price typed as an integer in minor units throughout the contract
- [ ] Currency is required with no default
- [ ] Quantity is a non-negative integer with a documented upper bound; zero is valid
- [ ] Referential validation returns a field error on `eventId` or `categoryId` for unknown references
- [ ] Handlers built through the handler factory
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #30 — *Categories — list, modal CRUD, uniqueness handling, deletion*

This slice's branch is created off `feat/30-categories-crud` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/31-tickets-contract`

## User stories addressed

Referenced by number from the parent PRD:

- 32 (unknown reference reported intelligibly)
- 41 (leaf deletion is unobstructed)
