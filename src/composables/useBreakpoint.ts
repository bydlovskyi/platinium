// Mirrors Tailwind's `md` / `lg` / `xl` screens.
const BREAKPOINTS = {
  tablet: 768,
  laptop: 1024,
  desktop: 1280
} as const

export function useBreakpoint () {
  const query = useBreakpoints(BREAKPOINTS)

  // Each media query is created once here; creating one inside a computed would register a new
  // listener on every re-evaluation.
  const atLeastTablet = query.greaterOrEqual('tablet')
  const atLeastLaptop = query.greaterOrEqual('laptop')
  const isDesktop = query.greaterOrEqual('desktop')

  // Mobile is "not tablet" rather than its own query, so tiers never overlap or gap.
  const isMobile = computed(() => !atLeastTablet.value)
  const isTablet = computed(() => atLeastTablet.value && !isDesktop.value)
  // A full-width table needs a laptop; narrower screens get cards.
  const isCompact = computed(() => !atLeastLaptop.value)

  return {
    isMobile,
    isTablet,
    isDesktop,
    isCompact
  }
}
