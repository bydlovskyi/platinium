export type TBreakpoint = 'mobile' | 'tablet' | 'desktop'

const BREAKPOINT_DIMENSIONS: Record<TBreakpoint, { width: number; height: number }> = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
}

/** Resizes the jsdom window to a named breakpoint for responsive assertions. */
export function setViewportToBreakpoint (breakpoint: TBreakpoint) {
  const { width, height } = BREAKPOINT_DIMENSIONS[breakpoint]

  window.innerWidth = width
  window.innerHeight = height
  window.dispatchEvent(new Event('resize'))
}
