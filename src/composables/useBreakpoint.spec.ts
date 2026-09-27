import { setViewportToBreakpoint } from '../../tests/support'

describe('useBreakpoint', () => {
  it('reports desktop at a desktop viewport', () => {
    setViewportToBreakpoint('desktop')

    const { isMobile, isTablet, isDesktop, isCompact } = useBreakpoint()

    expect(isDesktop.value).toBe(true)
    expect(isTablet.value).toBe(false)
    expect(isMobile.value).toBe(false)
    expect(isCompact.value).toBe(false)
  })

  it('reports a laptop as tablet tier but not compact', () => {
    setViewportToBreakpoint('laptop')

    const { isMobile, isTablet, isCompact } = useBreakpoint()

    expect(isTablet.value).toBe(true)
    expect(isMobile.value).toBe(false)
    expect(isCompact.value).toBe(false)
  })

  it('reports tablet at a tablet viewport', () => {
    setViewportToBreakpoint('tablet')

    const { isMobile, isTablet, isDesktop, isCompact } = useBreakpoint()

    expect(isDesktop.value).toBe(false)
    expect(isTablet.value).toBe(true)
    expect(isMobile.value).toBe(false)
    expect(isCompact.value).toBe(true)
  })

  it('reports mobile at a mobile viewport', () => {
    setViewportToBreakpoint('mobile')

    const { isMobile, isTablet, isDesktop, isCompact } = useBreakpoint()

    expect(isDesktop.value).toBe(false)
    expect(isTablet.value).toBe(false)
    expect(isMobile.value).toBe(true)
    expect(isCompact.value).toBe(true)
  })
})
