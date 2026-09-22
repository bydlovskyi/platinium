/**
 * WCAG 2.x contrast-ratio helpers (relative luminance + contrast ratio,
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance). Hand-written
 * instead of pulling in a dependency — the formula is small and stable.
 */

function srgbChannelToLinear (channel: number): number {
  const normalized = channel / 255

  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

function relativeLuminance (hex: string): number {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  )
}

/** Contrast ratio between two colors, per WCAG: (L1 + 0.05) / (L2 + 0.05). */
export function contrastRatio (hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA)
  const luminanceB = relativeLuminance(hexB)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)

  return (lighter + 0.05) / (darker + 0.05)
}
