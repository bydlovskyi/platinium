describe('priceFilterToMinorUnits', () => {
  it('converts a whole amount to minor units', () => {
    expect(priceFilterToMinorUnits(50)).toBe(5000)
  })

  it('converts a decimal amount to minor units', () => {
    expect(priceFilterToMinorUnits(19.99)).toBe(1999)
  })

  it('converts zero to zero', () => {
    expect(priceFilterToMinorUnits(0)).toBe(0)
  })

  it('rounds away floating-point drift instead of truncating/propagating it', () => {
    // 19.99 * 100 === 1998.9999999999998; must round, not truncate.
    expect(priceFilterToMinorUnits(19.99)).toBe(1999)
    expect(priceFilterToMinorUnits(0.1)).toBe(10)
  })
})

describe('minorUnitsToPriceFilter', () => {
  it('converts minor units back to a whole amount', () => {
    expect(minorUnitsToPriceFilter(5000)).toBe(50)
  })

  it('converts minor units back to a decimal amount', () => {
    expect(minorUnitsToPriceFilter(1999)).toBe(19.99)
  })

  it('converts zero to zero', () => {
    expect(minorUnitsToPriceFilter(0)).toBe(0)
  })
})

describe('round-trip', () => {
  it('going in then out (and back in) reproduces the same minor-unit amount for a range of values', () => {
    for (const minorUnits of [0, 1, 10, 99, 100, 1999, 123456]) {
      const decimal = minorUnitsToPriceFilter(minorUnits)
      expect(priceFilterToMinorUnits(decimal)).toBe(minorUnits)
    }
  })
})
