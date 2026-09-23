/**
 * The three shared responsive breakpoints (PRD-002 "Responsive strategy"),
 * defined once here and consumed by `useBreakpoint` (`src/composables/`)
 * for the shell, and later by PRD-003's data table. No PRD/token doc
 * defines explicit pixel values, so these are the conventional Tailwind-ish
 * defaults: mobile below `tablet`, tablet between `tablet` and `desktop`,
 * desktop from `desktop` up.
 *
 * Not run through the `tokens.ts` -> `tokens.css` generator pipeline
 * (`.config/tokens-css-generator`) — that pipeline is specifically for
 * light/dark colour pairs consumed as CSS custom properties, and these are
 * single, theme-independent pixel values consumed from TypeScript via
 * VueUse's `useBreakpoints`, not from CSS.
 */
export const breakpoints = {
  tablet: 768,
  desktop: 1280
} as const
