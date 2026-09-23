/**
 * `filters` unit tests (GitHub issue #24, PRD-003 "Formatters and status
 * tag — unit tested, including a zero price, a large price and each
 * currency"). `formatMoney`, `formatDate` and `formatDateRange` are new in
 * this slice; the pre-existing, deprecated `formatCurrency` is left
 * untouched per the task boundary — no tests added or removed for it here.
 *
 * The app-facing `TCurrency` (`src/features/platform/api/dts/index.d.ts`,
 * generated from the OpenAPI `Currency` schema — the type `formatMoney`'s
 * signature actually uses) is `'USD' | 'EUR' | 'GBP'`, identical to the
 * mock DB's hand-written `TCurrency` in `src/mocks/db/types.ts`. No
 * discrepancy between the two, and no JPY in either — so no zero-decimal
 * currency case exists to exercise here.
 */
describe('filters', () => {
  describe('formatMoney', () => {
    it('formats a zero amount', () => {
      expect(filters.formatMoney(0, 'USD')).toBe('$0.00')
    })

    it('formats a large amount with grouping separators', () => {
      // 123,456,789 minor units -> $1,234,567.89
      expect(filters.formatMoney(123_456_789, 'USD')).toBe('$1,234,567.89')
    })

    it('formats USD with the correct symbol and decimal placement', () => {
      expect(filters.formatMoney(1050, 'USD')).toBe('$10.50')
    })

    it('formats EUR with the correct symbol and decimal placement', () => {
      expect(filters.formatMoney(1050, 'EUR')).toBe('€10.50')
    })

    it('formats GBP with the correct symbol and decimal placement', () => {
      expect(filters.formatMoney(1050, 'GBP')).toBe('£10.50')
    })

    it('derives the minor-unit divisor from the currency rather than hardcoding 100', () => {
      // Every supported currency (USD/EUR/GBP) has 2 fraction digits, so 1
      // minor unit is always a cent — this pins that formatMoney divides by
      // `10 ** maximumFractionDigits` rather than a hardcoded 100.
      expect(filters.formatMoney(1, 'USD')).toBe('$0.01')
    })
  })

  describe('formatDate', () => {
    it('renders a known date as a locale-aware medium-style string', () => {
      expect(filters.formatDate('2026-09-03T00:00:00.000Z')).toBe('Sep 3, 2026')
    })

    it('accepts a Date instance directly', () => {
      expect(filters.formatDate(new Date('2026-01-15T00:00:00.000Z'))).toBe('Jan 15, 2026')
    })
  })

  describe('formatDateRange', () => {
    it('renders a same-month range as one readable string', () => {
      const result = filters.formatDateRange('2026-09-03T00:00:00.000Z', '2026-09-10T00:00:00.000Z')

      expect(result).toContain('Sep')
      expect(result).toContain('3')
      expect(result).toContain('10')
      expect(result).toContain('2026')
      // One combined string, not two independently-formatted dates joined —
      // the month/year is not repeated for the range's start half.
      expect(result.match(/Sep/g)?.length).toBe(1)
    })

    it('renders a cross-month range as one readable string naming both months', () => {
      const result = filters.formatDateRange('2026-09-25T00:00:00.000Z', '2026-10-05T00:00:00.000Z')

      expect(result).toContain('Sep')
      expect(result).toContain('Oct')
      expect(result).toContain('2026')
    })

    it('renders a cross-year range as one readable string naming both years', () => {
      const result = filters.formatDateRange('2026-12-28T00:00:00.000Z', '2027-01-03T00:00:00.000Z')

      expect(result).toContain('2026')
      expect(result).toContain('2027')
    })
  })
})
