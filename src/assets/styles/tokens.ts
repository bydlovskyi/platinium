/**
 * Semantic design-token manifest — the single source of truth for every
 * light/dark token value in the app.
 *
 * `src/assets/styles/tokens.css` is generated from this manifest by the
 * `TokensCssGenerator` Vite plugin (`.config/tokens-css-generator`), so the
 * literal hex values below are declared exactly once. Never hand-edit
 * `tokens.css` — edit this file and let the plugin regenerate it.
 *
 * Components must never reference a literal hex value. They consume the
 * generated CSS custom properties (`var(--surface)`, `var(--accent)`, …) or
 * the Tailwind utilities derived from them in `theme.css`'s `@theme` block.
 *
 * Dark-mode selector convention: `:root[data-theme='dark']` (see tokens.css).
 *
 * Status-token mapping (recorded here, not built into UI until later slices):
 * - `status-published`  -> "Published" event/ticket state
 * - `status-draft`      -> "Draft" event/ticket state
 * - `status-cancelled`  -> "Cancelled" event/ticket state (shared with `danger`)
 * - `status-completed`  -> "Completed" event/ticket state
 * Status colours are identical across themes. Because only four hues carry
 * many possible statuses, greyscale/colour-blind distinguishability must be
 * reinforced at the point of use (label text + differing weight/shape), not
 * by colour alone — that pairing is implemented in later UI slices.
 */

export interface ITokenValue {
  light: string
  dark: string
}

export type TSemanticToken =
  | 'surface' |
  'surface-raised' |
  'border' |
  'border-subtle' |
  'text-primary' |
  'text-muted' |
  'accent' |
  'accent-hover' |
  'danger' |
  'success' |
  'warning' |
  'info' |
  'status-published' |
  'status-draft' |
  'status-cancelled' |
  'status-completed'

export const semanticTokens: Record<TSemanticToken, ITokenValue> = {
  surface: { light: '#FAFAF9', dark: '#0C0A09' },
  'surface-raised': { light: '#F5F5F4', dark: '#1C1917' },
  border: { light: '#E7E5E4', dark: '#44403C' },
  'border-subtle': { light: '#A8A29E', dark: '#57534E' },
  'text-primary': { light: '#1C1917', dark: '#FAFAF9' },
  // text-muted light darkened from the neutral-palette #78716C to #57534E to
  // clear the 4.5:1 AA threshold against `surface-raised` (see tokens.spec.ts).
  'text-muted': { light: '#57534E', dark: '#A8A29E' },
  accent: { light: '#4F46E5', dark: '#818CF8' },
  'accent-hover': { light: '#6366F1', dark: '#A5B4FC' },
  // Dark variant lightened from the light-mode #DC2626 so it keeps 4.5:1
  // against both dark surfaces (see tokens.spec.ts).
  danger: { light: '#DC2626', dark: '#EF4444' },
  // Notification-service semantic tokens (issue #16). Same light/dark
  // darken-for-light / lighten-for-dark pairing as `danger` above, each
  // hue picked and verified to clear 4.5:1 against both `surface` and
  // `surface-raised` in both themes (see tokens.spec.ts).
  success: { light: '#15803D', dark: '#4ADE80' },
  warning: { light: '#B45309', dark: '#FBBF24' },
  info: { light: '#4338CA', dark: '#93C5FD' },
  // Status colours: identical in both themes (already saturated enough to
  // read on both light and dark surfaces per the design decision).
  'status-published': { light: '#16A34A', dark: '#16A34A' },
  'status-draft': { light: '#D97706', dark: '#D97706' },
  'status-cancelled': { light: '#DC2626', dark: '#DC2626' },
  'status-completed': { light: '#0891B2', dark: '#0891B2' }
}
