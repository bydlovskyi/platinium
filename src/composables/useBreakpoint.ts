// Mirrors Tailwind's `md` / `xl` screens.
const BREAKPOINTS = {
  tablet: 768,
  desktop: 1280
} as const

export function useBreakpoint () {
  const query = useBreakpoints(BREAKPOINTS)

  const isDesktop = query.greaterOrEqual('desktop')
  const isTablet = computed(() => query.between('tablet', 'desktop').value)
  // Mobile is "not tablet" rather than its own query, so tiers never overlap or gap.
  const isMobile = computed(() => !query.greaterOrEqual('tablet').value)

  return {
    isMobile,
    isTablet,
    isDesktop
  }
}
