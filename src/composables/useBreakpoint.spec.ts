import { setViewportToBreakpoint } from '../../tests/support'

/**
 * `useBreakpoint` unit tests — the single source of the shell's responsive
 * tier (PRD-002 "Responsive strategy"), backed by VueUse's `useBreakpoints`
 * rather than an ad-hoc `window.innerWidth` listener. Driven through
 * `setViewportToBreakpoint` (`tests/support/viewport.ts`) and the
 * `matchMedia` polyfill (`tests/support/match-media.ts`) jsdom itself
 * doesn't provide.
 */
describe('useBreakpoint', () => {
  it('reports desktop at a desktop viewport', () => {
    setViewportToBreakpoint('desktop')

    const { isMobile, isTablet, isDesktop } = useBreakpoint()

    expect(isDesktop.value).toBe(true)
    expect(isTablet.value).toBe(false)
    expect(isMobile.value).toBe(false)
  })

  it('reports tablet at a tablet viewport', () => {
    setViewportToBreakpoint('tablet')

    const { isMobile, isTablet, isDesktop } = useBreakpoint()

    expect(isDesktop.value).toBe(false)
    expect(isTablet.value).toBe(true)
    expect(isMobile.value).toBe(false)
  })

  it('reports mobile at a mobile viewport', () => {
    setViewportToBreakpoint('mobile')

    const { isMobile, isTablet, isDesktop } = useBreakpoint()

    expect(isDesktop.value).toBe(false)
    expect(isTablet.value).toBe(false)
    expect(isMobile.value).toBe(true)
  })
})
