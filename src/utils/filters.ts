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

/**
 * Decimal digit count for a currency's minor unit (e.g. `2` for USD's
 * cents), derived from `Intl.NumberFormat` rather than a hand-maintained
 * currency->precision map — the same technique `formatMoney` uses, factored
 * out so `CurrencyInput` (GitHub issue #32, the sole minor-unit conversion
 * boundary) can drive `el-input-number`'s `:precision` from it without
 * duplicating the derivation.
 */
const getCurrencyPrecision = (currency: TCurrency, locale = DEFAULT_LOCALE): number => {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })

  return formatter.resolvedOptions().maximumFractionDigits ?? DEFAULT_MINOR_UNIT_DIGITS
}

/**
 * Currency symbol (e.g. `$`, `€`, `£`) for display alongside an input,
 * picked out of `Intl.NumberFormat(...).formatToParts()` rather than a
 * hand-maintained currency->symbol map — consistent with
 * {@link getCurrencyPrecision} and `formatMoney`'s Intl-derived approach.
 */
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
  formatDateRange,
  getCurrencyPrecision,
  getCurrencySymbol
}
