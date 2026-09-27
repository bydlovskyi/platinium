export type TBreakpoint = 'mobile' | 'tablet' | 'laptop' | 'desktop'

const BREAKPOINT_DIMENSIONS: Record<TBreakpoint, { width: number; height: number }> = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 }
}

export function setViewportToBreakpoint (breakpoint: TBreakpoint) {
  const { width, height } = BREAKPOINT_DIMENSIONS[breakpoint]

  window.innerWidth = width
  window.innerHeight = height
  window.dispatchEvent(new Event('resize'))
}
