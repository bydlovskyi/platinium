/**
 * Single source of truth for mapping an Event/Ticket lifecycle status to its
 * semantic presentation — the same four-token vocabulary (success/warning/
 * danger/info) `StatusTag.vue` renders as an `el-tag`. Factored out of
 * `StatusTag.vue` (GitHub issue #24, PRD-003) so a second consumer — the
 * dashboard's `el-progress` breakdowns (GitHub issue #38, PRD-007) — can
 * reuse the exact same mapping instead of re-deriving its own colour
 * assignment, which would risk a status reading differently there than
 * everywhere else in the portal.
 *
 * See `StatusTag.vue`'s own comment for the full rationale behind each
 * status's assigned token (the four-colour-token budget, the `draft`
 * overlap, `on_sale`/`archived`/`sold_out`'s analogues).
 */
export type TStatus = TEventStatus | TTicketStatus

export type TStatusPresentationType = 'success' | 'warning' | 'danger' | 'info'

export interface IStatusPresentation {
  label: string
  type: TStatusPresentationType
}

export const STATUS_PRESENTATION: Record<TStatus, IStatusPresentation> = {
  draft: { label: 'Draft', type: 'warning' },
  published: { label: 'Published', type: 'success' },
  cancelled: { label: 'Cancelled', type: 'danger' },
  completed: { label: 'Completed', type: 'info' },
  on_sale: { label: 'On sale', type: 'success' },
  sold_out: { label: 'Sold out', type: 'danger' },
  archived: { label: 'Archived', type: 'info' }
}

/**
 * The semantic type's underlying colour as an Element Plus CSS custom
 * property — the same `--el-color-success/warning/danger/info` variables
 * `theme.css`'s `--color-status-*` tokens ride, so an `el-progress` bar's
 * `:color` never drifts from `StatusTag`'s `el-tag` colouring for the same
 * status.
 */
export const STATUS_PRESENTATION_TYPE_COLOR: Record<TStatusPresentationType, string> = {
  success: 'var(--el-color-success)',
  warning: 'var(--el-color-warning)',
  danger: 'var(--el-color-danger)',
  info: 'var(--el-color-info)'
}
