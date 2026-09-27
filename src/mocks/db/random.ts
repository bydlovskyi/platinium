export type TSeededRandom = () => number

// mulberry32: deterministic so seed fixtures are identical on every run.
export function createSeededRandom (seed: number): TSeededRandom {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6D2B79F5) >>> 0

    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEX_RADIX = 16
const BYTE_MASK = 0xff
const NIBBLE_MASK = 0x0f
const UUID_VARIANT_BITS = 0x80
const UUID_VARIANT_MASK = 0x3f
const UUID_VERSION_BITS = 0x40
const VERSION_BYTE_INDEX = 6
const VARIANT_BYTE_INDEX = 8

export function createSeededId (random: TSeededRandom): string {
  const bytes = Array.from({ length: 16 }, (_, index) => {
    const byte = Math.floor(random() * (BYTE_MASK + 1))

    if (index === VERSION_BYTE_INDEX) {
      return (byte & NIBBLE_MASK) | UUID_VERSION_BITS
    }

    if (index === VARIANT_BYTE_INDEX) {
      return (byte & UUID_VARIANT_MASK) | UUID_VARIANT_BITS
    }

    return byte
  })

  const hex = bytes.map(byte => byte.toString(HEX_RADIX).padStart(2, '0')).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-')
}
