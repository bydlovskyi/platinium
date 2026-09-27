const SEEDED_FIXTURE_CODES = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'IE', 'PL', 'SE', 'CA']

describe('countries', () => {
  describe('getCountryName', () => {
    it.each(SEEDED_FIXTURE_CODES)('resolves the seeded fixture code %s to a readable name, not the raw code', (code) => {
      const name = countries.getCountryName(code)

      expect(name).not.toBe(code)
      expect(name.length).toBeGreaterThan(0)
    })

    it('resolves a known code case-insensitively', () => {
      expect(countries.getCountryName('us')).toBe(countries.getCountryName('US'))
    })

    it('falls back to the raw code for an unknown code rather than throwing or rendering blank', () => {
      expect(countries.getCountryName('ZZ')).toBe('ZZ')
    })
  })

  describe('options', () => {
    it('includes every seeded fixture code', () => {
      const values = countries.options.map(option => option.value)

      for (const code of SEEDED_FIXTURE_CODES) {
        expect(values).toContain(code)
      }
    })

    it('is sorted alphabetically by label', () => {
      const labels = countries.options.map(option => option.label)

      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
    })
  })
})
