// Reads a live duration token (e.g. `--duration-base`), which is `0s` under prefers-reduced-motion.
export function readDurationToken (name: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()

  if (raw.endsWith('ms')) {
    return Number.parseFloat(raw)
  }

  if (raw.endsWith('s')) {
    return Number.parseFloat(raw) * 1000
  }

  return fallbackMs
}
