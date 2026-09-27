export type TDataTableAlign = 'left' | 'center' | 'right'

/** Placement on the mobile card; every other column becomes a label/value field. */
export type TDataTableCardRole = 'title' | 'badge'

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
  /** Without a `'title'`, the first column is the card title. */
  cardRole?: TDataTableCardRole
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
