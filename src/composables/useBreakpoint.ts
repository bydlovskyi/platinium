// Mirrors Tailwind's `md` / `lg` / `xl` screens.
const BREAKPOINTS = {
  tablet: 768,
  laptop: 1024,
  desktop: 1280
} as const

export function useBreakpoint () {
  const query = useBreakpoints(BREAKPOINTS)

  const isDesktop = query.greaterOrEqual('desktop')
  const isTablet = computed(() => query.between('tablet', 'desktop').value)
  // Mobile is "not tablet" rather than its own query, so tiers never overlap or gap.
  const isMobile = computed(() => !query.greaterOrEqual('tablet').value)
  // A full-width table needs a laptop; narrower screens get cards.
  const isCompact = computed(() => !query.greaterOrEqual('laptop').value)

  return {
    isMobile,
    isTablet,
    isDesktop,
    isCompact
  }
}
