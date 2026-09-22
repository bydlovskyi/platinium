---
name: find-magic-numbers
description: Scan changed files for unnamed numeric literals and propose named constants. Use before completing any feature or bug fix that touched server-side code, or when reviewing a branch.
allowed-tools: Bash(git *), Read, Grep, Glob, Edit
---

# Find Magic Numbers

Enforces the project rule from `feedback_no_magic_numbers.md`: every numeric literal with semantic meaning gets extracted into a named constant.

## When to run

- Before declaring a feature or bug fix complete
- When reviewing the current branch
- When the user asks to "clean up magic numbers" or "extract constants"

## Step 1 — Find changed files

Run:

```
git diff main...HEAD --name-only
git diff HEAD --name-only
```

Take the union, then **filter out**:

- `src/features/platform/api/schema.ts` (generated from openapi.yaml)
- `**/*.test.ts`, `**/__tests__/**` (test fixtures often need raw numbers)
- `dts/**`, `src/router/route-names-registry.ts`, `**/icons.d.ts` (generated)
- `package-lock.json`

## Step 2 — Scan for numeric literals

For each remaining file, grep for literals that are likely magic. Heuristic regex:

```
\b(?<![\w.])([2-9]|[1-9][0-9]+)\b(?![\w.])
```

This intentionally **skips** `0` and `1` (almost always semantically obvious — array indices, boolean-like flags, defaults).

Read each match in context. **A literal is a magic number when it carries domain meaning that a reader has to infer.** Examples from this codebase:

- Time windows: `1000 * 60 * 60` (one hour in ms), `7` (days), `30` (timeout seconds)
- Limits: `100` (page size), `5000` (max chars)
- Money: `100` (cents-per-dollar conversion), `2900` (Stripe minimum charge)
- Retry counts, batch sizes, pagination defaults

A literal is **NOT** magic when:

- It is part of an enum-like discriminator already named by surrounding code
- It is a Tailwind size token in a Vue template (`w-4`, `gap-2`) — those are not numbers, they're class names
- It is an HTTP status code passed to `createError({ statusCode: 404 })` — status codes are universally understood
- It appears only inside a test file you already filtered out

## Step 3 — Propose extractions

For each true magic number, decide where the constant belongs:

| Scope | Location |
|-------|----------|
| Used in one controller domain only | `server/controllers/<domain>/constants.ts` |
| Used across server domains | `server/constants/` (existing folder) |
| Used in shared schema / both sides | `shared/constants/` |
| Used in one Vue feature only | `app/features/<feature>/constants.ts` |

Naming convention: `SCREAMING_SNAKE_CASE`, with units in the name when ambiguous:

- `ONE_HOUR_MS`, `MAX_PAGE_SIZE`, `STRIPE_MIN_CHARGE_CENTS`, `BOOKING_CANCEL_GRACE_DAYS`

## Step 4 — Report, don't auto-fix wholesale

Output a short table:

```
File                                    Line   Literal   Proposed name              Where to put it
server/controllers/bookings/cancel.ts   42     86400000  ONE_DAY_MS                 server/constants/time.ts
server/controllers/payments/refund.ts   17     2900      STRIPE_MIN_CHARGE_CENTS    server/constants/stripe.ts
```

Then ask the user which to extract. **Do not bulk-edit without confirmation** — domain meaning is a judgment call and the user knows the system better than the regex.

For each accepted extraction:

1. Read the target constants file (create if missing — match file naming style of neighbors)
2. Add the constant with a one-line comment **only if the unit is not in the name**
3. Edit the source file to import and use the constant
4. Move on — do not refactor surrounding code

## Anti-patterns

- Do not extract `0`, `1`, `-1`, `2` (when used as a divisor for averages), or HTTP status codes
- Do not extract literals from generated files (`dts/`, `schema.ts`, `route-names-registry.ts`)
- Do not invent a constants file in a new location when an obvious sibling already exists — read the directory first
- Do not add a comment that just restates the constant name (`// max page size` next to `MAX_PAGE_SIZE`)
