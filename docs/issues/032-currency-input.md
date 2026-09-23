# Issue #32 — Currency input — the single minor-unit boundary

| | |
|---|---|
| **GitHub issue** | [#32](https://github.com/bydlovskyi/platinum/issues/32) |
| **Parent PRD** | [#6](https://github.com/bydlovskyi/platinum/issues/6) · [`PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md) |
| **Type** | AFK |
| **Slice** | 22 of 41 |
| **Branch** | `feat/32-currency-input` |

```
Parent: #6
Parent branch: feat/31-tickets-contract
Branch: feat/32-currency-input
Blocked by: #31
```

## Parent PRD

#6 — [`docs/prd/PRD-006-tickets-management.md`](../prd/PRD-006-tickets-management.md)

Governed by [docs/prd/ELEMENT-PLUS.md](../prd/ELEMENT-PLUS.md).

## What to build

One of the two most valuable extractions in the project: a deep module by the
definition that matters — substantial behaviour behind a small interface that will not
change.

It accepts a minor-unit integer, presents a decimal to the administrator, constrains
input to the currency's decimal precision, and emits minor units. **Every other layer —
service, contract, mock, list column, dashboard — deals only in integers.**

That constraint is the whole point. A conversion found anywhere else in review is a
defect, because a second conversion site is how rounding inconsistencies enter a
codebase. If this ends up inlined into the ticket form, the project loses its clearest
demonstration of the principle and the next entity will reimplement it.

`CurrencyInput` **wraps `el-input-number`**; it does not replace it. Decimal entry,
precision clamping and the lower bound are `el-input-number` behaviour, configured
through `:precision` (from the currency), `:min="0"` and `:controls="false"`; the symbol
sits in the `#prefix` slot. What the wrapper adds is the minor-unit conversion on the
way in and out — and nothing else.

## Acceptance criteria

- [ ] Tests listed in the parent PRD's testing boundary for this slice are written and passing
- [ ] Built from `el-input-number`; no raw `<input>` in this slice
- [ ] Accepts a minor-unit integer value and emits a minor-unit integer value
- [ ] Presents and accepts a decimal amount from the administrator
- [ ] Input constrained to the selected currency's decimal precision via `el-input-number :precision`, derived from the currency
- [ ] Negative values rejected via `:min="0"`
- [ ] Stepper controls hidden (`:controls="false"`)
- [ ] Currency symbol displayed in the `el-input-number` `#prefix` slot
- [ ] Changing the currency preserves the entered amount correctly rather than reinterpreting the integer
- [ ] Label, `aria-*` and `disabled` forwarded so they land on the native `<input>` inside `el-input-number`
- [ ] No conversion logic exists anywhere else in the codebase — verified by review
- [ ] Testable with no network and no router
- [ ] Exhaustive unit tests mounting the real `el-input-number` (no stub), asserting on its `<input>`: decimal-to-minor and minor-to-decimal in both directions, precision clamping, zero, a large value, negative rejection, and a currency change
- [ ] `el-input-number`'s theme-chalk stylesheet imported in `src/assets/styles/element-reset/components/index.css` if not already present (resolver runs with `importStyle: false`)
- [ ] `npm run lint` and `npm run type-check` clean
- [ ] Conventions in [`.claude/skills/code-conventions`](../../.claude/skills/code-conventions/SKILL.md) satisfied

## Blocked by

- Blocked by #31 — *Tickets contract — endpoints, cross-entity filters, denormalised names*

This slice's branch is created off `feat/31-tickets-contract` and its PR targets that branch, producing a stacked PR. Work starts immediately — no waiting for the blocker to merge.

## Branch discipline

- This branch ONLY rebases on its direct parent. Never `git merge main`. Never merge a sibling branch.
- No parallel siblings: at most one direct child per parent in the chain. If another open issue lists the same `Blocked by`, escalate to the PRD author.
- Contract files (`src/mocks/openapi.yaml`, `src/features/platform/api/schema.ts`): only the dedicated API contract slice modifies these. Code-only slices reject any need to run `npm run openapi-generate`.

**Branch:** `feat/32-currency-input`

## User stories addressed

Referenced by number from the parent PRD:

- 18-22 (decimal entry, two-decimal constraint, no negatives, explicit currency, symbol shown)
