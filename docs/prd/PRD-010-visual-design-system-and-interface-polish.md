# PRD-010 — Visual Design System & Interface Polish

| | |
|---|---|
| **Status** | Ready |
| **Depends on** | PRD-002 (foundation half), PRD-003 … PRD-007 (polish half) |
| **Blocks** | PRD-009 (screenshots need the finished design) |

## Problem Statement

Every other PRD in this project specifies behaviour and says nothing about how the
portal looks. Left that way, the outcome is predictable: default Element Plus
components on a white background, the library's stock blue as the only accent,
uniform grey text, no motion, and a dashboard of plain bordered boxes. It would be
functionally complete and visually indistinguishable from every other admin template.

That is a real cost, not a cosmetic one.

**For the assessment**, the reviewer's first impression is formed in the seconds
before they read any code. An interface that looks like an unstyled scaffold invites
the conclusion that the work stopped at "it functions". The brief asks for software
craftsmanship, and craftsmanship is visible.

**For the product**, an administrator lives in this tool. Density they cannot scan,
statuses they cannot distinguish at a glance, destructive actions that look identical
to safe ones, and state changes that happen with no transition — these are usability
failures that read as visual ones.

There is also a sequencing trap. Visual design cannot be bolted on at the end.
Retrofitting a type scale means touching every component. Retrofitting spacing means
re-reviewing every layout. Retrofitting dark mode after hardcoded colours have spread
through forty components is an audit, not a feature. The foundation has to exist
before the first screen is built, even though the polish can only happen after the
screens exist.

Hence this PRD executes in two halves, like PRD-008: **a token foundation that blocks
every feature PRD**, and **a polish pass that depends on all of them**.

## Solution

**A design system, not a stylesheet.** A token layer — colour, typography, spacing,
radius, elevation, motion — defined once as CSS custom properties, with a dark
counterpart for every semantic token. Element Plus is themed through those tokens
rather than overridden component by component, and Tailwind consumes the same values,
so a utility class and a library component cannot disagree about what "surface" or
"muted text" means.

**A deliberate visual identity.** Not the library default blue, and not an arbitrary
brand colour either. A palette with a real accent, a neutral ramp with enough steps to
build hierarchy, and semantic colours for success, warning, danger and info that stay
distinguishable in both themes and for the most common forms of colour blindness.
Typography with an actual scale and a chosen typeface rather than the system stack,
loaded so it does not cause a layout shift.

**Hierarchy through density and weight, not through boxes.** Administrative interfaces
fail when everything is a bordered card. Sections are separated by spacing and
restrained dividers; emphasis comes from type weight, size and colour; elevation is
reserved for things that genuinely float. The result reads as dense and calm rather
than busy.

**Motion that explains rather than decorates.** Transitions carry meaning: a row
leaving a list on delete, a panel sliding rather than appearing, a skeleton fading into
content, a number counting into place on the dashboard. All short, all respecting the
reduced-motion preference, none of them blocking an interaction. Motion is what makes
an interface feel alive; unmotivated motion is what makes one feel cheap.

**States designed rather than defaulted.** Empty states with an illustration, a
sentence explaining what would be here and the action that creates it. Loading
skeletons shaped like the content they replace. Error states that look like a
condition, not like a crash. These are the screens a reviewer will deliberately go
looking for.

**A dashboard that is worth looking at.** The statistics from PRD-007 presented with
real visual hierarchy — headline figures that dominate, proportional breakdowns that
can be read in one glance, and per-currency values grouped clearly. This is the first
screen after login and it carries the impression of the whole portal.

## User Stories

1. As an administrator, I want the portal to have a distinct visual identity, so that
   it feels like a product rather than a template.
2. As an administrator, I want a consistent accent colour used for primary actions, so
   that I always know what the main action on a screen is.
3. As an administrator, I want a readable typeface with clear size steps, so that I can
   scan a screen instead of reading every word.
4. As an administrator, I want headings, labels and body text visibly differentiated, so
   that I understand a page's structure at a glance.
5. As an administrator, I want consistent spacing throughout, so that the interface
   feels ordered rather than assembled.
6. As an administrator, I want statuses colour-coded consistently across every entity,
   so that I can read a list without checking the legend.
7. As an administrator, I want status colours distinguishable without relying on colour
   alone, so that the interface works for colour-blind users.
8. As an administrator, I want destructive actions visually distinct from safe ones, so
   that I do not delete something by pattern-matching a button position.
9. As an administrator, I want text to meet contrast requirements in both themes, so
   that I can read the portal in any lighting.
10. As an administrator, I want dark mode to look designed rather than inverted, so that
    it is genuinely usable at night.
11. As an administrator, I want surfaces, borders and shadows adapted per theme, so that
    dark mode does not look like a flat grey sheet.
12. As an administrator, I want the interface to feel dense but calm, so that I can see
    a lot of data without feeling crowded.
13. As an administrator, I want tables with comfortable row height and clear column
    separation, so that I can track a row across the screen.
14. As an administrator, I want hover feedback on interactive rows, so that I know what
    I am about to click.
15. As an administrator, I want a visible focus ring on every focusable element, so that
    I never lose my place when using the keyboard.
16. As an administrator, I want transitions when content changes, so that I understand
    what happened rather than seeing the screen jump.
17. As an administrator, I want a deleted row to animate out, so that I can see which
    record was removed.
18. As an administrator, I want dialogs and drawers to slide rather than appear, so that
    I understand where they came from.
19. As an administrator, I want page transitions between routes, so that navigation feels
    continuous.
20. As an administrator, I want skeletons that fade into real content, so that loading
    does not end in a flash.
21. As an administrator, I want all motion suppressed when I have asked my system to
    reduce it, so that the portal respects my accessibility setting.
22. As an administrator, I want buttons to respond immediately when pressed, so that the
    interface feels responsive even when the request is not instant.
23. As an administrator, I want an illustrated empty state that explains what belongs
    here, so that a new installation does not look broken.
24. As an administrator, I want a distinct empty state when my filters match nothing, so
    that I do not think my data is gone.
25. As an administrator, I want error states that look like a condition with a way
    forward, so that a failure does not feel like a crash.
26. As an administrator, I want a designed not-found page, so that a wrong URL still
    feels like part of the product.
27. As an administrator, I want a login screen that looks considered, so that my first
    impression of the portal is a good one.
28. As an administrator, I want the dashboard's headline figures to dominate visually, so
    that I get the summary without reading.
29. As an administrator, I want status breakdowns shown proportionally, so that I can see
    the distribution rather than compare numbers.
30. As an administrator, I want per-currency values grouped and clearly labelled, so that
    I never misread one currency's total as another's.
31. As an administrator, I want dashboard figures to animate into place on load, so that
    the screen feels alive.
32. As an administrator, I want consistent iconography throughout, so that the interface
    does not look like it was assembled from several sources.
33. As an administrator, I want icons paired with text rather than used alone for
    important actions, so that I am never guessing what a button does.
34. As an administrator using a phone, I want type and spacing adapted to the screen, so
    that the portal is comfortable rather than merely functional.
35. As an administrator using a phone, I want tap targets large enough to hit reliably,
    so that I do not mis-tap a destructive action.
36. As an administrator, I want notifications styled consistently with the rest of the
    portal, so that feedback does not look like it came from a library.
37. As a developer, I want every colour, size and spacing value to come from a token, so
    that a design change is made in one place.
38. As a developer, I want Element Plus themed through the same tokens as Tailwind, so
    that library components and utility classes cannot disagree.
39. As a developer, I want documented tokens and usage rules, so that a new screen is
    consistent by default rather than by review.

## Implementation Decisions

### The two halves

**Foundation (blocks every feature PRD).** The token layer, the typeface, the Element
Plus theme bridge, the dark counterpart of every token, the focus-ring treatment and
the motion primitives. This must land before the first screen is built. It is the same
work that PRD-002 references as its theme slice, and it is owned here.

**Polish (depends on every feature PRD).** Applying, auditing and refining across the
finished screens: empty states, motion, the dashboard's visual design, iconography and
the responsive pass. This cannot happen earlier because there is nothing to polish.

### Tokens

Semantic rather than literal. Components reference `surface`, `surface-raised`,
`border-subtle`, `text-primary`, `text-muted`, `accent`, `danger` — never a colour
name or a hex value. A literal palette exists beneath the semantic layer, but no
component reaches past the semantic names. This is what makes dark mode a redefinition
of the semantic layer rather than an audit of every component.

Every semantic token has a light and a dark value. A token without a dark counterpart
is a bug, because it will be the one element that stays wrong in dark mode.

Scales are constrained deliberately: a fixed type scale, a spacing scale on a
consistent rhythm, three radii, three elevations. Constraint is what produces
consistency — an open set of values reproduces the problem the tokens were meant to
solve.

### Colour

A neutral ramp with enough steps to build hierarchy without borders, one accent used
exclusively for primary actions and active states, and four semantic colours.

Two rules govern the palette:

- **Contrast is verified, not assumed.** Body text and interactive elements meet the
  AA ratio against their own surface in both themes. This is checked with a tool, and
  the results are what decide the ramp — not what looks acceptable on the author's
  monitor.
- **Status is never encoded by colour alone.** Every status carries a label, and
  shape or weight differs alongside the colour. The four ticket statuses and four
  event statuses must remain distinguishable in greyscale.

Dark mode is a designed palette, not a programmatic inversion. Surfaces lighten with
elevation rather than darken; borders become lower-contrast; shadows are replaced by
surface separation, because a shadow on a dark background does almost nothing.

### Typography

A chosen typeface with a variable weight range, self-hosted and preloaded so there is
no flash of unstyled text and no third-party request at runtime. A tabular-figure
variant for numeric columns, so prices and quantities align down a column — a small
detail with an outsized effect on how a data table reads.

A fixed scale with defined weights and line heights per step. Screen-level headings,
section headings, labels, body and captions are each a named step, not an ad-hoc size.

### Motion

Two durations and two easing curves, as tokens. Transitions are applied to a short
list of meaningful moments: route changes, list item enter and leave, dialog and
drawer entry, skeleton-to-content, notification entry, and dashboard figures counting
in on first load.

Every animation is wrapped by the reduced-motion preference. This is a hard rule, not
a refinement — unconditional motion is an accessibility defect.

Nothing animates for longer than the interaction it accompanies, and no animation
blocks input.

### Layout and density

The shell's content area uses a constrained maximum width with consistent gutters, so
the portal does not stretch uncomfortably on a wide monitor. Tables get a row height
chosen for scanning, with zebra striping or row hover — not both. Forms use a single
column with grouped fieldsets rather than a dense grid, because scanning down one
column is faster than reading across two.

Cards are used where a card is meaningful — a dashboard statistic, a mobile list item —
and not as a default container for every section.

### Empty, loading and error states

Each gets a designed treatment: a simple line illustration built from the token
palette so it themes automatically, a sentence of explanation, and the action that
resolves it. The three empty variants — nothing exists, nothing matched, something
failed — are visually distinct, because conflating them is what makes an administrator
believe their data was deleted.

Skeletons mirror the shape of the content they replace, including column widths, so
the layout does not shift when real content arrives.

### Dashboard presentation

Headline figures at the largest type step with a muted label and, where useful, a
supporting secondary figure. Breakdowns rendered as proportional bars built from
tokens — no charting dependency is added unless a genuine chart earns its place, and
if one is added it must theme correctly in both modes.

Per-currency values are grouped into one clearly labelled block so that two currencies
can never be misread as one total.

### Iconography

One icon set, used through the existing type-safe icon component and its generated
union. Icons accompany text for important actions and stand alone only where the
meaning is unambiguous and the control has an accessible label.

### Documentation

A short design-system reference: the tokens and what each means, the type scale, the
spacing rhythm, the motion rules, the status colour mapping, and the rules for adding
a new screen. It is what keeps the system intact after this PRD closes, and PRD-009
links to it.

### Testing boundary

- Token completeness — unit tested: every semantic token has a value in both themes.
- Contrast ratios — verified with a tool as part of the foundation slice, with the
  results recorded.
- Reduced-motion — component tested: animations are suppressed when the preference is
  set.
- Empty, loading and error states — component tested for each of the three empty
  variants and the error variant.
- Focus visibility — covered by the accessible-query discipline in the PRD-008 suite,
  with an explicit test that the focus ring is present on interactive elements.
- Dark mode — integration tested: toggling the theme updates the document and
  persists, and no screen renders a hardcoded colour.

## API Contract Plan

None. This PRD introduces no endpoint, parameter or schema component.

## Out of Scope

- A full brand identity: logo design, brand guidelines, marketing surfaces.
- A component library or Storybook — noted as out of scope in PRD-009 as well.
- Custom illustration beyond simple token-built line art for empty states.
- Theming beyond light and dark: no per-tenant palettes, no user-selected accent.
- A charting library, unless a specific chart earns it during the dashboard slice.
- Animation beyond the defined moments. No decorative or ambient motion.
- Print stylesheets.
- Right-to-left layout support.

## Further Notes

The split between foundation and polish is the decision that makes this PRD work.
Every argument for doing visual design "at the end" collapses on contact with a
hardcoded colour in the twentieth component. The foundation slice is small and it must
be first; the polish slices are where the interface actually comes alive, and they are
genuinely last.

The strongest signal of care in an admin interface is not the palette — it is the
states nobody demos. An empty list, a failed load, a filtered result with no matches,
a focused control, a deleted row. These are what a reviewer looks for when they want
to know whether the work was finished or abandoned at the happy path, and they are
cheap to do well once the tokens exist.

Tabular figures in numeric columns, a constrained content width, and choosing between
zebra striping and row hover rather than using both are each individually trivial.
Collectively they are most of the difference between a table that looks designed and
one that looks generated, which is why they are specified rather than left to taste.

The reduced-motion rule is stated as non-negotiable deliberately. Motion is the main
lever this PRD has for making the portal feel alive, which makes it exactly the place
where an accessibility preference is most likely to be forgotten.
