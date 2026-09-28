// Shared by StatusTag and the dashboard so a status never reads in a different colour.
export type TStatus = TEventStatus | TTicketStatus

export const EVENT_STATUSES: TEventStatus[] = ['draft', 'published', 'cancelled', 'completed']

export const TICKET_STATUSES: TTicketStatus[] = ['draft', 'on_sale', 'sold_out', 'archived']

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

export const STATUS_PRESENTATION_TYPE_COLOR: Record<TStatusPresentationType, string> = {
  success: 'var(--el-color-success)',
  warning: 'var(--el-color-warning)',
  danger: 'var(--el-color-danger)',
  info: 'var(--el-color-info)'
}
