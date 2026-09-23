import { breakpoints } from '@/assets/styles/breakpoints'

/**
 * Single source of the app's current responsive tier, backed by VueUse's
 * `useBreakpoints` (a `matchMedia` wrapper) — no ad-hoc `window.innerWidth`
 * listener anywhere else in the shell (PRD-002 "Responsive strategy").
 *
 * Tablet and desktop are `min-width` queries off the shared `breakpoints`
 * tokens; mobile is simply "neither of those matched" rather than its own
 * query, so the three tiers can never overlap or leave a gap at the
 * boundary pixel.
 */
export function useBreakpoint () {
  const query = useBreakpoints({
    tablet: breakpoints.tablet,
    desktop: breakpoints.desktop
  })

  const isDesktop = query.greaterOrEqual('desktop')
  const isTablet = computed(() => query.between('tablet', 'desktop').value)
  const isMobile = computed(() => !query.greaterOrEqual('tablet').value)

  return {
    isMobile,
    isTablet,
    isDesktop
  }
}
