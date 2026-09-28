import { csvContentDisposition, escapeCsvField, formatMoneyMinorUnits, serialiseCsv, type ICsvColumn } from './csv'

describe('csv serialisation', () => {
  describe('escapeCsvField', () => {
    it('leaves a plain field unescaped', () => {
      expect(escapeCsvField('Plain Value')).toBe('Plain Value')
    })

    it('wraps a field containing a comma in double quotes', () => {
      expect(escapeCsvField('Smith, John')).toBe('"Smith, John"')
    })

    it('wraps a field containing a double quote in double quotes and doubles the internal quote', () => {
      expect(escapeCsvField('12" Vinyl')).toBe('"12"" Vinyl"')
    })

    it('wraps a field containing a newline in double quotes', () => {
      expect(escapeCsvField('Line one\nLine two')).toBe('"Line one\nLine two"')
    })

    it('wraps a field containing a carriage return in double quotes', () => {
      expect(escapeCsvField('Line one\rLine two')).toBe('"Line one\rLine two"')
    })

    it('wraps a field containing both a comma and a double quote, doubling only the quotes', () => {
      expect(escapeCsvField('Say "hi", please')).toBe('"Say ""hi"", please"')
    })

    it('stringifies a number without quoting it', () => {
      expect(escapeCsvField(42)).toBe('42')
    })

    it.each(['=', '+', '-', '@', '\t', '\r'])(
      'neutralises a spreadsheet-formula injection starting with %s by prefixing an apostrophe',
      (trigger) => {
        expect(escapeCsvField(`${trigger}cmd|'/c calc'!A1`)).toContain(`'${trigger}cmd`)
      }
    )

    it('neutralises a DDE-style formula field, keeping the apostrophe inside the RFC-4180 quoting', () => {
      // Also contains a comma, so it's quoted, with the apostrophe inside the quotes.
      expect(escapeCsvField('=1+2,3')).toBe('"\'=1+2,3"')
    })

    it('leaves a value starting with a letter untouched', () => {
      expect(escapeCsvField('General Admission')).toBe('General Admission')
    })

    it('leaves a value starting with a digit untouched', () => {
      expect(escapeCsvField('2026 Season Pass')).toBe('2026 Season Pass')
    })

    it('leaves a numeric value untouched even when negative (no apostrophe on a real number)', () => {
      expect(escapeCsvField(-15)).toBe('-15')
    })
  })

  describe('formatMoneyMinorUnits', () => {
    it('formats an integer amount in minor units as a decimal with two places', () => {
      expect(formatMoneyMinorUnits(1250)).toBe('12.50')
    })

    it('formats a zero amount as 0.00', () => {
      expect(formatMoneyMinorUnits(0)).toBe('0.00')
    })

    it('formats an amount under one major unit with a leading zero', () => {
      expect(formatMoneyMinorUnits(5)).toBe('0.05')
    })

    it('formats a large amount without a thousands separator', () => {
      expect(formatMoneyMinorUnits(123456)).toBe('1234.56')
    })
  })

  describe('serialiseCsv', () => {
    interface IRecord {
      name: string
      priceMinorUnits: number
      currency: string
      createdAt: string
    }

    const columns: ICsvColumn<IRecord>[] = [
      { header: 'Name', value: record => record.name },
      { header: 'Price', value: record => formatMoneyMinorUnits(record.priceMinorUnits) },
      { header: 'Currency', value: record => record.currency },
      { header: 'Created At', value: record => record.createdAt }
    ]

    it('produces a header row plus one row per record, CRLF-joined', () => {
      const records: IRecord[] = [
        { name: 'Standard', priceMinorUnits: 1000, currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z' },
        { name: 'Premium', priceMinorUnits: 2500, currency: 'EUR', createdAt: '2026-02-01T00:00:00.000Z' }
      ]

      const csv = serialiseCsv(records, columns)

      expect(csv).toBe(
        'Name,Price,Currency,Created At\r\n' +
        'Standard,10.00,USD,2026-01-01T00:00:00.000Z\r\n' +
        'Premium,25.00,EUR,2026-02-01T00:00:00.000Z'
      )
    })

    it('formats money as a decimal with currency kept in its own separate column', () => {
      const records: IRecord[] = [
        { name: 'Standard', priceMinorUnits: 1234, currency: 'GBP', createdAt: '2026-01-01T00:00:00.000Z' }
      ]

      const rows = serialiseCsv(records, columns).split('\r\n')

      expect(rows[1]).toBe('Standard,12.34,GBP,2026-01-01T00:00:00.000Z')
    })

    it('formats dates as ISO-8601 strings', () => {
      const records: IRecord[] = [
        { name: 'Standard', priceMinorUnits: 100, currency: 'USD', createdAt: '2026-03-15T10:30:00.000Z' }
      ]

      const rows = serialiseCsv(records, columns).split('\r\n')

      expect(rows[1]).toContain('2026-03-15T10:30:00.000Z')
    })

    it('escapes a field containing a comma within a full row', () => {
      const records: IRecord[] = [
        { name: 'Standard, Weekend', priceMinorUnits: 100, currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z' }
      ]

      const rows = serialiseCsv(records, columns).split('\r\n')

      expect(rows[1]).toBe('"Standard, Weekend",1.00,USD,2026-01-01T00:00:00.000Z')
    })

    it('escapes a field containing a double quote within a full row', () => {
      const records: IRecord[] = [
        { name: '12" Vinyl', priceMinorUnits: 100, currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z' }
      ]

      const rows = serialiseCsv(records, columns).split('\r\n')

      expect(rows[1]).toBe('"12"" Vinyl",1.00,USD,2026-01-01T00:00:00.000Z')
    })

    it('escapes a field containing a newline within a full row', () => {
      const records: IRecord[] = [
        { name: 'Line one\nLine two', priceMinorUnits: 100, currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z' }
      ]

      const rows = serialiseCsv(records, columns).split('\r\n')

      expect(rows[1]).toBe('"Line one\nLine two",1.00,USD,2026-01-01T00:00:00.000Z')
    })

    it('produces just the header row for an empty result set, with no crash', () => {
      const csv = serialiseCsv([], columns)

      expect(csv).toBe('Name,Price,Currency,Created At')
    })
  })

  describe('csvContentDisposition', () => {
    it('names the download after the entity and the current date', () => {
      const today = new Date().toISOString().slice(0, 10)

      expect(csvContentDisposition('events')).toBe(`attachment; filename="events-${today}.csv"`)
    })
  })
})
