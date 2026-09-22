import { createSeededRandom, createSeededId } from './random'

describe('createSeededRandom', () => {
  it('produces the same sequence of floats for the same seed', () => {
    const a = createSeededRandom(42)
    const b = createSeededRandom(42)

    const sequenceA = Array.from({ length: 10 }, () => a())
    const sequenceB = Array.from({ length: 10 }, () => b())

    expect(sequenceA).toEqual(sequenceB)
  })

  it('produces a different sequence for a different seed', () => {
    const a = createSeededRandom(1)
    const b = createSeededRandom(2)

    const sequenceA = Array.from({ length: 10 }, () => a())
    const sequenceB = Array.from({ length: 10 }, () => b())

    expect(sequenceA).not.toEqual(sequenceB)
  })

  it('always returns a float in [0, 1)', () => {
    const random = createSeededRandom(7)

    for (let i = 0; i < 1000; i++) {
      const value = random()

      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('createSeededId', () => {
  it('produces a UUID-shaped string', () => {
    const random = createSeededRandom(1)
    const id = createSeededId(random)

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('produces distinct ids across successive calls from the same generator', () => {
    const random = createSeededRandom(1)
    const ids = Array.from({ length: 200 }, () => createSeededId(random))

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is deterministic for a given seed', () => {
    const idsA = Array.from({ length: 20 }, () => createSeededId(createSeededRandom(99)))

    // Re-seed and regenerate: each call above shares one generator internally,
    // so recreate the same sequence from a fresh generator and compare directly.
    const random = createSeededRandom(99)
    const idsB = Array.from({ length: 20 }, () => createSeededId(random))

    expect(idsA[0]).toBe(idsB[0])
  })
})
