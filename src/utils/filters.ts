const DEFAULT_LOCALE = 'en-US'

/**
 * @deprecated Takes a decimal amount (e.g. `10.5` for $10.50). Every money
 * value in this portal's API contract is an integer in minor units (PRD-001)
 * — use {@link formatMoney} for those. Kept as-is (only pre-existing caller
 * is the scaffold `Home.vue` demo) rather than repurposed, so its signature
 * never silently changes under an existing call site.
 */
const formatCurrency = (value: number, currency = 'USD', locale = DEFAULT_LOCALE) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(value)
}

/**
 * Money formatter for the portal's minor-units contract (GitHub issue #24,
 * PRD-003 "Formatters" — "matching the integer-minor-units decision from
 * PRD-001"). `amountMinorUnits` is what the API returns (e.g. `1050` cents
 * for $10.50) — the caller never divides by 100 themselves.
 *
 * The minor-unit factor is not hardcoded as 100: `Intl.NumberFormat` already
 * knows each currency's fraction-digit count (JPY has 0, most currencies
 * have 2, a handful have 3), so the divisor is derived from
 * `resolvedOptions().maximumFractionDigits` and `style: 'currency'` renders
 * the symbol and grouping correctly from the resulting decimal amount.
 */
const DEFAULT_MINOR_UNIT_DIGITS = 2

const formatMoney = (amountMinorUnits: number, currency: TCurrency, locale = DEFAULT_LOCALE): string => {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const minorUnitDigits = formatter.resolvedOptions().maximumFractionDigits ?? DEFAULT_MINOR_UNIT_DIGITS
  const amount = amountMinorUnits / (10 ** minorUnitDigits)

  return formatter.format(amount)
}

/** Locale-aware date formatter for list/detail display — "Sep 3, 2026". */
const formatDate = (value: string | Date, locale = DEFAULT_LOCALE): string => {
  const date = typeof value === 'string' ? new Date(value) : value

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

/**
 * Date-range formatter rendering one readable string via
 * `Intl.DateTimeFormat.formatRange` — e.g. "Sep 3 – 10, 2026" when both
 * dates share a month/year, "Sep 3 – Oct 10, 2026" when they don't — rather
 * than naively concatenating two independently formatted dates with a
 * separator.
 */
const formatDateRange = (start: string | Date, end: string | Date, locale = DEFAULT_LOCALE): string => {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).formatRange(startDate, endDate)
}

export const filters = {
  formatCurrency,
  formatMoney,
  formatDate,
  formatDateRange
}
