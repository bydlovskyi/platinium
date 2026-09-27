export type TDataTableAlign = 'left' | 'center' | 'right'

/** `high` columns also render on mobile cards; `low` columns are table-only. */
export type TDataTableResponsivePriority = 'high' | 'low'

export type TDataTableSortOrder = 'asc' | 'desc'

export interface IDataTableSort {
  field: string
  order: TDataTableSortOrder
}

export interface IDataTableColumn<TRow> {
  /** Also used as the sort field name. */
  key: Extract<keyof TRow, string>
  label: string
  sortable?: boolean
  align?: TDataTableAlign
  /** Defaults to `'low'`. */
  responsivePriority?: TDataTableResponsivePriority
  /** Renders slot `cell-<cellSlot>`; otherwise `row[key]` as text. */
  cellSlot?: string
}

export interface IDataTableRowAction<TRow> {
  key: string
  label: string
  icon?: TIcons
  danger?: boolean
  disabled?: (row: TRow) => boolean
}

/** `'none'` means rows are present and no empty state renders. */
export type TDataTableEmptyReason = 'none' | 'no-data' | 'no-matches'
