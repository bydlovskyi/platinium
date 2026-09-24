/**
 * Shared CSV serialisation for the list endpoints' `format=csv` export
 * (`GET /events`, `GET /categories`, `GET /tickets` — PRD-007). The mock
 * serialises the FULL filtered and sorted result here, from the same query the
 * JSON list used, so the file and the screen can never disagree.
 *
 * Formatting rules (PRD-007 "CSV export"):
 * - money is a decimal with its currency in a separate column, so a
 *   spreadsheet can sum it;
 * - dates are ISO-8601 for unambiguous parsing;
 * - references appear by name, not raw id;
 * - fields are escaped RFC-4180 style — a value containing a comma, a quote or
 *   a newline is wrapped in double quotes and its own quotes doubled.
 *
 * Pure and framework-free (no MSW, no Vue) so it is unit-testable in isolation.
 */

/** One CSV column: a header label and a function pulling its raw value out of a record. */
export interface ICsvColumn<T> {
  header: string
  value: (record: T) => string | number
}

const MINOR_UNITS_PER_MAJOR = 100
const DECIMAL_PLACES = 2

/**
 * Formats an integer amount in minor units (e.g. cents) as a decimal string
 * with two places (e.g. `1250` → `"12.50"`). The currency is emitted as its
 * own separate column, never concatenated into this value, so the number stays
 * spreadsheet-summable.
 */
export function formatMoneyMinorUnits (minorUnits: number): string {
  return (minorUnits / MINOR_UNITS_PER_MAJOR).toFixed(DECIMAL_PLACES)
}

/**
 * The leading characters a spreadsheet (Excel/Sheets/LibreOffice) treats as the
 * start of a formula. A field beginning with one of these is evaluated on open —
 * a CSV-injection / DDE-exfiltration vector (e.g. `=cmd|'/c calc'!A1`). This is
 * a property of how CSVs are *consumed*, not of any one column, so it is
 * neutralised generically for every field, free-text or not.
 */
const FORMULA_TRIGGER_CHARACTERS = ['=', '+', '-', '@']

/**
 * Neutralises spreadsheet-formula injection: a value that begins with a formula
 * trigger (`=`, `+`, `-`, `@`) is prefixed with a single apostrophe — the
 * standard "force text, don't evaluate" convention — so the exported CSV cannot
 * execute a formula when opened. Applied before RFC-4180 escaping, and only to
 * string values (a numeric column stays a bare, summable number).
 */
function neutraliseFormulaInjection (value: string | number): string {
  if (typeof value === 'number') {
    return String(value)
  }

  return FORMULA_TRIGGER_CHARACTERS.includes(value.charAt(0)) ? `'${value}` : value
}

/**
 * Escapes a single CSV field RFC-4180 style: a field containing a comma, a
 * double quote, a carriage return or a line feed is wrapped in double quotes,
 * with any embedded double quotes doubled. Everything else is emitted as-is.
 * Before that, any value starting with a spreadsheet-formula trigger is
 * neutralised (see {@link neutraliseFormulaInjection}).
 */
export function escapeCsvField (value: string | number): string {
  const text = neutraliseFormulaInjection(value)

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

/**
 * Serialises `records` to a CSV document: a header row from the column labels
 * followed by one row per record, every field escaped. Rows are joined with
 * CRLF per RFC-4180. An empty `records` array yields just the header row, so a
 * filtered export that matches nothing is still a valid, openable file.
 */
export function serialiseCsv<T> (records: T[], columns: ICsvColumn<T>[]): string {
  const headerRow = columns.map(column => escapeCsvField(column.header)).join(',')
  const dataRows = records.map(record => columns.map(column => escapeCsvField(column.value(record))).join(','))

  return [headerRow, ...dataRows].join('\r\n')
}

/**
 * Builds the `Content-Disposition` value naming a download after the entity and
 * the current date (e.g. `attachment; filename="tickets-2026-09-23.csv"`), so
 * an administrator can find the file later (PRD-007).
 */
export function csvContentDisposition (entity: string): string {
  const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length)

  return `attachment; filename="${entity}-${today}.csv"`
}
