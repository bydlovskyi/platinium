export interface ICsvColumn<T> {
  header: string
  value: (record: T) => string | number
}

const MINOR_UNITS_PER_MAJOR = 100
const DECIMAL_PLACES = 2

export function formatMoneyMinorUnits (minorUnits: number): string {
  return (minorUnits / MINOR_UNITS_PER_MAJOR).toFixed(DECIMAL_PLACES)
}

// Spreadsheets evaluate fields starting with these as formulas (CSV injection); the OWASP list includes tab and CR.
const FORMULA_TRIGGER_CHARACTERS = ['=', '+', '-', '@', '\t', '\r']

// Apostrophe prefix is the standard force-text convention; numbers stay bare so they remain summable.
function neutraliseFormulaInjection (value: string | number): string {
  if (typeof value === 'number') {
    return String(value)
  }

  return FORMULA_TRIGGER_CHARACTERS.includes(value.charAt(0)) ? `'${value}` : value
}

export function escapeCsvField (value: string | number): string {
  const text = neutraliseFormulaInjection(value)

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export function serialiseCsv<T> (records: T[], columns: ICsvColumn<T>[]): string {
  const headerRow = columns.map(column => escapeCsvField(column.header)).join(',')
  const dataRows = records.map(record => columns.map(column => escapeCsvField(column.value(record))).join(','))

  return [headerRow, ...dataRows].join('\r\n')
}

export function csvContentDisposition (entity: string): string {
  const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length)

  return `attachment; filename="${entity}-${today}.csv"`
}
