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

const formatDate = (value: string | Date, locale = DEFAULT_LOCALE): string => {
  const date = typeof value === 'string' ? new Date(value) : value

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

const formatDateRange = (start: string | Date, end: string | Date, locale = DEFAULT_LOCALE): string => {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).formatRange(startDate, endDate)
}

export const filters = {
  formatCurrency,
  formatMoney,
  formatDate,
  formatDateRange,
  getCurrencyPrecision,
  getCurrencySymbol
}
