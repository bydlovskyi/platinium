# Design system

This is the reference for the portal's visual design system: the tokens, the
Element Plus theme bridge, the type scale, motion, and the status colour
mapping — and the rules for keeping a new screen consistent with all of it
without relying on review to catch drift. It's written for whoever adds the
next screen or audits an existing one against the system.

Rationale and the two-halves implementation plan live in
[PRD-010](prd/PRD-010-visual-design-system-and-interface-polish.md). The
component-library rule this document assumes throughout — Element Plus first,
no raw interactive HTML — is owned by
[`ELEMENT-PLUS.md`](prd/ELEMENT-PLUS.md); this reference links to it rather
than duplicating it.

## Tokens

Components reference semantic token names only — `surface`, `text-muted`,
`accent`, and so on — exposed as Tailwind utilities (`bg-surface`,
`text-accent`, `border-border`, …) in `src/assets/styles/theme.css`. A
component must never reach past this layer: no literal hex value, and no
direct reference to an `--el-*` variable name. That indirection is what makes
dark mode a redefinition of the semantic layer instead of an audit of every
component that used a colour.

| Token | Rides | Meaning / when to use |
|---|---|---|
| `--color-surface` | `--el-bg-color-page` | The page ground — the outermost background behind everything else. |
| `--color-surface-raised` | `--el-bg-color` | The elevated plane — cards, panels, the header/sidebar, anything sitting above the page ground. |
| `--color-border` | `--el-border-color` | Default border colour for dividers and containers that need a visible edge. |
| `--color-border-subtle` | `--el-border-color-lighter` | A lower-contrast border for internal separators (table rows, nested groups) where a full-strength border would be too heavy. |
| `--color-text-primary` | `--el-text-color-primary` | Default body and heading text colour. |
| `--color-text-muted` | `--el-text-color-regular` | Secondary/muted copy — captions, helper text, de-emphasised labels. |
| `--color-accent` | `--el-color-primary` | The one brand accent — primary actions and active states, nothing else. |
| `--color-accent-hover` | `--el-color-primary-light-3` | Hover state for accent-coloured elements. |
| `--color-danger` | `--el-color-danger` | Destructive actions and the "Cancelled" status. |
| `--color-status-published` | `--el-color-success` | Event/ticket "published" and "on sale" status colour. |
| `--color-status-draft` | `--el-color-warning` | Event/ticket "draft" status colour. |
| `--color-status-cancelled` | `--el-color-danger` | Event "cancelled" and ticket "sold out" status colour. |
| `--color-status-completed` | `--el-color-info` | Event "completed" and ticket "archived" status colour. |

`--color-text-muted` deliberately rides `--el-text-color-regular` and not
`--el-text-color-secondary`: the comment in `theme.css` notes that
`--el-text-color-secondary` (`#909399`) only reaches roughly 2.8:1 contrast on
a white surface, well under the AA threshold for text, so muted copy is
mapped to `regular` (`#606266`, 5.5:1) instead.

### The Element Plus bridge

The mapping table above *is* the bridge — each semantic token is defined as
`var(--el-*)` in `theme.css`'s `@theme` block, and the `--el-*` side of that
mapping is itself set in `src/assets/styles/element-reset/theme.css`, under
both the `:root` (light) and `html.dark` selectors, on top of Element Plus's
own `theme-chalk/base.css` and `theme-chalk/dark/css-vars.css`. A
selector-level `.el-*` override is a last resort in this codebase and, per
the project's own rule, must carry a comment naming what the variable
couldn't express — none currently exists in `element-reset/theme.css`.

Element Plus's neutrals (surfaces, fills, borders, text, masks, shadows) are
used as shipped and are **not** overridden — overriding them previously left
dialogs, inputs and overlays rendering white in dark mode. The only literal
colour values in the codebase are five hues, set in
`element-reset/theme.css`, each mapped onto one of Element Plus's own
semantic slots:

| Slot | Light | Dark |
|---|---|---|
| Primary (accent) | `#4F46E5` | `#818CF8` |
| Success (published/on sale) | `#15803D` | `#4ADE80` |
| Warning (draft) | `#92400E` | `#FBBF24` |
| Danger (cancelled/sold out, destructive actions) | `#B91C1C` | `#EF4444` |
| Info (completed/archived) | `#0369A1` | `#38BDF8` |

Each hue derives a `-light-3/5/7/8/9` and a `-dark-2` ladder via
`color-mix(in srgb, <hue> N%, white|black)`, matching Element Plus's own step
convention (`--el-color-primary-light-3`, etc.), so fills and hover states
stay in sync with the base hue automatically. In dark mode the ladder mixes
*towards* the page background rather than towards white, because Element
Plus's dark convention inverts the scale — `light-N` steps stay usable as
fills against a near-black page, and `dark-2` becomes the lighter hover step
rather than a darker one.

## Type scale

Defined in `theme.css`'s `@theme` block as five named steps, each a complete
Tailwind utility (`text-screen-heading`, etc.) carrying its own size, line
height and weight:

| Step | Size | Line height | Weight |
|---|---|---|---|
| `--text-screen-heading` | 1.875rem | 2.25rem | semibold |
| `--text-section-heading` | 1.25rem | 1.75rem | semibold |
| `--text-label` | 0.8125rem | 1.125rem | medium |
| `--text-body` | 0.875rem | 1.25rem | normal |
| `--text-caption` | 0.75rem | 1rem | normal |

The typeface is Inter Variable, self-hosted via `@fontsource-variable/inter`
(imported in `src/assets/styles/base.css`) rather than loaded from Google
Fonts or another third-party origin at runtime. It ships as a real bundled
dependency, so there's no runtime font request and no layout shift while it
loads. Only the non-italic variable-weight axis is imported — the portal
doesn't use italic Inter.

Numeric columns and `el-statistic` values use Tailwind's built-in
`tabular-nums` / `slashed-zero` font-variant-numeric utilities so figures
align down a column. No custom `.tabular-nums` class exists or is needed —
Tailwind v4 already ships this as a utility.

## Spacing, radius and elevation

Spacing uses Tailwind's default 4px-grid scale directly — no custom spacing
scale was added. `p-1`/`p-2`/`p-3`/`p-4`/`p-6`/`p-8`/`p-12` already produce
4/8/12/16/24/32/48px.

Three radii, defined in `theme.css`:

| Token | Value |
|---|---|
| `--radius-token-sm` | 4px |
| `--radius-token-md` | 8px |
| `--radius-token-lg` | 12px |

Three elevations, also in `theme.css`, with a light-mode set and a
`html.dark` override:

| Token | Light | Dark |
|---|---|---|
| `--shadow-token-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.06)` | `0 1px 2px 0 rgb(0 0 0 / 0.3)` |
| `--shadow-token-md` | `0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)` | `0 2px 4px 0 rgb(0 0 0 / 0.35)` |
| `--shadow-token-lg` | `0 12px 24px -6px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.06)` | `0 4px 8px 0 rgb(0 0 0 / 0.4)` |

The dark values are not just a darker copy of the light shadow — they're a
much fainter separator. In dark mode elevation is carried by the surface
scale lightening with height instead (page `#0a0a0a` → raised `#141414` →
overlay `#1d1e1f`, per the comment in `theme.css`), because a drop shadow
does almost nothing against a near-black background.

Density tokens, defined for the data table and mobile layouts to consume as
that work lands (not yet referenced outside `theme.css` itself):

| Token | Value |
|---|---|
| `--row-height` | 36px |
| `--table-cell-padding-y` | 8px |
| `--tap-target-min` | 44px |

Focus ring tokens, applied globally via `:focus-visible` in `base.css`:

| Token | Value |
|---|---|
| `--focus-ring-width` | 2px |
| `--focus-ring-offset` | 2px |
| `--focus-ring-color` | `var(--el-color-primary)` (the accent) |

The ring is applied as `outline`, not `box-shadow` — a box-shadow ring would
replace whatever shadow the element already carries (a focusable card would
lose its elevation on focus) and would need to hard-code one surface colour
for its inner offset, which would then mismatch on `surface-raised`.
`outline` composes with any existing box-shadow and follows the element's
own background instead.

## Motion

Two durations and two easing curves, defined in `theme.css`:

| Token | Value |
|---|---|
| `--duration-fast` | 120ms |
| `--duration-base` | 200ms |
| `--ease-out-token` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out-token` | `cubic-bezier(0.4, 0, 0.2, 1)` |

They're named with a `-token` suffix so they don't collide with Tailwind's
own `--ease-out`/`--ease-in-out` theme variables, which power different
curves under the `ease-out`/`ease-in-out` utility classes.

Motion is applied to a fixed list of moments, each owned by exactly one
mechanism — nothing animates outside this list:

| Moment | Mechanism |
|---|---|
| Route changes | Vue `<Transition name="route-fade" mode="out-in">` around `router-view`, shared by `AdminLayout.vue` and `AuthLayout.vue`. Classes defined once in `base.css` (`.route-fade-enter-active` / `.route-fade-leave-active`, transitioning `opacity` and `transform` on `--duration-base` / `--ease-out-token`). |
| Skeleton-to-content crossfade | Vue `<Transition name="skeleton-fade" mode="out-in">` wrapping the swap between `el-skeleton`'s `#template` and real content (`el-skeleton` itself has no built-in transition — it's a plain `v-if` internally). Classes in `base.css` (`.skeleton-fade-*`, opacity only). |
| Dialog / drawer entry | `el-dialog` / `el-drawer`'s own built-in transitions, tuned through `--el-transition-duration` / `--el-transition-duration-fast` mapped from the two duration tokens. |
| Notification entry | `ElNotification` / `ElMessage`'s built-in transitions, same `--el-transition-duration*` mapping. |
| List-item leave | Not `<TransitionGroup>` — `el-table` renders its own body, so a deleted row leaves via a `row-class-name` (`.app-table-row-leaving` in `base.css`, a `@keyframes row-leaving` animation to `opacity: 0` / `translateX(8px)` over `--duration-base` / `--ease-in-out-token`). Timing is owned by `useRowLeaveAnimation` (`src/composables/useRowLeaveAnimation.ts`), which marks row keys as leaving, waits for the animation's real duration (read live from `--duration-base` on `document.documentElement`, so it's automatically `0` under reduced motion), then lets the caller remove the row and refetch. |
| Dashboard figures counting in | `useCountUp` (`src/composables/useCountUp.ts`), a thin wrapper over VueUse's `useTransition` feeding `el-statistic :value`. Counting only starts once the source has emitted a first real (>0) value, so a still-loading dashboard never shows a stray animated `0`; every value after that still eases in rather than jumping. |

Reduced motion is a hard requirement, not a refinement, and this codebase
enforces it at three separate layers so no single missed spot leaves motion
running:

1. **Global CSS layer** — `base.css`'s
   `@media (prefers-reduced-motion: reduce)` block forces every actual
   `transition-duration` / `animation-duration` to `0.01ms !important` (plus
   `animation-iteration-count: 1 !important` and `scroll-behavior: auto
   !important`), covering any CSS-driven transition or animation
   unconditionally, regardless of what token it reads.
2. **Token layer** — `element-reset/theme.css` has its own
   `@media (prefers-reduced-motion: reduce)` block that sets
   `--duration-fast`, `--duration-base`, `--el-transition-duration` and
   `--el-transition-duration-fast` to `0s` under `:root`. This is what lets a
   test assert the computed token value itself reads `0s`, and it's what
   Element Plus's own built-in transitions and any future `var(--duration-*)`
   consumer read their duration from.
3. **JS layer** — a CSS override alone can't stop a `requestAnimationFrame`
   loop, so `useCountUp` reads VueUse's `usePreferredReducedMotion()`
   directly and bypasses `useTransition` entirely when it reports `reduce`,
   rendering the final value immediately instead of counting. `useRowLeaveAnimation`
   doesn't need its own reduced-motion branch — it reads `--duration-base`'s
   live computed value for its wait, which the token-layer override above
   already resolves to `0s`.

Nothing in the animated-moments list is longer than the interaction it
accompanies, and no animation blocks input.

## Status colour mapping

Every event and ticket status maps to one of exactly four colour tokens —
there is no fifth. The mapping lives in
`src/utils/status-presentation.ts` and is rendered by `StatusTag.vue` as an
`el-tag` with `effect="light"` and a rounded shape:

| Status | Entity | `el-tag` type | Label |
|---|---|---|---|
| `draft` | Event & Ticket | `warning` | Draft |
| `published` | Event | `success` | Published |
| `cancelled` | Event | `danger` | Cancelled |
| `completed` | Event | `info` | Completed |
| `on_sale` | Ticket | `success` | On sale |
| `sold_out` | Ticket | `danger` | Sold out |
| `archived` | Ticket | `info` | Archived |

`draft` is the only status literal enough to overlap between the two
entities, and maps identically both times. The remaining ticket-only values
take the closest semantic analogue of the four tokens: `on_sale` reads as the
ticket's "live" state, matching `published`'s success token; `archived` reads
as the ticket's "no longer active" state, matching `completed`'s info token;
`sold_out` needs to stand out from both and takes the danger token (distinct
from a separate zero-quantity indicator used elsewhere on ticket rows, which
flags a different concern).

The same mapping is exposed as
`STATUS_PRESENTATION_TYPE_COLOR` (type → the underlying `var(--el-color-*)`)
so the dashboard's `el-progress` breakdowns colour their bars from the exact
same source instead of re-deriving an assignment that could drift from
`StatusTag`'s.

The code comments in both files are explicit about a greyscale caveat: four
status hues that all individually clear 4.5:1 contrast against the same
surface necessarily sit in a narrow luminance band — the best achievable
separation between any two of them is roughly 1.2:1, which isn't
perceptible. Colour cannot carry status alone here. `StatusTag` always
renders the mapped text label alongside the tag's colour and effect, which is
what actually satisfies the greyscale requirement, not the colour choice
itself.

## Contrast verification

Recorded as a comment at the top of `element-reset/theme.css`. Ratios are
measured against the page surface (`--el-bg-color-page`) and the raised
surface (`--el-bg-color`) of the same theme; AA for normal text requires
4.5:1.

| Colour | Light — page / raised | Dark — page / raised |
|---|---|---|
| Primary (accent) | 5.66 / 6.29 | 6.64 / 6.18 |
| Success (published/on sale) | 4.52 / 5.02 | 11.36 / 10.57 |
| Warning (draft) | 6.39 / 7.09 | 11.86 / 11.04 |
| Danger (cancelled/sold out) | 5.83 / 6.47 | 5.26 / 4.90 |
| Info (completed/archived) | 5.34 / 5.93 | 9.24 / 8.60 |
| `text-primary` | 11.73 | 16.40 |
| `text-regular` (muted) | 5.50 | 13.20 |

The tightest ratio is light-mode success against the page surface, at
4.52:1 — barely above the 4.5:1 AA threshold, which is why the comment calls
it out specifically as the one that decided the ramp rather than one that
merely happened to pass. `--el-text-color-secondary` (~2.8:1 on white) fails
AA outright and is why muted text is mapped to `--el-text-color-regular`
instead (see Tokens, above).

The `theme.css` comment states these ratios were "checked with a tool" but
doesn't name which one — the source doesn't record a specific tool or
formula, so this document doesn't invent one either.

## Rules for adding a new screen

- **Check Element Plus before building a raw control.** No `<button>`,
  `<input>`, `<select>`, `<textarea>`, `<table>` or native checkbox/radio
  where an Element Plus equivalent exists — see the full component map in
  [`ELEMENT-PLUS.md`](prd/ELEMENT-PLUS.md). Shared portal components
  (`AppDataTable`, `StatusTag`, `ListToolbar`, `CurrencyInput`, `RemoteSelect`,
  …) wrap and configure Element Plus components; they never replace them.
- **Reference semantic tokens and Tailwind utilities only.** Never a literal
  hex value, never a raw `--el-*` variable name, in component code. If a
  design need genuinely can't be expressed through the existing tokens, that's
  a token-layer change (`theme.css` / `element-reset/theme.css`), not a local
  override.
- **Register the stylesheet in the same commit.** Any newly adopted Element
  Plus component needs its `element-plus/theme-chalk/el-<name>.css` import
  added to `src/assets/styles/element-reset/components/index.css` in the same
  commit that adopts it — the resolver runs with `importStyle: false`, so a
  component that renders unstyled in the browser but passes its tests is the
  symptom of skipping this.
- **Single-column forms.** `el-form label-position="top"`, with
  `el-form-item` groups separated by `el-divider content-position="left"` or a
  section heading — not a dense multi-column `el-row` grid. Scanning down one
  column is faster than reading across two.
- **Tables use stripe or hover, never both.** Pick zebra striping (`stripe`)
  or row hover (`--el-table-row-hover-bg-color`) for a given table, not both
  at once. Every table in the portal today uses row hover — the row-hover
  transition timing lives in `element-reset/components/el-table.css` — and
  none sets `stripe`, so a new table should default to hover unless there's a
  specific reason to zebra-stripe it instead.
- **Destructive actions are always `type="danger"`.** `el-button
  type="danger"`, or a danger-styled `el-dropdown-item divided` for row
  actions — never the primary accent for something destructive.
- **Icon-only controls need an accessible label.** An `aria-label` on the
  control (usually `el-button circle` / `text`), and typically paired with an
  `el-tooltip` so the label is visible on hover too, not just to assistive
  tech.
- **Don't add your own max-width wrapper.** `AdminLayout.vue`'s `el-main`
  already wraps `router-view` in `<div class="mx-auto w-full
  max-w-screen-2xl">`, so a new authenticated screen gets the constrained
  content width and symmetric gutters for free and doesn't need to repeat it.

## See also

- [`docs/prd/ELEMENT-PLUS.md`](prd/ELEMENT-PLUS.md) — the component map and
  the Element Plus-first rule this document assumes throughout.
- [`docs/prd/PRD-010-visual-design-system-and-interface-polish.md`](prd/PRD-010-visual-design-system-and-interface-polish.md) —
  full rationale for the design system and its two-halves rollout.
- [`architecture.md`](../architecture.md) — the portal's broader code
  conventions and architecture rules.
- The README's ["AI-assisted workflow"](../README.md#ai-assisted-workflow)
  section — a dedicated AI-workflow document doesn't exist in the repo yet;
  that's tracked as a separate, not-yet-landed slice.
</content>
