const DEFAULT_LOCALE = 'en-US'

/** @deprecated Takes a decimal amount; API money is integer minor units, use formatMoney. */
const formatCurrency = (value: number, currency = 'USD', locale = DEFAULT_LOCALE) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(value)
}

const DEFAULT_MINOR_UNIT_DIGITS = 2

const getCurrencyPrecision = (currency: TCurrency, locale = DEFAULT_LOCALE): number => {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })

  return formatter.resolvedOptions().maximumFractionDigits ?? DEFAULT_MINOR_UNIT_DIGITS
}

const getCurrencySymbol = (currency: TCurrency, locale = DEFAULT_LOCALE): string => {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const parts = formatter.formatToParts(0)

  return parts.find(part => part.type === 'currency')?.value ?? currency
}

const formatMoney = (amountMinorUnits: number, currency: TCurrency, locale = DEFAULT_LOCALE): string => {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const minorUnitDigits = getCurrencyPrecision(currency, locale)
  const amount = amountMinorUnits / (10 ** minorUnitDigits)

  return formatter.format(amount)
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

// `new Date('YYYY-MM-DD')` is UTC midnight, which is the previous day west of UTC; a calendar date has no timezone.
const toDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return value
  }

  const dateOnly = DATE_ONLY_PATTERN.exec(value)

  if (dateOnly) {
    const [, year, month, day] = dateOnly

    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return new Date(value)
}

const formatDate = (value: string | Date, locale = DEFAULT_LOCALE): string => {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(toDate(value))
}

const formatDateRange = (start: string | Date, end: string | Date, locale = DEFAULT_LOCALE): string => {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).formatRange(toDate(start), toDate(end))
}

export const filters = {
  formatCurrency,
  formatMoney,
  formatDate,
  formatDateRange,
  getCurrencyPrecision,
  getCurrencySymbol
}
