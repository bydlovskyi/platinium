/**
 * Descriptor contract for `AppDataTable` (GitHub issue #23, PRD-003 "Data
 * table component (deep module)"). Entity screens declare columns as plain
 * data — field key, label, sortability, alignment, responsive priority and
 * an optional custom cell slot name — and the component renders both the
 * table and mobile-card presentations from that one descriptor set. Nothing
 * here knows about any entity; `TRow` is supplied by the caller.
 */

/** Where a cell's content sits inside its column. */
export type TDataTableAlign = 'left' | 'center' | 'right'

/**
 * How eagerly a column survives the switch to the stacked mobile-card
 * presentation below the tablet breakpoint. `high` columns render on every
 * card; `low` columns are table-only.
 */
export type TDataTableResponsivePriority = 'high' | 'low'

/** Three-state sort direction a sortable header cycles through. */
export type TDataTableSortOrder = 'asc' | 'desc'

/** Currently active sort, or `undefined` when the list is unsorted. */
export interface IDataTableSort {
  field: string
  order: TDataTableSortOrder
}

/** One column's shape — the whole vocabulary an entity screen configures. */
export interface IDataTableColumn<TRow> {
  /** Stable identity for the column, also used as the sort field name. */
  key: Extract<keyof TRow, string>
  label: string
  sortable?: boolean
  align?: TDataTableAlign
  /** Card visibility below the tablet breakpoint. Defaults to `'low'`. */
  responsivePriority?: TDataTableResponsivePriority
  /**
   * Named slot (`cell-<key>`) the caller can fill for custom rendering.
   * When omitted, the component reads `row[key]` and renders it as text.
   */
  cellSlot?: string
}

/** One row action — e.g. edit/delete — rendered per row. */
export interface IDataTableRowAction<TRow> {
  key: string
  label: string
  icon?: TIcons
  danger?: boolean
  disabled?: (row: TRow) => boolean
}

/**
 * Why the list is empty, supplied by the caller since the table itself has
 * no knowledge of filters — it only knows whether rows are missing.
 * `'none'` means rows are present and no empty state should render.
 */
export type TDataTableEmptyReason = 'none' | 'no-data' | 'no-matches'
